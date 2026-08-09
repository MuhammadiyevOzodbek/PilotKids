/**
 * Sayt haqidagi umumiy konstantalar.
 *
 * `env.ts` "server-only" — uni metadata'dan tashqarida (masalan klient
 * komponentda) import qilib bo'lmaydi. Shu bois saytga tegishli, sirsiz
 * qiymatlar shu yerda alohida turadi va hamma joydan o'qilaveradi.
 */

/**
 * Yagona kanonik ishlab chiqarish manzili.
 *
 * Google uchun sayt BITTA manzilda bo'lishi shart: `www.` va `www.`siz
 * variantlar ikki xil sayt sifatida ko'rinsa, indeks bo'linadi. Shu bois
 * kanonik manzil shu yerda qattiq belgilangan va `siteUrl` uni majburlaydi.
 */
export const canonicalOrigin = "https://pilotkids.uz";

/**
 * Saytning to'liq manzili (oxirida `/` yo'q). Absolyut OG/canonical URL'lar
 * shundan quriladi.
 *
 * `pilotkids.uz` ga tegishli har qanday variant (`www.`li, `http://`li,
 * oxirida `/` bilan) bitta kanonik ko'rinishga keltiriladi — canonical va OG
 * havolalari env'dagi kichik farqdan buzilmasin. Boshqa domenlar (localhost,
 * Vercel preview) o'z holicha qoladi, aks holda preview'da havolalar
 * ishlab chiqarish saytiga ketib qolardi.
 */
export const siteUrl = (() => {
  const raw = (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NODE_ENV === "production"
        ? canonicalOrigin
        : "http://localhost:3000")
  ).replace(/\/+$/, "");

  try {
    const host = new URL(raw).hostname;
    if (host === "pilotkids.uz" || host === "www.pilotkids.uz") return canonicalOrigin;
  } catch {
    return canonicalOrigin;
  }
  return raw;
})();

export const siteName = "PilotKids";

export const siteTitle = "PilotKids — Bolalar uchun robototexnika, Arduino va dasturlash";

export const siteDescription =
  "PilotKids — bolalar uchun robototexnika, Arduino, elektronika va dasturlashni interaktiv darslar va virtual laboratoriya orqali o'rgatuvchi onlayn ta'lim platformasi.";

/** Bosh sahifa va manifest uchun umumiy kalit so'zlar. */
export const siteKeywords = [
  "PilotKids",
  "Pilot Kids",
  "robototexnika",
  "bolalar uchun robototexnika",
  "Arduino",
  "Arduino darslari",
  "robototexnika kurslari",
  "dasturlash",
  "bolalar uchun dasturlash",
  "virtual laboratoriya",
  "elektronika",
  "STEM",
];

/** Umumiy bog'lanish manzili (footer, "Bog'lanish" havolasi). */
export const contactEmail = "ulugbeknegmatov7@gmail.com";
