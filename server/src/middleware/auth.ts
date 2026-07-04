import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verifyToken } from '../lib/jwt.js'
import type { AppEnv } from '../types.js'

// Himoyalangan route'lar uchun — yaroqli Bearer token talab qiladi, aks holda 401.
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Avtorizatsiya talab qilinadi' })
  }
  try {
    const payload = await verifyToken(header.slice(7))
    c.set('userId', Number(payload.sub))
    c.set('userEmail', payload.email)
  } catch {
    throw new HTTPException(401, { message: 'Token yaroqsiz yoki muddati o\'tgan' })
  }
  await next()
})

// Ixtiyoriy auth — token bo'lsa userId o'rnatiladi, bo'lmasa ham davom etadi
// (masalan kurslar ro'yxati: kirmagan user ko'radi, kirgan user progress bilan).
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = await verifyToken(header.slice(7))
      c.set('userId', Number(payload.sub))
      c.set('userEmail', payload.email)
    } catch {
      // yaroqsiz token — jimgina anonim sifatida davom etadi
    }
  }
  await next()
})
