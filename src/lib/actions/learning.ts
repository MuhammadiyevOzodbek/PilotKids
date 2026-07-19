"use server";

import { revalidatePath } from "next/cache";
import { eq, and, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user,
  course,
  lesson,
  lessonProgress,
  lessonNote,
  enrollment,
  quizQuestion,
  quizAttempt,
  labProgress,
  notification,
  certificate,
  badge,
  userBadge,
  dailyActivity,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { enforceLimit, RateLimitError } from "@/lib/rate-limit";
import { uuidSchema, quizAnswerSchema, noteSchema, firstError } from "@/lib/validation";
import { z } from "zod";

/* ─────────────────────────── Yordamchilar ─────────────────────────── */

/** Har 500 XP — bitta daraja. */
function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

type Fail = { ok: false; error: string };
type Ok<T> = { ok: true } & T;

function fail(error: string): Fail {
  return { ok: false, error };
}

/** Action'larni umumiy xato ishlovi bilan o'raydi. */
async function guard<T>(fn: () => Promise<Ok<T> | Fail>): Promise<Ok<T> | Fail> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof RateLimitError) return fail(err.message);
    // `redirect()` Next.js ichida xato sifatida tashlanadi — uni o'tkazib yuboramiz.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[action] xato:", err);
    return fail("Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.");
  }
}

/**
 * XP qo'shadi, darajani qayta hisoblaydi, streak va kunlik faollikni yangilaydi.
 * Daraja oshsa bildirishnoma yaratadi.
 */
async function awardXp(userId: string, amount: number, minutes = 0) {
  const [current] = await db
    .select({
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      lastActiveAt: user.lastActiveAt,
    })
    .from(user)
    .where(eq(user.id, userId));
  if (!current) return { xp: 0, level: 1, leveledUp: false };

  // Streak: kecha faol bo'lgan bo'lsa +1, bugun bo'lsa o'zgarmaydi, aks holda 1.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = current.lastActiveAt ? new Date(current.lastActiveAt) : null;
  if (last) last.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  let streak = current.streak;
  if (!last) streak = 1;
  else if (last.getTime() === today.getTime()) streak = current.streak;
  else if (today.getTime() - last.getTime() === dayMs) streak = current.streak + 1;
  else streak = 1;

  // XP va daraja SQL ifodasi bilan yangilanadi — parallel so'rovlar bir-birining
  // natijasini bosib ketmaydi (lost update'ning oldini oladi).
  const [updated] = await db
    .update(user)
    .set({
      xp: sql`${user.xp} + ${amount}`,
      level: sql`greatest(1, floor((${user.xp} + ${amount}) / 500) + 1)`,
      streak,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning({ xp: user.xp, level: user.level });

  const newXp = updated?.xp ?? current.xp + amount;
  const newLevel = updated?.level ?? levelFromXp(newXp);
  const leveledUp = newLevel > current.level;

  if (minutes > 0) {
    // JS'da 0=Yakshanba; bizda 0=Dushanba.
    const weekday = (new Date().getDay() + 6) % 7;
    await db
      .insert(dailyActivity)
      .values({ userId, weekday, minutes })
      .onConflictDoUpdate({
        target: [dailyActivity.userId, dailyActivity.weekday],
        set: { minutes: sql`${dailyActivity.minutes} + ${minutes}` },
      });
  }

  if (leveledUp) {
    await db.insert(notification).values({
      userId,
      message: `Tabriklaymiz! Siz ${newLevel}-darajaga ko'tarildingiz 🎉`,
    });
  }

  return { xp: newXp, level: newLevel, leveledUp };
}

/** Kurs progressini tugallangan darslar soniga qarab qayta hisoblaydi. */
async function recalcCourseProgress(userId: string, courseId: string) {
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(lesson)
    .where(eq(lesson.courseId, courseId));
  const [{ value: done }] = await db
    .select({ value: count() })
    .from(lessonProgress)
    .innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lesson.courseId, courseId),
        eq(lessonProgress.status, "done"),
      ),
    );

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const finished = total > 0 && done === total;

  await db
    .update(enrollment)
    .set({ progressPercent: percent, completedAt: finished ? new Date() : null })
    .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)));

  // Kurs tugallandi — sertifikatni ochamiz.
  if (finished) {
    await db
      .update(certificate)
      .set({ state: "done", issuedLabel: `Berildi: ${new Date().toLocaleDateString("uz-UZ")}` })
      .where(and(eq(certificate.userId, userId), eq(certificate.courseId, courseId)));

    const [c] = await db
      .select({ title: course.title })
      .from(course)
      .where(eq(course.id, courseId));
    await db.insert(notification).values({
      userId,
      message: `"${c?.title ?? "Kurs"}" kursini tamomladingiz! Sertifikatingiz tayyor 🏆`,
    });
  } else {
    await db
      .update(certificate)
      .set({ state: "progress", issuedLabel: `${percent}% tugallandi` })
      .where(
        and(
          eq(certificate.userId, userId),
          eq(certificate.courseId, courseId),
          eq(certificate.state, "locked"),
        ),
      );
  }

  return { percent, finished };
}

