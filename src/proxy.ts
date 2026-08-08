import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { buildCsp, NONCE_HEADER, newNonce } from "@/lib/csp";

/**
 * Next.js 16 da `middleware.ts` → `proxy.ts` deb qayta nomlangan.
 *
 * Bu yerda faqat ARZON optimistik tekshiruv: session cookie bormi yoki yo'qmi.
 * Haqiqiy avtorizatsiya har doim server komponentda (`requireUser`) va server
 * action ichida qayta tekshiriladi — proxy'ga ishonib qolmaymiz.
 */

const PROTECTED = [
  "/boshlash",
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
  "/admin",
  "/superadmin",
  "/welcome",
];

const AUTH_PAGES = ["/login", "/signup"];

const BLOCKED_PATH_PATTERNS = [
  /^\/\.env/i,
  /^\/\.git(?:\/|$)/i,
  /^\/wp-admin(?:\/|$)/i,
  /^\/wp-login\.php$/i,
  /^\/xmlrpc\.php$/i,
  /^\/phpmyadmin(?:\/|$)/i,
  /^\/admin\.php$/i,
  /^\/config\.(?:php|json|js)$/i,
  /^\/backup(?:\/|\.|$)/i,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return new NextResponse("Not found", { status: 404 });
  }

  /*
   * Har bir so'rov uchun yangi nonce.
   *
   * `next.config.ts` dagi statik CSP `script-src` da 'unsafe-inline' saqlashga
   * majbur edi — Next.js o'z ishga tushirish skriptlarini HTML ichiga inline
   * qo'yadi. Bu esa XSS topilgan taqdirda uni bemalol bajarilishiga yo'l
   * ochardi. Nonce bilan faqat SHU so'rovda server o'zi belgilagan skriptlar
   * ishlaydi, tashqaridan kiritilgani esa ishlamaydi.
   *
   * Nonce ikki joyga qo'yiladi: so'rov sarlavhasiga (Next.js uni o'qib o'z
   * skriptlariga qo'yadi va `headers()` orqali `layout.tsx` ham oladi) va
   * javob sarlavhasidagi CSP ga.
   */
  const nonce = newNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set("content-security-policy", csp);

  const withCsp = (response: NextResponse) => {
    response.headers.set("content-security-policy", csp);
    return response;
  };

  // Tizimga kirmagan foydalanuvchi himoyalangan sahifaga kirsa — login'ga.
  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return withCsp(NextResponse.redirect(url));
  }

  /*
   * Allaqachon kirgan foydalanuvchi login/signup'ga kelsa — `/boshlash` ga.
   * U yerda rol tekshirilib, admin o'z paneliga, o'quvchi esa ilovaga
   * tushadi. Proxy rolni bilmaydi (cookie'da faqat sessiya bor), shuning
   * uchun qaror server komponentga qoldiriladi.
   */
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return withCsp(NextResponse.redirect(new URL("/boshlash", request.url)));
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  // Statik fayllar, rasm optimizatsiyasi va auth API'ni chetlab o'tamiz.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
