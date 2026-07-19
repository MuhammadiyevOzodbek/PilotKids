import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 da `middleware.ts` → `proxy.ts` deb qayta nomlangan.
 *
 * Bu yerda faqat ARZON optimistik tekshiruv: session cookie bormi yoki yo'qmi.
 * Haqiqiy avtorizatsiya har doim server komponentda (`requireUser`) va server
 * action ichida qayta tekshiriladi — proxy'ga ishonib qolmaymiz.
 */

const PROTECTED = [
  "/dashboard",
  "/courses",
  "/lesson",
  "/quiz",
  "/lab",
  "/tutor",
  "/leaderboard",
  "/certificates",
  "/profile",
  "/parent",
  "/settings",
];

const AUTH_PAGES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  // Tizimga kirmagan foydalanuvchi himoyalangan sahifaga kirsa — login'ga.
  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Allaqachon kirgan foydalanuvchi login/signup'ga kirsa — dashboard'ga.
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Statik fayllar, rasm optimizatsiyasi va auth API'ni chetlab o'tamiz.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
