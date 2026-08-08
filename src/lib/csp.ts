/**
 * Content-Security-Policy — bitta manba.
 *
 * Ilgari siyosat `next.config.ts` da statik yozilgan edi va `script-src` da
 * majburan `'unsafe-inline'` turardi: Next.js o'z ishga tushirish skriptlarini
 * HTML ichiga inline qo'yadi, ularsiz sahifa umuman jonlanmaydi. Ammo
 * `'unsafe-inline'` brauzerga «har qanday inline skript ishlasin» deydi —
 * ya'ni saytga XSS kirib qolsa, CSP uni to'xtatmasdi.
 *
 * Yechim — nonce. `proxy.ts` har so'rovda tasodifiy nonce yaratadi, uni
 * so'rov sarlavhasiga qo'yadi (Next.js shu sarlavhani o'qib o'z skriptlariga
 * `nonce` atributini yozadi) va javobdagi CSP ga kiritadi. Natijada faqat
 * SHU so'rovda server ruxsat bergan skript ishlaydi.
 *
 * `'strict-dynamic'` — nonce bilan yuklangan skript o'zi qo'shgan skriptlarga
 * ishonch uzatiladi. Telegram kirish vidjeti aynan shunday yuklanadi
 * (`social-buttons.tsx` `document.createElement("script")` qiladi).
 *
 * `'unsafe-inline'` va `https:` ro'yxatda ATAYLAB qoldirilgan: nonce yoki
 * `strict-dynamic` tushunadigan brauzer ularni butunlay e'tiborsiz qoldiradi
 * (CSP3 qoidasi), tushunmaydigan eski brauzerda esa sayt ishlashda davom
 * etadi. Ya'ni bu zaiflashtirish emas, orqaga moslik.
 */

const isDev = process.env.NODE_ENV === "development";

/** Nonce shu sarlavha orqali proxy'dan ilovaga uzatiladi. */
export const NONCE_HEADER = "x-nonce";

/** Har so'rov uchun taxmin qilib bo'lmaydigan nonce. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // Dev'da Turbopack HMR uchun 'unsafe-eval' kerak; prod'da yo'q.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:${isDev ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    // Loyiha inline `style={{...}}` dan foydalanadi — bu yerda nonce ishlamaydi.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    // Dars videolari `<iframe>` orqali qo'yiladi (`src/lib/video.ts` faqat shu
    // manzillarni quradi). `strict-dynamic` frame-src ga ta'sir qilmaydi.
    "frame-src https://oauth.telegram.org https://telegram.org https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "media-src 'self' https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
