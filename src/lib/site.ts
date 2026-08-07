/**
 * Sayt haqidagi umumiy konstantalar.
 *
 * `env.ts` "server-only" — uni metadata'dan tashqarida (masalan klient
 * komponentda) import qilib bo'lmaydi. Shu bois saytga tegishli, sirsiz
 * qiymatlar shu yerda alohida turadi va hamma joydan o'qilaveradi.
 */

/** Saytning to'liq manzili (oxirida `/` yo'q). Absolyut OG/canonical URL'lar shundan quriladi. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");

export const siteName = "PilotKids";

export const siteTitle = "PilotKids — Robototexnika Akademiyasi";

export const siteDescription =
  "7–18 yoshli bolalar uchun robototexnika, kod va STEM platformasi. O'ynab, qurib, kashf et.";

/** Umumiy bog'lanish manzili (footer, "Bog'lanish" havolasi). */
export const contactEmail = "ulugbeknegmatov7@gmail.com";
