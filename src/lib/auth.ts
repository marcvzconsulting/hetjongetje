import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit/api-rate-limit";

// Constant-time decoy hash for the "user not found" path. Without this,
// an unknown email returns immediately while a known email triggers a
// ~100ms bcrypt compare — a timing side-channel that lets an attacker
// enumerate registered accounts. The decoy below is a real bcrypt hash
// of an unrelated string; we always compare against it on the miss path
// so both branches take roughly the same wall-clock time.
const DECOY_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8e4M.yRHaZ3.j8Ql7BjT8X7aYsMaDi";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
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
    async jwt({ token, user }) {
      if (user) {
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
