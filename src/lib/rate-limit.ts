import "server-only";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Upstash Redis orqali rate limiting.
 * Kalitlar sozlanmagan bo'lsa (lokal dev) — jim o'chadi va hamma so'rovga ruxsat beradi.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;
const memoryBuckets = new Map<string, number[]>();

function make(
  limit: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
  prefix: string,
) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix: `pk:${prefix}`,
  });
}

const limiters = {
  /** AI chat — qimmat operatsiya, qattiq cheklov. */
  ai: make(15, "10 m", "ai"),
  /** Progress yozuvchi actionlar (dars tugatish, quiz javobi). */
  write: make(60, "1 m", "write"),
  /** Umumiy action oqimi. */
  action: make(120, "1 m", "action"),
  /** Auth route'lari (Telegram kirish) — hisob yaratish oqimi ochiq qolmasin. */
  auth: make(10, "10 m", "auth"),
};

export type LimitKind = keyof typeof limiters;

const fallbackRules: Record<LimitKind, { limit: number; windowMs: number }> = {
  ai: { limit: 15, windowMs: 10 * 60 * 1000 },
  write: { limit: 60, windowMs: 60 * 1000 },
  action: { limit: 120, windowMs: 60 * 1000 },
  auth: { limit: 10, windowMs: 10 * 60 * 1000 },
};

function checkMemoryLimit(kind: LimitKind, identifier: string): boolean {
  const now = Date.now();
  const rule = fallbackRules[kind];
  const key = `${kind}:${identifier}`;
  const since = now - rule.windowMs;
  const recent = (memoryBuckets.get(key) ?? []).filter((ts) => ts > since);

  if (recent.length >= rule.limit) {
    memoryBuckets.set(key, recent);
    return false;
  }

  recent.push(now);
  memoryBuckets.set(key, recent);

  if (memoryBuckets.size > 10_000) {
    for (const [bucketKey, timestamps] of memoryBuckets) {
      const active = timestamps.filter((ts) => now - ts < 10 * 60 * 1000);
      if (active.length === 0) memoryBuckets.delete(bucketKey);
      else memoryBuckets.set(bucketKey, active);
      if (memoryBuckets.size <= 8_000) break;
    }
  }

  return true;
}

/**
 * So'rov IP manzili proksi sarlavhalaridan.
 *
 * ── Nega birinchi qiymat OLINMAYDI ──────────────────────────────────────
 * `X-Forwarded-For` — vergul bilan ajratilgan ro'yxat va uning BIRINCHI
 * qismini klientning o'zi yozadi: proksi faqat oxiriga qo'shadi. Ilgari
 * shu birinchi qiymat olinardi, ya'ni hujumchi har so'rovda
 * `X-Forwarded-For: 1.2.3.<tasodifiy>` yuborib, har safar yangi kalit
 * ostida hisoblanardi va cheklov butunlay ishlamas edi.
 *
 * Shuning uchun tartib quyidagicha:
 *   1. Platforma qo'yadigan va klientnikini QAYTA YOZADIGAN sarlavhalar;
 *   2. ular yo'q bo'lsa — `X-Forwarded-For` ning OXIRGI qismi, ya'ni
 *      bizga eng yaqin proksi yozgan qiymat.
 */
function ipFromHeaders(get: (name: string) => string | null): string {
  /*
   * Bu sarlavhalarni proksining o'zi qayta yozadi, shuning uchun klient
   * ularga ta'sir o'tkaza olmaydi.
   */
  for (const name of ["x-vercel-forwarded-for", "cf-connecting-ip", "x-real-ip"]) {
    const value = get(name)?.trim();
    if (value) return value;
  }

  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const nearest = parts[parts.length - 1];
    if (nearest) return nearest;
  }

  return "anon";
}

/** So'rov IP manzili (server komponent/action kontekstida). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return ipFromHeaders((name) => h.get(name));
}

/** So'rov IP manzili (route handler kontekstida). */
export function requestIp(request: Request): string {
  return ipFromHeaders((name) => request.headers.get(name));
}

/**
 * Limitni tekshiradi. Ruxsat bo'lsa `true`.
 * `identifier` — odatda userId (kirgan foydalanuvchi uchun) yoki IP.
 */
