import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Himoyalangan yo'llar. Proxy (Next.js 16'da avvalgi "middleware") — bu
 * OPTIMISTIK tekshiruv (faqat cookie mavjudligini ko'radi, edge'da tez).
 * Haqiqiy sessiya tekshiruvi server komponentlarida (requireUser) qo'shimcha
 * bajariladi.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/courses", "/ranking", "/subscription", "/profile"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/ranking/:path*",
    "/subscription/:path*",
    "/profile/:path*",
  ],
};
