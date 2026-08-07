import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Ichki (server tomonidan boshlangan) auth chaqiruvlarini belgilash.
 *
 * NIMA UCHUN KERAK: Telegram orqali kirish oqimi hisobni `auth.api.signUpEmail`
 * bilan yaratadi va unga `tg<id>@telegram.pilotkids.uz` ko'rinishidagi ichki
 * manzil beradi. Bu manzillar oddiy ro'yxatdan o'tish validatsiyasidan (ism,
 * yosh, ota-ona roziligi) o'tolmaydi, shuning uchun ular uchun istisno bor.
 *
 * Istisno ochiq qolsa, tashqi odam `/api/auth/sign-up/email` ga to'g'ridan-to'g'ri
 * murojaat qilib, ixtiyoriy Telegram ID nomiga hisob ochib qo'yishi mumkin edi
 * (o'ziga ma'lum parol bilan). Keyin haqiqiy egasi Telegram orqali kirmoqchi
 * bo'lganda uning Telegram ID'si o'sha begona hisobga bog'lanib, o'zi tizimga
 * kira olmay qolardi.
 *
 * Shu sababli istisno endi FAQAT shu sarlavha bilan kelgan so'rovlarda
 * ishlaydi. Sarlavha qiymati server sirridan hosil qilinadi — uni tashqaridan
 * taxmin qilib bo'lmaydi.
 */

export const INTERNAL_AUTH_HEADER = "x-pilotkids-internal-auth";

/** Faqat ichki oqim biladigan qiymat. Har ishga tushishda bir xil. */
function internalToken(): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update("internal-auth:v1").digest("hex");
}

/** Berilgan sarlavha qiymati haqiqiymi (vaqt-bardosh solishtirish). */
export function isInternalAuthCall(headers: Headers | undefined | null): boolean {
  const provided = headers?.get(INTERNAL_AUTH_HEADER);
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(internalToken());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Kiruvchi so'rov sarlavhalaridan ichki chaqiruv uchun nusxa tayyorlaydi.
 *
 * Klient yuborgan har qanday soxta belgi O'CHIRILADI va uning o'rniga
 * haqiqiysi qo'yiladi — foydalanuvchi sarlavhani o'zi qo'shib yuborsa ham
 * hech narsaga erisha olmaydi.
 */
export function withInternalAuthHeader(incoming: Headers): Headers {
  const out = new Headers(incoming);
  out.delete(INTERNAL_AUTH_HEADER);
  out.set(INTERNAL_AUTH_HEADER, internalToken());
  return out;
}
