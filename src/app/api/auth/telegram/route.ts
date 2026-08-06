import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { env } from "@/lib/env";
import {
  telegramDisplayName,
  telegramEmail,
  telegramPassword,
  verifyTelegramAuth,
  type TelegramAuthData,
} from "@/lib/auth/telegram";
import { authRateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;

const telegramAuthSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().trim().max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  username: z.string().trim().max(80).optional(),
  photo_url: z.string().trim().url().max(500).optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().regex(/^[a-f0-9]{64}$/i),
});

/**
 * Telegram Login Widget callback'i.
 *
 * Widget bosilganda klient bu yerga imzolangan ma'lumotni yuboradi. Imzo
 * tekshirilgach, foydalanuvchi topiladi yoki yaratiladi va better-auth
 * sessiyasi ochiladi (Set-Cookie javob bilan qaytadi).
 */
export async function POST(request: NextRequest) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Telegram kirish sozlanmagan" }, { status: 503 });
  }

  // SMS/email OTP bilan bir xil cheklov — imzo tekshiruvi arzon bo'lsa-da,
  // hisob yaratish oqimi ochiq qolmasin.
  const limited = await authRateLimit(request);
  if (limited) return limited;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Ma'lumot juda katta" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Ma'lumot o'qilmadi" }, { status: 400 });
  }

  const parsed = telegramAuthSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Telegram ma'lumoti noto'g'ri" }, { status: 400 });
  }

  const data: TelegramAuthData = parsed.data;

  if (!verifyTelegramAuth(data)) {
    return NextResponse.json({ error: "Telegram imzosi noto'g'ri" }, { status: 401 });
  }

  const email = telegramEmail(data.id);
  const password = telegramPassword(data.id);
  const name = telegramDisplayName(data);

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  try {
    const response =
      existing.length > 0
        ? await auth.api.signInEmail({
            body: { email, password },
            headers: request.headers,
            asResponse: true,
          })
        : await auth.api.signUpEmail({
            body: { email, password, name, image: data.photo_url },
            headers: request.headers,
            asResponse: true,
          });

    // Sessiya cookie'sini javobga ko'chiramiz, oldinga esa faqat
    // yo'naltirish manzilini beramiz (token/parol klientga chiqmaydi).
    const out = NextResponse.json({ ok: true });
    response.headers.getSetCookie().forEach((c) => out.headers.append("set-cookie", c));
    return out;
  } catch (err) {
    console.error("Telegram kirish xatosi:", err);
    return NextResponse.json({ error: "Kirishda xatolik yuz berdi" }, { status: 500 });
  }
}