/** Shart bajarilgan nishonlarni beradi (takrorlanmaydi). */
async function grantBadgeIfMissing(userId: string, slug: string) {
  const [b] = await db
    .select({ id: badge.id, name: badge.name })
    .from(badge)
    .where(eq(badge.slug, slug));
  if (!b) return;
  const existing = await db
    .select({ userId: userBadge.userId })
    .from(userBadge)
    .where(and(eq(userBadge.userId, userId), eq(userBadge.badgeId, b.id)))
    .limit(1);
  if (existing.length) return;
  await db.insert(userBadge).values({ userId, badgeId: b.id });
  await db.insert(notification).values({
    userId,
    message: `Yangi nishon qo'lga kiritildi: ${b.name} 🏅`,
  });
}

/* ─────────────────────────── Actions ─────────────────────────── */

/** Kursga yozilish. */
export async function enrollCourse(courseId: string) {
  return guard(async () => {
    const u = await requireUser();
    await enforceLimit("write", u.id);

    const parsed = uuidSchema.safeParse(courseId);
    if (!parsed.success) return fail(firstError(parsed.error));

    const [c] = await db
      .select({ id: course.id, title: course.title, color: course.color, soft: course.soft })
      .from(course)
      .where(eq(course.id, parsed.data));
    if (!c) return fail("Bunday kurs topilmadi");

    await db
      .insert(enrollment)
      .values({ userId: u.id, courseId: c.id, progressPercent: 0 })
      .onConflictDoNothing();

    // Kursning birinchi darsini ochamiz.
    const [first] = await db
      .select({ id: lesson.id })
      .from(lesson)
      .where(eq(lesson.courseId, c.id))
      .orderBy(lesson.sortOrder)
      .limit(1);
    if (first) {
      await db
        .insert(lessonProgress)
        .values({ userId: u.id, lessonId: first.id, status: "current" })
        .onConflictDoNothing();
    }

    // Kurs uchun sertifikat yozuvi (hali qulflangan holatda).
    await db
      .insert(certificate)
      .values({
        userId: u.id,
        courseId: c.id,
        title: c.title,
        color: c.color,
        soft: c.soft,
        state: "locked",
        issuedLabel: "Kursni tugating",
      })
      .onConflictDoNothing();

    revalidatePath("/courses");
    revalidatePath("/dashboard");
    revalidatePath("/certificates");
    return { ok: true as const, enrolled: true };
  });
}

