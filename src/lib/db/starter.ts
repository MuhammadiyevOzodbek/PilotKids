import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user,
  course,
  lesson,
  badge,
  enrollment,
  lessonProgress,
  userBadge,
  certificate,
  notification,
  dailyActivity,
  userSettings,
  chatMessage,
} from "@/lib/db/schema";
import { featured, detailLessons, certs, weekActivity, chatMsgs } from "@/lib/data";

/**
 * Yangi ro'yxatdan o'tgan foydalanuvchiga boshlang'ich ma'lumot beradi:
 * enrollment, dars progressi, nishonlar, sertifikatlar, faollik, sozlamalar.
 * Auth'ning `user.create.after` hook'idan chaqiriladi. Xatoni yutadi (signup buzilmasin).
 */
export async function seedUserData(userId: string): Promise<void> {
  try {
    // Idempotentlik: allaqachon seed qilingan bo'lsa qaytamiz (dublikatlarning oldini oladi).
    const already = await db
      .select({ id: certificate.id })
      .from(certificate)
      .where(eq(certificate.userId, userId))
      .limit(1);
    if (already.length) return;

    // Boshlang'ich XP/streak/level — dizayndagi profil holatiga mos
    await db.update(user).set({ xp: 1240, streak: 28, level: 4 }).where(eq(user.id, userId));

    const courses = await db.select().from(course).orderBy(asc(course.sortOrder));
    const pctByTitle = new Map(featured.map((f) => [f.title, parseInt(f.pct) || 0]));

    // Enrollment — har bir kursga dizayndagi foiz bilan
    if (courses.length) {
      await db
        .insert(enrollment)
        .values(
          courses.map((c) => ({
            userId,
            courseId: c.id,
            progressPercent: pctByTitle.get(c.title) ?? 0,
          })),
        )
        .onConflictDoNothing();
    }

    // Dars progressi — birinchi kurs darslari uchun (done/current/locked)
    const mainCourse = courses[0];
    if (mainCourse) {
      const lessons = await db
        .select()
        .from(lesson)
        .where(eq(lesson.courseId, mainCourse.id))
        .orderBy(asc(lesson.sortOrder));
      const stateByOrder = new Map(detailLessons.map((l) => [l.n, l.state]));
      if (lessons.length) {
        await db
          .insert(lessonProgress)
          .values(
            lessons.map((l) => ({
              userId,
              lessonId: l.id,
              status: stateByOrder.get(l.sortOrder) ?? "locked",
              completedAt: stateByOrder.get(l.sortOrder) === "done" ? new Date() : null,
            })),
          )
          .onConflictDoNothing();
      }
    }

    // Nishonlar — birinchi 5 tasi olingan (dizayndagidek)
    const allBadges = await db.select().from(badge).orderBy(asc(badge.sortOrder));
    const earned = allBadges.slice(0, 5);
    if (earned.length) {
      await db
        .insert(userBadge)
        .values(earned.map((b) => ({ userId, badgeId: b.id })))
        .onConflictDoNothing();
    }

    // Sertifikatlar
    const courseIdByTitle = new Map(courses.map((c) => [c.title, c.id]));
    await db.insert(certificate).values(
      certs.map((c, i) => ({
        userId,
        courseId: courseIdByTitle.get(c.title) ?? null,
        title: c.title,
        color: c.color,
        soft: c.soft,
        state: c.state,
        issuedLabel: c.date,
        sortOrder: i,
      })),
    );

    // Bildirishnomalar
    await db.insert(notification).values([
      { userId, message: "Yangi nishon: Quiz Master 🎉", read: false },
      { userId, message: "Robototexnika 101 kursida 2-dars ochildi", read: false },
      { userId, message: "28 kunlik streak! Zo'r ketyapsiz 🔥", read: true },
    ]);

    // Haftalik faollik (ota-ona paneli grafigi)
    await db
      .insert(dailyActivity)
      .values(weekActivity.map((w, i) => ({ userId, weekday: i, minutes: Math.round(w.h * 1.2) })))
      .onConflictDoNothing();

    // AI Tutor boshlang'ich suhbati
    const base = Date.now();
    await db.insert(chatMessage).values(
      chatMsgs.map((m, i) => ({
        userId,
        role: m.who,
        text: m.text,
        createdAt: new Date(base + i * 1000),
      })),
    );

    // Sozlamalar
    await db.insert(userSettings).values({ userId }).onConflictDoNothing();
  } catch (err) {
    console.error("seedUserData xatosi:", err);
  }
}
