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
import { withInternalAuthHeader } from "@/lib/auth/internal";
import { assertSameOrigin, readJsonWithLimit } from "@/lib/security";

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

const telegramAuthQuerySchema = telegramAuthSchema.extend({
  id: z.coerce.number().int().positive(),
  auth_date: z.coerce.number().int().positive(),
});

function safeCallbackURL(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

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
    headers: withInternalAuthHeader(request.headers),
    asResponse: true,
  });
}

async function authenticateTelegram(request: NextRequest, data: TelegramAuthData) {
  if (!verifyTelegramAuth(data)) {
    return { error: "Telegram imzosi noto'g'ri", status: 401 } as const;
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
      // Sintetik manzilga hisob ochish faqat shu ichki belgi bilan mumkin —
      // tashqi so'rov `/api/auth/sign-up/email` orqali buni qila olmaydi.
      response = await auth.api.signUpEmail({
        body: { email, password, name, image: data.photo_url },
        headers: withInternalAuthHeader(request.headers),
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

    return { response } as const;
  } catch (err) {
    if (err instanceof Error && err.message === "TELEGRAM_LINK_CONFLICT") {
      return {
        error: "Bu Telegram hisobi boshqa foydalanuvchiga bog'langan",
        status: 409,
      } as const;
    }
    console.error("Telegram kirish xatosi:", err);
    return { error: "Kirishda xatolik yuz berdi", status: 500 } as const;
  }
}

async function preflight(request: NextRequest) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Telegram kirish sozlanmagan" }, { status: 503 });
  }

  // SMS/email OTP bilan bir xil cheklov — imzo tekshiruvi arzon bo'lsa-da,
  // hisob yaratish oqimi ochiq qolmasin.
  const limited = await authRateLimit(request);
  if (limited) return limited;
  return null;
}

/**
 * Telegram Login Widget redirect callback'i.
 *
 * `data-auth-url` rejimida Telegram signed ma'lumotlarni query string bilan
 * shu endpointga yuboradi. Imzo serverda tekshiriladi, Better Auth sessiyasi
 * ochiladi va foydalanuvchi ilovaga qaytariladi.
 */
export async function GET(request: NextRequest) {
  const failed = await preflight(request);
  if (failed) return failed;

  const url = new URL(request.url);
  const callbackURL = safeCallbackURL(url.searchParams.get("callbackURL"));
  const parsed = telegramAuthQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/login?telegram_error=invalid", request.url));
  }

  const result = await authenticateTelegram(request, parsed.data);
  if ("error" in result) {
    const message = result.error ?? "Telegram bilan kirishda xatolik";
    return NextResponse.redirect(
      new URL(`/login?telegram_error=${encodeURIComponent(message)}`, request.url),
    );
  }

  const out = NextResponse.redirect(new URL(callbackURL, request.url));
  result.response.headers.getSetCookie().forEach((c) => out.headers.append("set-cookie", c));
  return out;
}

/**
 * JSON callback eski klientlar/testlar uchun saqlanadi.
 */
export async function POST(request: NextRequest) {
  const failed = await preflight(request);
  if (failed) return failed;

  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const raw = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!raw.ok) return raw.response;

  const parsed = telegramAuthSchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Telegram ma'lumoti noto'g'ri" }, { status: 400 });
  }

  const data: TelegramAuthData = parsed.data;

  const result = await authenticateTelegram(request, data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Sessiya cookie'sini javobga ko'chiramiz, oldinga esa faqat
  // yo'naltirish manzilini beramiz (token/parol klientga chiqmaydi).
  const out = NextResponse.json({ ok: true });
  result.response.headers.getSetCookie().forEach((c) => out.headers.append("set-cookie", c));
  return out;
}
