import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, ranks, users } from "@/lib/db";
import { computeRankInfo } from "@/lib/db/queries";

/**
 * Foydalanuvchiga XP qo'shadi (yoki manfiy qiymat bilan ayiradi) va darajani
 * qayta hisoblaydi. XP hech qachon 0 dan past bo'lmaydi.
 *
 * Inkrement DB tomonida atomik bajariladi (`xp = xp + n`), shuning uchun bir
 * vaqtda kelgan yozuvlar bir-birini yo'qotmaydi (lost-update yo'q). Yangi
 * qiymatga qarab daraja alohida qadamda yangilanadi.
 */
export async function applyXp(userId: string, amount: number) {
  // Atomik inkrement — natijada yangi XP qaytadi
  const [updated] = await db
    .update(users)
    .set({
      xp: sql`GREATEST(0, ${users.xp} + ${amount})`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ xp: users.xp });

  if (!updated) return;

  const allRanks = await db.select().from(ranks);
  const { current } = computeRankInfo(updated.xp, allRanks);
  await db
    .update(users)
    .set({ rankId: current?.id ?? null })
    .where(eq(users.id, userId));
}
