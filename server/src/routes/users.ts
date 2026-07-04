import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { jsonValidator } from '../lib/validate.js'
import { updateProfileSchema, changePasswordSchema } from '../validations/schemas.js'
import { hashPassword, verifyPassword } from '../lib/hash.js'
import { toUserDTO } from '../lib/dto.js'
import type { AppEnv } from '../types.js'

const app = new Hono<AppEnv>()

// Barcha /api/users/* route'lari himoyalangan
app.use('*', authMiddleware)

async function loadUser(userId: number) {
  const found = await db.select().from(users).where(eq(users.id, userId))
  const user = found[0]
  if (!user) throw new HTTPException(404, { message: 'Foydalanuvchi topilmadi' })
  return user
}

// GET /api/users/profile
app.get('/profile', async (c) => {
  const user = await loadUser(c.get('userId'))
  return c.json({ user: await toUserDTO(user) })
})

// PATCH /api/users/profile
app.patch('/profile', jsonValidator(updateProfileSchema), async (c) => {
  const userId = c.get('userId')
  const { name, avatarUrl } = c.req.valid('json')

  const patch: { name?: string; avatarUrl?: string | null } = {}
  if (name !== undefined) patch.name = name
  if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl

  const updated = await db.update(users).set(patch).where(eq(users.id, userId)).returning()
  const user = updated[0]
  if (!user) throw new HTTPException(404, { message: 'Foydalanuvchi topilmadi' })
  return c.json({ user: await toUserDTO(user) })
})

// PATCH /api/users/password
app.patch('/password', jsonValidator(changePasswordSchema), async (c) => {
  const userId = c.get('userId')
  const { currentPassword, newPassword } = c.req.valid('json')

  const user = await loadUser(userId)
  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) throw new HTTPException(401, { message: 'Joriy parol noto\'g\'ri' })

  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
  return c.json({ success: true })
})

export default app
