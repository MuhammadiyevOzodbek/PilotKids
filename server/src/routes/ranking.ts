import { Hono } from 'hono'
import { desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { rankForXp } from '../lib/rank.js'
import { initials } from '../lib/dto.js'
import type { AppEnv } from '../types.js'

const app = new Hono<AppEnv>()

// GET /api/ranking — XP bo'yicha top 10 (Ranking sahifasi kutgan shakl)
app.get('/', async (c) => {
  const top = await db.select().from(users).orderBy(desc(users.xp)).limit(10)

  const leaderboard = await Promise.all(
    top.map(async (u) => {
      const rank = await rankForXp(u.xp)
      return {
        id: u.id,
        name: u.name,
        xp: u.xp,
        weeklyXp: u.weeklyXp,
        badges: u.badges,
        rank: rank?.name ?? 'Junior Engineer',
        avatar: initials(u.name),
      }
    })
  )

  return c.json({ leaderboard })
})

export default app
