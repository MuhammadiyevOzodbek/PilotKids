import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { hashPassword, verifyPassword } from '../lib/hash.js'
import { signToken } from '../lib/jwt.js'
import { toUserDTO } from '../lib/dto.js'
import { jsonValidator } from '../lib/validate.js'
import { registerSchema, loginSchema } from '../validations/schemas.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const auth = new Hono<AppEnv>()

// POST /api/auth/register
auth.post('/register', jsonValidator(registerSchema), async (c) => {
  const { name, email, password } = c.req.valid('json')
  const normalizedEmail = email.toLowerCase()

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
  if (existing.length > 0) {
    throw new HTTPException(409, { message: 'Bu email allaqachon ro\'yxatdan o\'tgan' })
  }

  const passwordHash = await hashPassword(password)
  const inserted = await db
    .insert(users)
    .values({ name, email: normalizedEmail, passwordHash })
    .returning()
  const created = inserted[0]
  if (!created) throw new HTTPException(500, { message: 'Foydalanuvchi yaratilmadi' })

  const token = await signToken(created.id, created.email)
  return c.json({ token, user: await toUserDTO(created) }, 201)
})

// POST /api/auth/login
auth.post('/login', jsonValidator(loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const found = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
  const user = found[0]
  // Xato xabari email/parol uchun bir xil — mavjud email'larni oshkor qilmaydi
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HTTPException(401, { message: 'Email yoki parol noto\'g\'ri' })
  }
  const token = await signToken(user.id, user.email)
  return c.json({ token, user: await toUserDTO(user) })
})

// GET /api/auth/me  🔒
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const found = await db.select().from(users).where(eq(users.id, userId))
  const user = found[0]
  if (!user) throw new HTTPException(404, { message: 'Foydalanuvchi topilmadi' })
  return c.json({ user: await toUserDTO(user) })
})

export default auth