/** Darsni tugallangan deb belgilash — XP serverda beriladi. */
export async function completeLesson(lessonId: string) {
  return guard(async () => {
    const u = await requireUser();
    await enforceLimit("write", u.id);

    const parsed = uuidSchema.safeParse(lessonId);
    if (!parsed.success) return fail(firstError(parsed.error));

    const [l] = await db
      .select({
        id: lesson.id,
        courseId: lesson.courseId,
        xpReward: lesson.xpReward,
        durationMin: lesson.durationMin,
        sortOrder: lesson.sortOrder,
      })
      .from(lesson)
      .where(eq(lesson.id, parsed.data));
    if (!l) return fail("Dars topilmadi");

    // Faqat yozilgan kurs darsini tugatish mumkin.
    const [enr] = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(and(eq(enrollment.userId, u.id), eq(enrollment.courseId, l.courseId)));
    if (!enr) return fail("Avval kursga yoziling");

    // Allaqachon tugallangan bo'lsa XP qayta berilmaydi.
    const [existing] = await db
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, u.id), eq(lessonProgress.lessonId, l.id)));
    if (existing?.status === "done") {
      return { ok: true as const, alreadyDone: true, xpGained: 0, leveledUp: false };
    }

    await db
      .insert(lessonProgress)
      .values({ userId: u.id, lessonId: l.id, status: "done", completedAt: new Date() })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: { status: "done", completedAt: new Date() },
      });

    // Keyingi darsni "current" qilamiz.
    const [next] = await db
      .select({ id: lesson.id })
      .from(lesson)
      .where(and(eq(lesson.courseId, l.courseId), sql`${lesson.sortOrder} > ${l.sortOrder}`))
      .orderBy(lesson.sortOrder)
      .limit(1);
    if (next) {
      await db
        .insert(lessonProgress)
        .values({ userId: u.id, lessonId: next.id, status: "current" })
        .onConflictDoNothing();
    }

    const award = await awardXp(u.id, l.xpReward, l.durationMin);
    const progress = await recalcCourseProgress(u.id, l.courseId);

    // Birinchi tugallangan dars uchun nishon.
    const [{ value: doneCount }] = await db
      .select({ value: count() })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, u.id), eq(lessonProgress.status, "done")));
    if (doneCount === 1) await grantBadgeIfMissing(u.id, "birinchi-qadam");
    if (progress.finished) await grantBadgeIfMissing(u.id, "robot-quruvchi");

    revalidatePath("/lesson");
    revalidatePath("/dashboard");
    revalidatePath("/courses");
    revalidatePath("/certificates");
    revalidatePath("/profile");

    return {
      ok: true as const,
      alreadyDone: false,
      xpGained: l.xpReward,
      leveledUp: award.leveledUp,
      nextLessonId: next?.id ?? null,
      courseFinished: progress.finished,
    };
  });
}

/**
 * Quiz javobini yuborish.
 * To'g'ri javob indeksi klientga HECH QACHON yuborilmaydi — solishtirish shu yerda.
 */
export async function submitQuizAnswer(questionId: string, selectedIndex: number) {
  return guard(async () => {
    const u = await requireUser();
    await enforceLimit("write", u.id);

    const parsed = quizAnswerSchema.safeParse({ questionId, selectedIndex });
    if (!parsed.success) return fail(firstError(parsed.error));

    const [q] = await db
      .select({
        id: quizQuestion.id,
        courseId: quizQuestion.courseId,
        correctIndex: quizQuestion.correctIndex,
        options: quizQuestion.options,
      })
      .from(quizQuestion)
      .where(eq(quizQuestion.id, parsed.data.questionId));
    if (!q) return fail("Savol topilmadi");
    if (parsed.data.selectedIndex >= q.options.length) return fail("Bunday variant yo'q");

    // Savol biror kursga tegishli bo'lsa — faqat o'sha kursga yozilganlar javob bera oladi.
    if (q.courseId) {
      const [enr] = await db
        .select({ id: enrollment.id })
        .from(enrollment)
        .where(and(eq(enrollment.userId, u.id), eq(enrollment.courseId, q.courseId)));
      if (!enr) return fail("Avval shu kursga yoziling");
    }

    const correct = parsed.data.selectedIndex === q.correctIndex;

    // Bir savolga faqat birinchi urinish hisobga olinadi (XP farming'ning oldini oladi).
    const [prev] = await db
      .select({ id: quizAttempt.id })
      .from(quizAttempt)
      .where(and(eq(quizAttempt.userId, u.id), eq(quizAttempt.questionId, q.id)));

    if (!prev) {
      await db.insert(quizAttempt).values({
        userId: u.id,
        questionId: q.id,
        selectedIndex: parsed.data.selectedIndex,
        correct,
      });
      if (correct) await awardXp(u.id, 10);
    }

    // Barcha savollarga to'g'ri javob berilgan bo'lsa — nishon.
    if (correct) {
      const [{ value: totalQ }] = await db.select({ value: count() }).from(quizQuestion);
      const [{ value: correctA }] = await db
        .select({ value: count() })
        .from(quizAttempt)
        .where(and(eq(quizAttempt.userId, u.id), eq(quizAttempt.correct, true)));
      if (totalQ > 0 && correctA >= totalQ) await grantBadgeIfMissing(u.id, "quiz-master");
    }

    revalidatePath("/quiz");
    revalidatePath("/dashboard");

    return {
      ok: true as const,
      correct,
      correctIndex: q.correctIndex, // javob berilgandan KEYIN oshkor qilinadi
      xpGained: !prev && correct ? 10 : 0,
      alreadyAnswered: Boolean(prev),
    };
  });
}

