import { rankForXp } from './rank.js'
import { users } from '../db/schema.js'

type UserRow = typeof users.$inferSelect

// Ism'dan initsiallar: "Sardor Karimov" -> "SK" (frontend avatar uchun)
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Frontend AuthContext/Dashboard kutgan foydalanuvchi shakli.
// passwordHash HECH QACHON qaytarilmaydi.
export async function toUserDTO(row: UserRow) {
  const rank = await rankForXp(row.xp)
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatarUrl,
    xp: row.xp,
    rank: rank?.name ?? 'Junior Engineer',
    isPremium: row.isPremium,
  }
}
