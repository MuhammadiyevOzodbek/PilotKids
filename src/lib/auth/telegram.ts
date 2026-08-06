import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Telegram Login Widget qaytaradigan ma'lumot. */
export interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** Imzo 10 daqiqadan eski bo'lsa qayta ishlatilgan deb hisoblaymiz. */
const MAX_AGE_SECONDS = 10 * 60;

/**
 * Telegram imzosini tekshiradi.
 *
 * Telegram hujjatiga ko'ra: `hash`dan tashqari barcha maydonlar `kalit=qiymat`
 * ko'rinishida alifbo tartibida `\n` bilan birlashtiriladi, so'ng
 * `HMAC-SHA256(data, SHA256(bot_token))` hisoblanadi va `hash` bilan
 * solishtiriladi. Solishtirish vaqt-bardosh (`timingSafeEqual`) qilinadi.
 */
export function verifyTelegramAuth(data: TelegramAuthData): boolean {
  if (!env.TELEGRAM_BOT_TOKEN) return false;

  const { hash, ...fields } = data;
  if (!hash || typeof hash !== "string") return false;

  // Eskirgan imzoni qabul qilmaymiz (replay hujumiga qarshi).
  const ageSeconds = Math.floor(Date.now() / 1000) - Number(data.auth_date);
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds > MAX_AGE_SECONDS) return false;

  const checkString = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = createHash("sha256").update(env.TELEGRAM_BOT_TOKEN).digest();
  const expected = createHmac("sha256", secretKey).update(checkString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Telegram hisobi uchun barqaror ichki parol.
 *
 * Telegram'da parol tushunchasi yo'q, lekin better-auth sessiyani email+parol
 * oqimi orqali yaratishi qulay. Parolni server sirridan hosil qilamiz: u har
 * safar bir xil chiqadi, ammo `BETTER_AUTH_SECRET`ni bilmasdan taxmin qilib
 * bo'lmaydi. Hech qachon klientga chiqmaydi.
 */
export function telegramPassword(telegramId: number | string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`telegram:${telegramId}`)
    .digest("hex");
}

/** Telegram foydalanuvchisi uchun ichki email manzili. */
export function telegramEmail(telegramId: number | string): string {
  return `tg${telegramId}@telegram.pilotkids.uz`;
}

/** Widget'dan kelgan ismni ko'rsatiladigan nomga aylantiradi. */
export function telegramDisplayName(data: TelegramAuthData): string {
  const full = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return full || data.username || "Telegram o'quvchisi";
}
