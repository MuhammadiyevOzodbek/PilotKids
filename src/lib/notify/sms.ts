import "server-only";
import { env } from "@/lib/env";

/**
 * Eskiz.uz SMS gateway (O'zbekiston).
 *
 * Kalitlar sozlanmagan bo'lsa SMS yuborilmaydi — dev rejimida kod konsolga
 * chiqariladi, shunda telefon oqimini haqiqiy SMS'siz ham sinab ko'rish mumkin.
 * Ishlab chiqarishda kalitsiz yuborishga urinish xatolik qaytaradi.
 */

const BASE = "https://notify.eskiz.uz/api";

/**
 * Tashqi so'rov uchun eng ko'p kutish vaqti (ms).
 *
 * Timeout'siz Eskiz javob bermay qolsa, SMS kod so'ragan HAR BIR
 * foydalanuvchi so'rovi Node.js ning standart TCP muddatigacha —
 * daqiqalarcha — osilib turardi va serverless funksiya vaqti tugaguncha
 * resursni band qilardi.
 */
const TIMEOUT_MS = 8000;

/** Token 30 kun amal qiladi — jarayon xotirasida keshlaymiz. */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const body = new FormData();
  body.append("email", env.ESKIZ_EMAIL);
  body.append("password", env.ESKIZ_PASSWORD);

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Eskiz auth xatosi: ${res.status}`);

  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new Error("Eskiz tokeni qaytmadi");

  // 25 kun — yangilash muddatidan xavfsiz zaxira bilan oldin.
  cachedToken = { value: token, expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000 };
  return token;
}

/** Raqamni Eskiz kutgan ko'rinishga keltiradi: 998901234567. */
function normalize(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "");
}

export async function sendSms(phoneNumber: string, message: string): Promise<void> {
  const configured = Boolean(env.ESKIZ_EMAIL && env.ESKIZ_PASSWORD);

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMS provayderi sozlanmagan (ESKIZ_EMAIL / ESKIZ_PASSWORD)");
    }
    console.info(`\n📱 [DEV SMS] ${phoneNumber}\n   ${message}\n`);
    return;
  }

  const token = await getToken();
  const body = new FormData();
  body.append("mobile_phone", normalize(phoneNumber));
  body.append("message", message);
  body.append("from", env.ESKIZ_FROM);

  const res = await fetch(`${BASE}/message/sms/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    // Token muddati tugagan bo'lishi mumkin — keshni tozalab, keyingi
    // urinishda yangi token olinsin.
    cachedToken = null;
    throw new Error(`SMS yuborilmadi: ${res.status}`);
  }
}
