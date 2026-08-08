import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/safe-path";

/**
 * Sessiyani majburan tozalaydigan chiqish yo'li.
 *
 * Nima uchun kerak: sessiya cookie'si BOR, lekin bazada foydalanuvchi YO'Q
 * holati mumkin — masalan bosh admin hisobni o'chirsa yoki baza tiklansa.
 * Bunda foydalanuvchi cheksiz aylanmaga tushib qolardi va saytga umuman
 * kira olmasdi:
 *
 *   `/login` → proxy cookie'ni ko'radi → `/boshlash`
 *   `/boshlash` → `requireUser()` bazada topa olmaydi → `/login` → …
 *
 * Brauzer buni `ERR_TOO_MANY_REDIRECTS` bilan to'xtatadi. Server komponent
 * cookie o'chira olmaydi, route handler esa oladi — shu bois yo'naltirish
 * shu yerdan o'tkaziladi.
 *
 * Oddiy «chiqish» tugmasi uchun ham xavfsiz: cookie o'chgach `/login`
 * ochiladi va proxy uni endi ushlab qolmaydi.
 */
export async function GET(request: NextRequest) {
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"), "/login");
  const response = NextResponse.redirect(new URL(next, request.url));

  /*
   * Cookie nomini qattiq yozmaymiz. better-auth uni sozlamaga qarab
   * `better-auth.session_token`, `__Secure-better-auth.session_token` yoki
   * prefiksli boshqa ko'rinishda qo'yadi — nomi o'zgarsa jim ishlamay
   * qolmasligi uchun naqsh bo'yicha tozalaymiz.
   */
  /*
   * O'chirish atributlari cookie QO'YILGANDAGI atributlar bilan mos
   * bo'lishi SHART.
   *
   * Productionda better-auth `useSecureCookies` bilan ishlaydi va cookie
   * nomiga `__Secure-` prefiksini qo'yadi. RFC 6265bis bo'yicha brauzer
   * bunday nomli `Set-Cookie` ni `Secure` atributisiz BUTUNLAY rad etadi.
   * Ya'ni `secure` siz bu sikl productionda hech narsani o'chirmasdi va
   * yuqorida tasvirlangan cheksiz aylanma aynan o'sha yerda — tirik
   * serverda — davom etardi.
   */
  const secure = process.env.NODE_ENV === "production";

  for (const cookie of request.cookies.getAll()) {
    if (/better-auth|session_token|session_data/i.test(cookie.name)) {
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
        secure,
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }

  // Bu javob hech qachon keshlanmasin.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
