import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { certificate, notification, userSettings } from "@/lib/db/schema";

/**
 * Yangi ro'yxatdan o'tgan foydalanuvchini ishga tayyorlaydi.
 *
 * MUHIM: bu yerda HECH QANDAY soxta progress berilmaydi — bola noldan
 * boshlaydi (0 XP, 0 streak, 1-daraja, 0% progress, nishonsiz). Har bir XP,
 * nishon va sertifikat faqat haqiqiy harakat orqali qo'lga kiritiladi
 * (`src/lib/actions/learning.ts`).
 *
 * Bu yerda faqat user sozlamalari va xush kelibsiz bildirishnomasi yaratiladi.
 * Kurs/test kontenti admin paneldan qo'shiladi; yangi user hech qanday kursga
 * avtomatik yozilmaydi.
 *
 * Auth'ning `user.create.after` hook'idan chaqiriladi.
 * Xatoni yutadi — seed muvaffaqiyatsiz bo'lsa ham signup buzilmasin.
 */
export async function seedUserData(userId: string): Promise<void> {
  try {
    // Idempotentlik: allaqachon tayyorlangan bo'lsa qaytamiz.
    const already = await db
      .select({ id: certificate.id })
      .from(certificate)
      .where(eq(certificate.userId, userId))
      .limit(1);
    if (already.length) return;

    // Bitta haqiqiy xush kelibsiz xabari.
    await db.insert(notification).values({
      userId,
      message:
        "PilotKids'ga xush kelibsiz! Kurslar admin tomonidan qo'shilgach shu yerda ko'rinadi.",
      read: false,
    });

    await db.insert(userSettings).values({ userId }).onConflictDoNothing();
  } catch (err) {
    console.error("seedUserData xatosi:", err);
  }
}
