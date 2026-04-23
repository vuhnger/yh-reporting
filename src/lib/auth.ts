import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { matchesAllowedDomain } from "@/lib/auth-domain";

const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.");
}

if (!nextAuthSecret) {
  console.error("Missing NEXTAUTH_SECRET in environment.");
}

export const authOptions: NextAuthOptions = {
  debug: true,
  secret: nextAuthSecret,
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: clientId ?? "",
      clientSecret: clientSecret ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!allowedDomain) return true;

      return Boolean(user.email && matchesAllowedDomain(user.email, allowedDomain));
    },
  },
};
