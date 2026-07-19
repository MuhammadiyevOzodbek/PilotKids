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
};

export type LimitKind = keyof typeof limiters;

/** So'rov IP manzili (proxy sarlavhalari orqali). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "anon";
}

/**
 * Limitni tekshiradi. Ruxsat bo'lsa `true`.
 * `identifier` — odatda userId (kirgan foydalanuvchi uchun) yoki IP.
 */
export async function checkLimit(kind: LimitKind, identifier: string): Promise<boolean> {
  const limiter = limiters[kind];
  if (!limiter) return true; // Redis sozlanmagan — dev rejimida o'tkazamiz
  try {
    const { success } = await limiter.limit(identifier);
    return success;
  } catch (err) {
    // Redis ishlamay qolsa saytni to'xtatmaymiz, lekin logga yozamiz.
    console.error("[rate-limit] xato:", err);
    return true;
  }
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