/** Dars eslatmasini saqlash. */
export async function saveLessonNote(lessonId: string, body: string) {
  return guard(async () => {
    const u = await requireUser();
    await enforceLimit("write", u.id);

    const id = uuidSchema.safeParse(lessonId);
    const text = noteSchema.safeParse(body);
    if (!id.success) return fail(firstError(id.error));
    if (!text.success) return fail(firstError(text.error));

    const [l] = await db
      .select({ id: lesson.id, courseId: lesson.courseId })
      .from(lesson)
      .where(eq(lesson.id, id.data));
    if (!l) return fail("Dars topilmadi");

    // `completeLesson` bilan bir xil qoida — faqat yozilgan kurs darsiga eslatma.
    const [enr] = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(and(eq(enrollment.userId, u.id), eq(enrollment.courseId, l.courseId)));
    if (!enr) return fail("Avval kursga yoziling");

    await db
      .insert(lessonNote)
      .values({ userId: u.id, lessonId: id.data, body: text.data })
      .onConflictDoUpdate({
        target: [lessonNote.userId, lessonNote.lessonId],
        set: { body: text.data },
      });

    revalidatePath("/lesson");
    return { ok: true as const, saved: true };
  });
}

/** Lab loyihasini boshlash yoki tugatish. */
export async function setLabProjectStatus(projectId: string, status: "started" | "done") {
  return guard(async () => {
    const u = await requireUser();
    await enforceLimit("write", u.id);

    const id = uuidSchema.safeParse(projectId);
    const st = z.enum(["started", "done"]).safeParse(status);
    if (!id.success) return fail(firstError(id.error));
    if (!st.success) return fail("Noto'g'ri holat");

    const [existing] = await db
      .select({ status: labProgress.status })
      .from(labProgress)
      .where(and(eq(labProgress.userId, u.id), eq(labProgress.projectId, id.data)));

    // Tugallangan loyihani "started"ga qaytarib bo'lmaydi — aks holda
    // done → started → done sikli bilan XP cheksiz yig'ilardi.
    if (existing?.status === "done") {
      return { ok: true as const, status: "done" as const };
    }

    await db
      .insert(labProgress)
      .values({
        userId: u.id,
        projectId: id.data,
        status: st.data,
        completedAt: st.data === "done" ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [labProgress.userId, labProgress.projectId],
        set: { status: st.data, completedAt: st.data === "done" ? new Date() : null },
      });

    // Loyiha birinchi marta tugallanganda XP (yuqoridagi qaytish sharti
    // tufayli bu blok har loyiha uchun faqat bir marta ishlaydi).
    if (st.data === "done") {
      await awardXp(u.id, 60, 20);
      await grantBadgeIfMissing(u.id, "kod-ustasi");
    }

    revalidatePath("/lab");
    revalidatePath("/dashboard");
    return { ok: true as const, status: st.data };
  });
}
