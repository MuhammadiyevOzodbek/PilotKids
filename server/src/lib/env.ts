import 'dotenv/config'

// Muhit o'zgaruvchilari markaziy joyda. DATABASE_URL/JWT_SECRET boot paytida
// bo'sh bo'lishi mumkin (Phase 0 skelet ishga tushishi uchun) — ularni talab
// qiladigan modullar `requireDatabaseUrl()` / `requireJwtSecret()` orqali
// aniq xato bilan tekshiradi.
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  PORT: Number(process.env.PORT ?? 8787),
  // Ruxsat etilgan frontend origin(lar). CORS_ORIGIN va FRONTEND_URL ikkalasi
  // ham qo'llab-quvvatlanadi (vergul bilan bir nechta qiymat) — Railway'da
  // FRONTEND_URL qo'yiladi, lokalda default localhost:5173.
  CORS_ORIGIN: [
    ...(process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
    ...(process.env.FRONTEND_URL ?? '').split(','),
  ]
    .map((s) => s.trim())
    .filter(Boolean),
}

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL sozlanmagan. server/.env fayliga Neon connection string qo\'shing.'
    )
  }
  return env.DATABASE_URL
}

export function requireJwtSecret(): string {
  if (!env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET sozlanmagan. server/.env fayliga uzun tasodifiy kalit qo\'shing.'
    )
  }
  return env.JWT_SECRET
}