export async function checkLimit(kind: LimitKind, identifier: string): Promise<boolean> {
  const limiter = limiters[kind];
  if (!limiter) return checkMemoryLimit(kind, identifier);
  try {
    const { success } = await limiter.limit(identifier);
    return success;
  } catch (err) {
    // Redis ishlamay qolsa per-process fallback ishlaydi.
    console.error("[rate-limit] xato:", err);
    return checkMemoryLimit(kind, identifier);
  }
}

/* ─────────────────────────── Bir martalik belgilar ─────────────────────────── */

/** Redis yo'q bo'lganda ishlatiladigan zaxira: kalit → tugash vaqti. */
const usedOnce = new Map<string, number>();

/**
 * Kalitni BIR MARTA ishlatishga urinadi.
 *
 * Birinchi chaqiruvda `true`, o'sha kalit bilan keyingi chaqiruvlarda
 * (TTL ichida) `false` qaytaradi.
 *
 * ── Nima uchun kerak ────────────────────────────────────────────────────
 * Telegram login callback'i imzolangan query string ko'rinishida keladi
 * va imzo `auth_date` oynasi tugaguncha (10 daqiqa) haqiqiy bo'lib
 * qoladi. Bir martalik belgisiz o'sha manzilni kim ochsa — sessiya
 * oladi. Manzil esa brauzer tarixida, proksi loglarida, ekran suratida
 * yoki tasodifan yuborilgan havolada qolishi mumkin.
 *
 * Redis bo'lsa `SET NX` atomik ishlaydi. Bo'lmasa (lokal dev) jarayon
 * xotirasidagi zaxira ishlaydi — u ko'p instansiyali muhitda to'liq
 * kafolat bermaydi, lekin hech qanday himoyasiz qolishdan yaxshiroq.
 */
export async function consumeOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const namespaced = `pk:once:${key}`;

  if (redis) {
    try {
      const stored = await redis.set(namespaced, 1, { nx: true, ex: ttlSeconds });
      return stored === "OK";
    } catch (err) {
      console.error("[once] Redis xatosi, xotiradagi zaxiraga o'tildi:", err);
    }
  }

  const now = Date.now();
  // Muddati o'tganlarini tozalaymiz — jadval cheksiz o'smasin.
  if (usedOnce.size > 5_000) {
    for (const [stored, expires] of usedOnce) {
      if (expires <= now) usedOnce.delete(stored);
    }
  }

  const expires = usedOnce.get(namespaced);
  if (expires !== undefined && expires > now) return false;

  usedOnce.set(namespaced, now + ttlSeconds * 1000);
  return true;
}

/** Limitdan oshganda tashlanadigan xato — action'lar shuni ushlab foydalanuvchiga ko'rsatadi. */
export class RateLimitError extends Error {
  constructor(message = "Juda ko'p so'rov yubordingiz. Biroz kutib, qayta urinib ko'ring.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Limitdan oshsa `RateLimitError` tashlaydi. */
export async function enforceLimit(kind: LimitKind, identifier: string) {
  if (!(await checkLimit(kind, identifier))) throw new RateLimitError();
}

/**
 * Limitni tekshiradi va oshib ketilgan bo'lsa foydalanuvchiga ko'rsatiladigan
 * `{ ok: false, error }` qaytaradi, aks holda `null`.
 *
 * `enforceLimit`dan farqi — xato TASHLAMAYDI. Umumiy `try/catch` bilan
 * o'ralmagan action'lar uchun qulay: `const l = await limitGuard(...); if (l) return l;`
 */
export async function limitGuard(
  kind: LimitKind,
  identifier: string,
): Promise<{ ok: false; error: string } | null> {
  if (await checkLimit(kind, identifier)) return null;
  return { ok: false, error: new RateLimitError().message };
}

/**
 * Route handler uchun IP bo'yicha cheklov. Limitdan oshsa 429 `Response`
 * qaytaradi, aks holda `null` — chaqiruvchi shuni tekshirib davom etadi.
 */
export async function authRateLimit(request: Request): Promise<Response | null> {
  if (await checkLimit("auth", requestIp(request))) return null;
  return Response.json(
    { error: "Juda ko'p urinish. Biroz kutib, qayta urinib ko'ring." },
    { status: 429 },
  );
}
