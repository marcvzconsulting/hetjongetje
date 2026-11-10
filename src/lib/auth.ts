import crypto from "node:crypto";
import NextAuth from "next-auth";
import * as Sentry from "@sentry/nextjs";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit/api-rate-limit";
import { loadStarterCredits } from "@/lib/starter-credits";
import { sendMail } from "@/lib/email/client";
import { buildWelcomeMail } from "@/lib/email/templates/welcome";
import { buildAdminNewSignupMail } from "@/lib/email/templates/admin-new-signup";
import { buildAppUrl } from "@/lib/url";
import { consumeMagicLinkToken } from "@/lib/magic-link";
import { markEmailVerified } from "@/lib/auth/email-verification";
import { cookies } from "next/headers";
import { SIGNUP_SOURCE_COOKIE, signupSourceFields } from "@/lib/signup-source";

/**
 * Herkomst voor een nieuwe Google-gebruiker: de callback is een gewoon
 * route-request, dus de ov_src-cookie van de bezoeker is leesbaar. Daarna
 * wissen, net als bij het wachtwoordpad. Mag het inloggen nooit breken.
 */
async function readSignupSourceOnce() {
  try {
    const jar = await cookies();
    const fields = signupSourceFields(jar.get(SIGNUP_SOURCE_COOKIE)?.value);
    if (jar.has(SIGNUP_SOURCE_COOKIE)) jar.delete(SIGNUP_SOURCE_COOKIE);
    return fields;
  } catch {
    return {};
  }
}

// Constant-time decoy hash for the "user not found" path. Without this,
// an unknown email returns immediately while a known email triggers a
// ~100ms bcrypt compare — a timing side-channel that lets an attacker
// enumerate registered accounts. The decoy below is a real bcrypt hash
// of an unrelated string; we always compare against it on the miss path
// so both branches take roughly the same wall-clock time.
const DECOY_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8e4M.yRHaZ3.j8Ql7BjT8X7aYsMaDi";

import { getAdminNotifyEmails } from "@/lib/admin/notify";
import { isAdminPasswordLoginAllowed } from "@/lib/admin/password-login-allowlist";

/** Hoe vaak een lopende sessie opnieuw tegen de database wordt gecontroleerd
 *  (rol, blokkade, ingetrokken sessies). */
const SESSION_RECHECK_MS = 5 * 60 * 1000;

/** Send the welcome + admin notification mails for a brand-new account.
 *  Fire-and-forget — never blocks the auth flow. */
