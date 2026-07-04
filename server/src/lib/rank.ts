import { asc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { ranks as ranksTable } from '../db/schema.js'

type Rank = typeof ranksTable.$inferSelect

// Ranks jadvali seed'dan keyin o'zgarmaydi — bir marta o'qib kesh qilamiz.
let cache: Rank[] | null = null

export async function getRanks(): Promise<Rank[]> {
  if (!cache) {
    cache = await db.select().from(ranksTable).orderBy(asc(ranksTable.minXp))
  }
  return cache
}

// Test/seed'dan keyin keshni tozalash uchun
export function clearRankCache() {
  cache = null
}

// Berilgan XP uchun eng mos (eng yuqori minXp <= xp) darajani qaytaradi.
export async function rankForXp(xp: number): Promise<Rank | null> {
  const rs = await getRanks()
  let current: Rank | null = null
  for (const r of rs) {
    if (xp >= r.minXp) current = r
  }
  return current ?? rs[0] ?? null
}
