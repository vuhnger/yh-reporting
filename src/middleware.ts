import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ token, req }) {
      const hasSessionCookie = req.cookies
        .getAll()
        .some(({ name }) => name.includes("next-auth.session-token"));

      console.info("middleware auth check", {
        path: req.nextUrl.pathname,
        hasToken: Boolean(token),
        hasSessionCookie,
      });

      return Boolean(token);
    },
  },
});

export const config = {
  matcher: [
    "/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico).*)",
  ],
};
