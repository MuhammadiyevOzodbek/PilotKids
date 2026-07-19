import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  course,
  lesson,
  enrollment,
  lessonProgress,
  certificate,
  notification,
  userSettings,
} from "@/lib/db/schema";

/**
 * Yangi ro'yxatdan o'tgan foydalanuvchini ishga tayyorlaydi.
 *
 * MUHIM: bu yerda HECH QANDAY soxta progress berilmaydi — bola noldan
 * boshlaydi (0 XP, 0 streak, 1-daraja, 0% progress, nishonsiz). Har bir XP,
 * nishon va sertifikat faqat haqiqiy harakat orqali qo'lga kiritiladi
 * (`src/lib/actions/learning.ts`).
 *
 * Bu yerda faqat: birinchi kursga yozilish (onboarding), birinchi darsni ochish,
 * kurslar uchun qulflangan sertifikat yozuvlari va xush kelibsiz bildirishnomasi.
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

    const courses = await db.select().from(course).orderBy(asc(course.sortOrder));
    if (!courses.length) return;

    // Birinchi kursga avtomatik yozamiz — bola darhol boshlay olsin (0% dan).
    const firstCourse = courses[0]!;
    await db
      .insert(enrollment)
      .values({ userId, courseId: firstCourse.id, progressPercent: 0 })
      .onConflictDoNothing();

    // Shu kursning birinchi darsi ochiq, qolganlari qulflangan.
    const [firstLesson] = await db
      .select({ id: lesson.id })
      .from(lesson)
      .where(eq(lesson.courseId, firstCourse.id))
      .orderBy(asc(lesson.sortOrder))
      .limit(1);
    if (firstLesson) {
      await db
        .insert(lessonProgress)
        .values({ userId, lessonId: firstLesson.id, status: "current" })
        .onConflictDoNothing();
    }

    // Har bir kurs uchun qulflangan sertifikat yozuvi — kurs tugagach ochiladi.
    await db
      .insert(certificate)
      .values(
        courses.map((c, i) => ({
          userId,
          courseId: c.id,
          title: c.title,
          color: c.color,
          soft: c.soft,
          state: "locked" as const,
          issuedLabel: "Kursni tugating",
          sortOrder: i,
        })),
      )
      .onConflictDoNothing();

    // Bitta haqiqiy xush kelibsiz xabari.
    await db.insert(notification).values({
      userId,
      message: `PilotKids'ga xush kelibsiz! "${firstCourse.title}" kursi siz uchun ochildi 🚀`,
      read: false,
    });

    await db.insert(userSettings).values({ userId }).onConflictDoNothing();
  } catch (err) {
    console.error("seedUserData xatosi:", err);
  }
}
