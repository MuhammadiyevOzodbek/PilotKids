/**
 * Foydalanuvchi bergan "qayerga qaytaramiz?" manzilini xavfsizlashtirish.
 *
 * `?next=` va `?callbackURL=` parametrlari manzil satridan keladi, ya'ni
 * ularni istalgan odam yozadi. Tekshirilmasa bu OCHIQ YO'NALTIRISH bo'ladi:
 * hujumchi `https://pilotkids.uz/...?callbackURL=…` ko'rinishidagi havolani
 * tarqatadi, bola haqiqiy saytda tizimga kiradi va shundan keyin o'ziga
 * o'xshab yasalgan soxta saytga tushadi.
 *
 * Ilgari tekshiruv `value.startsWith("/") && !value.startsWith("//")` edi.
 * Bu YETARLI EMAS — quyidagilarning hammasi undan o'tib ketardi va
 * `new URL(...)` ularni tashqi manzilga aylantirardi:
 *
 *   "/\\evil.com"    → http://evil.com/
 *   "/\\/evil.com"   → http://evil.com/
 *   "/\t/evil.com"   → http://evil.com/   (tab URL tahlilida tashlab yuboriladi)
 *   "/\n/evil.com"   → http://evil.com/
 *
 * Sababi: URL standarti `\` ni `/` deb o'qiydi va boshqaruv belgilarini
 * olib tashlaydi. Shuning uchun bu yerda satrni "ko'rinishi bo'yicha" emas,
 * TAHLIL QILINGANDAN KEYINGI natijasi bo'yicha baholaymiz — yagona ishonchli
 * mezon: hosil bo'lgan manzilning origin'i o'zgarmagan bo'lsin.
 *
 * `server-only` EMAS: bir xil qoida server route'da ham, login formasida ham
 * (klient) kerak. Ikki xil nusxa ikki xil xatoga olib keladi.
 */

/** Tekshiruv uchun soxta ildiz — hech qachon haqiqiy manzil bo'lolmaydi. */
const PROBE_ORIGIN = "http://pilotkids.invalid";

export const DEFAULT_LANDING = "/boshlash";

export function safeInternalPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_LANDING,
): string {
  if (typeof value !== "string" || value === "") return fallback;

  // Boshqaruv belgilari va bo'shliqlar tahlilda yo'qoladi — darhol rad etamiz.
  if (/[\u0000-\u0020\u007F]/.test(value)) return fallback;

  // Faqat ildizdan boshlanadigan ichki yo'l.
  if (!value.startsWith("/")) return fallback;

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }

  // Asosiy himoya: origin o'zgargan bo'lsa — bu tashqi manzil.
  if (url.origin !== PROBE_ORIGIN) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
