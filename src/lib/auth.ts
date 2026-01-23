import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.");
}

export const authOptions: NextAuthOptions = {
  debug: true,
  pages: {
    signIn: "/auth/signin",
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
      return Boolean(user.email?.endsWith(allowedDomain));
    },
  },
};