async function sendWelcomeMails(user: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}): Promise<void> {
  try {
    const profileUrl = await buildAppUrl("/profile/new");
    const welcome = await buildWelcomeMail({ name: user.name, profileUrl });
    await sendMail({
      to: user.email,
      toName: user.name,
      subject: welcome.subject,
      html: welcome.html,
      text: welcome.text,
      tags: ["welcome"],
    });
  } catch (err) {
    console.error("[auth] welcome mail failed", err);
  }
  try {
    const reviewUrl = await buildAppUrl(`/admin/users/${user.id}`);
    const adminMail = buildAdminNewSignupMail({
      userName: user.name,
      userEmail: user.email,
      createdAt: user.createdAt,
      reviewUrl,
    });
    for (const to of getAdminNotifyEmails()) {
      try {
        await sendMail({
          to,
          subject: adminMail.subject,
          html: adminMail.html,
          text: adminMail.text,
          tags: ["admin-new-signup"],
        });
      } catch (perAddressErr) {
        console.error(
          `[auth] admin notification to ${to} failed`,
          perAddressErr instanceof Error ? perAddressErr.message : perAddressErr,
        );
      }
    }
  } catch (err) {
    console.error("[auth] admin notification mail failed", err);
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // Auth.js vangt fouten in de inlogflow zelf af en stuurt de gebruiker
  // door naar de foutpagina. De oorzaak (bv. een Prisma-fout in de
  // jwt-callback, of een state/PKCE-cookie-mismatch bij Google) komt
  // standaard alleen in de console terecht, en Vercel bewaart die logs op
  // het Hobby-plan maar één uur. Daarom sturen we hem ook naar Sentry,
  // inclusief `cause`, zodat de oorzaak 90 dagen terug te vinden is.
  // (Aanleiding: Google-login van een klant mislukte op 16 okt 2026 met
  // de kale "Server error"-pagina en het spoor was de volgende dag weg.)
  logger: {
    error(error) {
      const cause = (error as { cause?: unknown }).cause;
      console.error(`[auth][error] ${error.name}: ${error.message}`, cause ?? "");
      Sentry.captureException(error, {
        tags: { source: "authjs", authErrorType: error.name },
      });
    },
  },
  providers: [
    // Google OAuth — picks up AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from env
    // automatically. allowDangerousEmailAccountLinking: Google heeft het
    // adres geverifieerd, maar het bestaande wachtwoordaccount niet. Daarom
    // vervangt de jwt-callback bij de eerste Google-login op een
    // ongeverifieerd account het wachtwoord (markEmailVerified).
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Brute-force defence: limit attempts per IP and per email address
        // BEFORE we hit the database or run bcrypt. A blocked attempt
        // returns null — same response as a wrong password — so the
        // attacker can't tell rate-limits from real failures.
        const rawIp =
          request?.headers.get("x-forwarded-for") ??
          request?.headers.get("x-real-ip") ??
          "unknown";
        const ip = rawIp.split(",")[0].trim() || "unknown";
        const email = (credentials.email as string).toLowerCase().trim();

        const ipLimit = await rateLimit({
          key: `login-attempt-ip:${ip}`,
          ...RATE_LIMITS.loginAttemptByIp,
        });
        if (!ipLimit.allowed) return null;
        const emailLimit = await rateLimit({
          key: `login-attempt-email:${email}`,
          ...RATE_LIMITS.loginAttemptByEmail,
        });
        if (!emailLimit.allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // Always run bcrypt to equalize timing between found/not-found
        // branches. Both paths spend ~100ms before returning null.
        const passwordToCheck = credentials.password as string;
        const hashToCheck = user?.passwordHash ?? DECOY_HASH;
        const passwordMatch = await bcrypt.compare(passwordToCheck, hashToCheck);

        if (!user || !passwordMatch) return null;

        // Admins are blocked from password login as a 2FA-style defence.
        // They must use Google OAuth or a magic-link instead — both
        // require live access to the admin's mailbox, so a leaked
        // password alone is no longer enough to take over an admin
        // account. Same null response as wrong-password to avoid
        // surfacing the role to a probing attacker.
        //
        // Exception: admins whose email is on the explicit env-based
        // allowlist may still use password login (e.g. the owner, to
        // avoid waiting on a slow magic-link mail). Future admins not on
        // the list keep the 2FA-style protection.
        if (user.role === "admin" && !isAdminPasswordLoginAllowed(email)) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    // Passwordless ("magic-link") sign-in. The token itself is generated
    // and emailed by `requestMagicLinkAction`; this provider just claims
    // the token and returns the matching user. Token validation is
    // atomic and single-use inside `consumeMagicLinkToken`.
    Credentials({
      id: "magic-link",
      name: "magic-link",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials) {
        const token = (credentials?.token as string | undefined) ?? "";
        if (!token) return null;
        const userId = await consumeMagicLinkToken(token);
        if (!userId) return null;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;

        // De link kwam via de mailbox binnen: dat bewijst het adres. Bij
        // een nog ongeverifieerd account vervalt het eerder gekozen
        // wachtwoord (zie lib/auth/email-verification.ts).
        await markEmailVerified(user);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            ...(user.role === "admin" && user.status !== "approved"
              ? { status: "approved" }
              : {}),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    // Eigen Nederlandse foutpagina i.p.v. de ingebouwde Engelse
    // "Server error"-pagina van Auth.js (src/app/(auth)/inlogfout).
    error: "/inlogfout",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // First sign-in fires this with `user` populated. On subsequent
      // requests within the same session, `user` is undefined and the
      // token already has id+role.
      if (!user) {
        // Lopende sessie: af en toe controleren of het account nog bestaat
        // en of de sessies niet zijn ingetrokken (wachtwoordreset, eerste
        // verificatie). De rol wordt meteen ververst, zodat ingetrokken
        // adminrechten niet tot het einde van de sessie blijven gelden.
        // Een geblokkeerd account blijft ingelogd: het dashboard toont dan
        // de melding. Tokens van vóór deze controle hebben geen `sv`; dat
        // telt als versie 0.
        const userId = typeof token.id === "string" ? token.id : null;
        if (!userId) return token;
        const now = Date.now();
        const checkedAt =
          typeof token.checkedAt === "number" ? token.checkedAt : 0;
        if (now - checkedAt < SESSION_RECHECK_MS) return token;
        const current = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, sessionVersion: true },
        });
        const tokenVersion = typeof token.sv === "number" ? token.sv : 0;
        if (!current || current.sessionVersion !== tokenVersion) {
          // null = Auth.js wist de sessiecookie.
          return null;
        }
        token.role = current.role;
        token.checkedAt = now;
        return token;
      }

      if (account?.provider === "google" && user.email) {
        // Find or create the DB user that matches this Google account.
        const email = user.email.toLowerCase();
        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          // First-time Google sign-up. We never see a password from Google,
          // so we set an unguessable random hash so the credentials path
          // can never authenticate this account by accident.
          const placeholderHash = await bcrypt.hash(
            crypto.randomBytes(32).toString("hex"),
            12,
          );
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              passwordHash: placeholderHash,
              // Direct approved — geen goedkeuringswachtrij meer (mirror
              // van het credentials-registratiepad).
              status: "approved",
              // Starter credits, identiek aan het credentials-
              // registratiepad zodat de welkomstervaring gelijk is.
              storyCredits: await loadStarterCredits(),
              lastLoginAt: new Date(),
              emailVerifiedAt: new Date(),
              // Onder de Google-knop staat de kennisgeving dat doorgaan
              // akkoord met de voorwaarden betekent (AuthTermsNotice) —
              // dit legt dat moment vast, net als bij credentials.
              termsAcceptedAt: new Date(),
              ...(await readSignupSourceOnce()),
            },
          });
          // Fire welcome + admin notification mails. Don't await — auth
          // flow shouldn't pause on SMTP.
          sendWelcomeMails({
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            createdAt: dbUser.createdAt,
          });
        } else {
          const verified = await markEmailVerified(dbUser);
          dbUser.sessionVersion = verified.sessionVersion;
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              lastLoginAt: new Date(),
              // Self-heal admin status (mirrors credentials provider).
              ...(dbUser.role === "admin" && dbUser.status !== "approved"
                ? { status: "approved" }
                : {}),
            },
          });
        }

        token.id = dbUser.id;
        token.role = dbUser.role;
        token.sv = dbUser.sessionVersion;
      } else {
        // Credentials path: authorize() already returned id+role.
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        const row = user.id
          ? await prisma.user.findUnique({
              where: { id: user.id },
              select: { sessionVersion: true },
            })
          : null;
        token.sv = row?.sessionVersion ?? 0;
      }
      token.checkedAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
});
