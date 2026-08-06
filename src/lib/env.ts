import "server-only";
import { z } from "zod";

/** Server muhit o'zgaruvchilari — faqat serverda o'qiladi. */
const serverSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL noto'g'ri yoki yo'q"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET kerak"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  // Google AI Studio (Gemini). Bo'sh bo'lsa AI tutor oflayn javoblarga qaytadi.
  GEMINI_API_KEY: z.string().optional().default(""),
  // Telegram Login Widget — bot tokeni bilan kirish ma'lumoti imzosi tekshiriladi.
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_BOT_USERNAME: z.string().optional().default(""),
  // Eskiz.uz SMS gateway (O'zbekiston) — telefon OTP yuborish uchun.
  ESKIZ_EMAIL: z.string().optional().default(""),
  ESKIZ_PASSWORD: z.string().optional().default(""),
  ESKIZ_FROM: z.string().optional().default("4546"),
  // SMTP — email OTP (parolsiz kirish) uchun.
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.string().optional().default("587"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default(""),
  // Upstash Redis — server-side rate limiting uchun.
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("")).default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Muhit o'zgaruvchilarida xatolik:", z.treeifyError(parsed.error));
  throw new Error("Muhit o'zgaruvchilari to'g'ri sozlanmagan (.env.local ni tekshiring)");
}

export const env = parsed.data;

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/** OAuth provayder yoqilganmi (kalitlar to'ldirilganmi). */
export const oauth = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
};

export const isDev = process.env.NODE_ENV !== "production";

/**
 * Kirish usullari va ularning holati.
 *
 * Tez kirish tugmalari (Google, Telegram) HAR DOIM ko'rinadi — ular sahifaning
 * asosiy qismi. Kalitlar hali qo'yilmagan bo'lsa tugma o'chirilgan holatda
 * turadi va sababi yozib qo'yiladi: shunda bola "bosdim, hech narsa bo'lmadi"
 * degan holatga tushmaydi, sayt egasi esa nima yetishmayotganini ko'radi.
 */
export const authMethods = {
  google: oauth.google,
  telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME),
  /** SMS provayderi sozlanganmi. Dev'da provayder shart emas — kod terminalga chiqadi. */
  sms: Boolean(env.ESKIZ_EMAIL && env.ESKIZ_PASSWORD),
  /** SMTP sozlanganmi. Dev'da shart emas — kod terminalga chiqadi. */
  smtp: Boolean(env.SMTP_HOST && env.SMTP_USER),
};

/** Telefon/email kod oqimi ishlaydimi (dev'da provayderisiz ham ishlaydi). */
export const otpEnabled = {
  phone: isDev || authMethods.sms,
  email: isDev || authMethods.smtp,
};

/** Telegram bot foydalanuvchi nomi (widget uchun, klientga uzatiladi). */
export const telegramBotUsername = env.TELEGRAM_BOT_USERNAME;

/** Gemini kaliti sozlanganmi. */
export const aiEnabled = Boolean(env.GEMINI_API_KEY);
