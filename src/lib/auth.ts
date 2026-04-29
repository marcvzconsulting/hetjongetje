import crypto from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit/api-rate-limit";
import { sendMail } from "@/lib/email/client";
import { buildWelcomeMail } from "@/lib/email/templates/welcome";
import { buildAdminNewSignupMail } from "@/lib/email/templates/admin-new-signup";
import { buildAppUrl } from "@/lib/url";

// Constant-time decoy hash for the "user not found" path. Without this,
// an unknown email returns immediately while a known email triggers a
// ~100ms bcrypt compare — a timing side-channel that lets an attacker
// enumerate registered accounts. The decoy below is a real bcrypt hash
// of an unrelated string; we always compare against it on the miss path
// so both branches take roughly the same wall-clock time.
const DECOY_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8e4M.yRHaZ3.j8Ql7BjT8X7aYsMaDi";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@onsverhaaltje.nl";

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
    const welcome = buildWelcomeMail({ name: user.name, profileUrl });
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
    await sendMail({
      to: ADMIN_EMAIL,
      subject: adminMail.subject,
      html: adminMail.html,
      text: adminMail.text,
      tags: ["admin-new-signup"],
    });
  } catch (err) {
    console.error("[auth] admin notification mail failed", err);
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    // Google OAuth — picks up AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from env
    // automatically. allowDangerousEmailAccountLinking is acceptable here:
    // Google-issued emails are verified by Google itself, so we can safely
    // merge a Google sign-in into an existing credentials account that
    // shares the address.
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

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            // Admins bypass the pending-approval gate. Self-heal any admin
            // account whose status was left at the default "pending".
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
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // First sign-in fires this with `user` populated. On subsequent
      // requests within the same session, `user` is undefined and the
      // token already has id+role.
      if (!user) return token;

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
              // Same gate as credentials: pending until admin approves.
              status: "pending",
              lastLoginAt: new Date(),
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
      } else {
        // Credentials path: authorize() already returned id+role.
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
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
