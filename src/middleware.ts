import { NextResponse } from "next/server";

export default async function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico).*)",
  ],
};
