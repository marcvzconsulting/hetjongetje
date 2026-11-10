import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    /** User.sessionVersion op het moment van inloggen. */
    sv?: number;
    /** Laatste controle tegen de database (ms sinds epoch). */
    checkedAt?: number;
  }
}
