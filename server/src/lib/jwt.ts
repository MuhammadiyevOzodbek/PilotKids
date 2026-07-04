import { sign, verify } from 'hono/jwt'
import { requireJwtSecret } from './env.js'

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 kun

export type TokenPayload = {
  sub: number
  email: string
  iat: number
  exp: number
}

const ALG = 'HS256'

export async function signToken(userId: number, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    { sub: userId, email, iat: now, exp: now + TOKEN_TTL_SECONDS },
    requireJwtSecret(),
    ALG
  )
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  // Yaroqsiz yoki muddati o'tgan bo'lsa xato tashlaydi
  return (await verify(token, requireJwtSecret(), ALG)) as unknown as TokenPayload
}
