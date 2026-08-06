import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, user } from "@/lib/db/schema";
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
  first_name: z.string().trim().min(1).max(80).optional(),
  last_name: z.string().trim().min(1).max(80).optional(),
  username: z.string().trim().min(1).max(80).optional(),
  photo_url: z.string().trim().url().max(500).optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().regex(/^[a-f0-9]{64}$/i),
});

function telegramProfile(data: TelegramAuthData) {
  const profile = {
    telegramId: String(data.id),
    telegramUsername: data.username ?? null,
    telegramFirstName: data.first_name ?? null,
    telegramLastName: data.last_name ?? null,
    telegramPhotoUrl: data.photo_url ?? null,
    updatedAt: new Date(),
  };
  return data.photo_url ? { ...profile, image: data.photo_url } : profile;
}

async function findTelegramUser(telegramId: string, email: string) {
  const rows = await db
    .select({ userId: user.id, email: user.email })
    .from(user)
    .leftJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "telegram")))
    .where(
      or(
        eq(user.telegramId, telegramId),
        eq(user.email, email),
        and(eq(account.providerId, "telegram"), eq(account.accountId, telegramId)),
      ),
    )
    .limit(2);

  const distinctIds = new Set(rows.map((row) => row.userId));
  if (distinctIds.size > 1) {
    throw new Error("TELEGRAM_LINK_CONFLICT");
  }

  return rows[0] ?? null;
}

async function upsertTelegramAccount(userId: string, telegramId: string, data: TelegramAuthData) {
  await db.update(user).set(telegramProfile(data)).where(eq(user.id, userId));

  const existing = await db
    .select({ id: account.id, userId: account.userId })
    .from(account)
    .where(and(eq(account.providerId, "telegram"), eq(account.accountId, telegramId)))
    .limit(1);

  if (existing[0]) {
    if (existing[0].userId !== userId) throw new Error("TELEGRAM_LINK_CONFLICT");
    return;
  }

  try {
    await db.insert(account).values({
      id: randomUUID(),
      providerId: "telegram",
      accountId: telegramId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err) {
    const linked = await db
      .select({ userId: account.userId })
      .from(account)
      .where(and(eq(account.providerId, "telegram"), eq(account.accountId, telegramId)))
      .limit(1);
    if (linked[0]?.userId === userId) return;
    throw err;
  }
}

async function signInTelegramUser(request: NextRequest, email: string, password: string) {
  return auth.api.signInEmail({
    body: { email, password },
    headers: request.headers,
    asResponse: true,
  });
}

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
  const telegramId = String(data.id);

  try {
    const existing = await findTelegramUser(telegramId, email);

    let response: Response;
    if (existing) {
      await upsertTelegramAccount(existing.userId, telegramId, data);
      response = await signInTelegramUser(request, existing.email, password);
    } else {
      response = await auth.api.signUpEmail({
        body: { email, password, name, image: data.photo_url },
        headers: request.headers,
        asResponse: true,
      });
      const created = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
      if (!created[0]) throw new Error("TELEGRAM_USER_CREATE_FAILED");
      await upsertTelegramAccount(created[0].id, telegramId, data);
    }

    // Sessiya cookie'sini javobga ko'chiramiz, oldinga esa faqat
    // yo'naltirish manzilini beramiz (token/parol klientga chiqmaydi).
    const out = NextResponse.json({ ok: true });
    response.headers.getSetCookie().forEach((c) => out.headers.append("set-cookie", c));
    return out;
  } catch (err) {
    if (err instanceof Error && err.message === "TELEGRAM_LINK_CONFLICT") {
      return NextResponse.json(
        { error: "Bu Telegram hisobi boshqa foydalanuvchiga bog'langan" },
        { status: 409 },
      );
    }
    console.error("Telegram kirish xatosi:", err);
    return NextResponse.json({ error: "Kirishda xatolik yuz berdi" }, { status: 500 });
  }
}
