"use server";

import { revalidatePath } from "next/cache";
import { eq, and, count, ne, sql } from "drizzle-orm";
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
  labProject,
  labProgress,
  notification,
  certificate,
  badge,
  userBadge,
  dailyActivity,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { dayKey } from "@/lib/day";
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

/** Foydalanuvchining XP hisobi uchun kerakli joriy holati. */
interface XpState {
  xp: number;
  level: number;
  streak: number;
  lastActiveAt: Date | null;
}

async function readXpState(userId: string): Promise<XpState | null> {
  const [row] = await db
    .select({
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      lastActiveAt: user.lastActiveAt,
    })
    .from(user)
    .where(eq(user.id, userId));
  return row ?? null;
}

/**
 * Yangi streak qiymati.
 *
 * Kecha faol bo'lgan bo'lsa +1, bugun bo'lsa o'zgarmaydi, aks holda 1
 * dan boshlanadi. Kun chegarasi Toshkent bo'yicha — server UTC'da
 * ishlashi mumkin va bunda bola uchun "kun" bir necha soatga siljib
 * ketardi.
 */
function nextStreak(current: XpState): number {
  const today = dayKey();
  if (!current.lastActiveAt) return 1;

  const last = dayKey(new Date(current.lastActiveAt));
  if (last === today) return current.streak;

  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  return last === yesterday ? current.streak + 1 : 1;
}

/**
 * Kunlik daqiqalar va daraja oshgani haqidagi xabar.
 *
 * XP berilgani ANIQ bo'lgandan keyin chaqiriladi: bular yordamchi
 * yozuvlar va ular uzilib qolsa hisobga ta'sir qilmaydi.
 */
async function recordActivity(userId: string, minutes: number, newLevel: number | null) {
  const writes = [];

  if (minutes > 0) {
    /*
     * Kun SANASI bo'yicha yoziladi.
     *
     * Ilgari faqat hafta kuni (0..6) saqlanardi va daqiqalar ustiga
     * qo'shilaverardi — ya'ni "dushanba" qatori hech qachon nolga
     * qaytmasdi va bir necha haftadan keyin "bugungi ekran vaqti"
     * o'nlab soatni ko'rsatardi.
     */
    writes.push(
      db
        .insert(dailyActivity)
        .values({ userId, day: dayKey(), minutes })
        .onConflictDoUpdate({
          target: [dailyActivity.userId, dailyActivity.day],
          set: { minutes: sql`${dailyActivity.minutes} + ${minutes}` },
        }),
    );
  }

  if (newLevel !== null) {
    writes.push(
      db.insert(notification).values({
        userId,
        message: `Tabriklaymiz! Siz ${newLevel}-darajaga ko'tarildingiz 🎉`,
      }),
    );
  }

  if (writes.length === 1) await writes[0];
  else if (writes.length > 1) await db.batch([writes[0]!, ...writes.slice(1)]);
}

/**
 * XP qo'shadi, darajani qayta hisoblaydi, streak va kunlik faollikni yangilaydi.
 * Daraja oshsa bildirishnoma yaratadi.
 *
 * DIQQAT: bu funksiyada takroriy berishdan himoya YO'Q — chaqiruvchi
 * o'zi kafolatlashi kerak (quiz javobi va laboratoriya loyihasi
 * `onConflictDoNothing` / holat tekshiruvi bilan himoyalangan).
 * `completeLesson` esa buni ishlatmaydi: u XP ni dars belgisi bilan
 * bitta tranzaksiyada beradi.
 */
async function awardXp(userId: string, amount: number, minutes = 0) {
  const current = await readXpState(userId);
  if (!current) return { xp: 0, level: 1, leveledUp: false };

  const streak = nextStreak(current);

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

  await recordActivity(userId, minutes, leveledUp ? newLevel : null);

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
    // Yorliq har darsda yangilanadi. Ilgari `state = "locked"` filtri faqat
    // BIRINCHI yangilanishga mos kelib, foiz "20%"da muzlab qolardi. `ne("done")`
    // — tugallanmagan (locked/progress) sertifikat yorlig'ini har safar yangilaydi,
    // "done" holatini esa tegmaydi.
    await db
      .update(certificate)
      .set({ state: "progress", issuedLabel: `${percent}% tugallandi` })
      .where(
        and(
          eq(certificate.userId, userId),
          eq(certificate.courseId, courseId),
          ne(certificate.state, "done"),
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

  const inserted = await db
    .insert(userBadge)
    .values({ userId, badgeId: b.id })
    .onConflictDoNothing()
    .returning({ userId: userBadge.userId });
  if (inserted.length === 0) return;

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

    // Kursning birinchi darsi — uni ochish uchun kerak.
    const [first] = await db
      .select({ id: lesson.id })
      .from(lesson)
      .where(eq(lesson.courseId, c.id))
      .orderBy(lesson.sortOrder)
      .limit(1);

    /*
     * Uchala yozuv BIRGA bajariladi.
     *
     * Ilgari ular ketma-ket uchta alohida so'rov edi. Ikkinchisida
     * uzilish bo'lsa foydalanuvchi kursga yozilgan, lekin birorta dars
     * "current" emas holatda qolardi — va qayta "yozilish" bosilsa
     * `onConflictDoNothing` hech narsa qilmasdi. Ya'ni bola kursga
     * kirgan, lekin uni BOSHLAY OLMASDI va bu holatdan o'zi chiqa
     * olmasdi. Uchinchisi tushib qolsa esa kurs tugaganda sertifikat
     * "done" bo'la olmasdi.
     */
    const writes = [
      db
        .insert(enrollment)
        .values({ userId: u.id, courseId: c.id, progressPercent: 0 })
        .onConflictDoNothing(),
      // Kurs uchun sertifikat yozuvi (hali qulflangan holatda).
      db
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
        .onConflictDoNothing(),
    ] as const;

    if (first) {
      await db.batch([
        ...writes,
        db
          .insert(lessonProgress)
          .values({ userId: u.id, lessonId: first.id, status: "current" })
          .onConflictDoNothing(),
      ]);
    } else {
      await db.batch([...writes]);
    }

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

    // Faqat ochilgan dars bajariladi: route/action'ni qo'lda chaqirib keyingi
    // darslarni sakrab o'tish mumkin bo'lmasin.
    const [existing] = await db
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, u.id), eq(lessonProgress.lessonId, l.id)));
    if (existing?.status === "done") {
      return { ok: true as const, alreadyDone: true, xpGained: 0, leveledUp: false };
    }
    if (existing?.status !== "current") {
      return fail("Bu dars hali ochilmagan");
    }

    // Keyingi dars — uni ochish shu bilan bitta tranzaksiyaga kiradi.
    const [next] = await db
      .select({ id: lesson.id })
      .from(lesson)
      .where(and(eq(lesson.courseId, l.courseId), sql`${lesson.sortOrder} > ${l.sortOrder}`))
      .orderBy(lesson.sortOrder)
      .limit(1);

    /*
     * XP va dars holati BITTA tranzaksiyada.
     *
     * Ilgari bular ketma-ket to'rtta alohida so'rov edi. Dars "done"
     * bo'lgandan keyin XP beruvchi so'rov uzilsa, keyingi urinishda
     * tizim "allaqachon bajarilgan" deb 0 XP qaytarardi va XP ABADIY
     * yo'qolardi. Keyingi darsni ochuvchi so'rov tushib qolsa esa kurs
     * o'sha yerda to'xtab qolardi.
     *
     * Ikki himoya bir vaqtda ishlaydi:
     *   `xp_awarded = false` sharti — ikki marta XP berilmasin;
     *   XP yangilanishi dars belgisidan OLDIN turadi — u hali
     *   o'zgartirilmagan holatni ko'radi, ya'ni shart to'g'ri ishlaydi.
     *
     * Shu sababli qayta bosish ham, uzilishdan keyingi qayta urinish ham
     * xavfsiz: XP aynan bir marta beriladi.
     */
    const claimable = sql`exists (
      select 1 from ${lessonProgress}
      where ${lessonProgress.userId} = ${u.id}
        and ${lessonProgress.lessonId} = ${l.id}
        and ${lessonProgress.status} = 'current'
        and ${lessonProgress.xpAwarded} = false
    )`;

    const current = await readXpState(u.id);
    if (!current) return fail("Foydalanuvchi topilmadi");

    const streak = nextStreak(current);
    const now = new Date();

    const statements = [
      db
        .update(user)
        .set({
          xp: sql`${user.xp} + ${l.xpReward}`,
          level: sql`greatest(1, floor((${user.xp} + ${l.xpReward}) / 500) + 1)`,
          streak,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(and(eq(user.id, u.id), claimable))
        .returning({ xp: user.xp, level: user.level }),
      db
        .update(lessonProgress)
        .set({ status: "done", xpAwarded: true, completedAt: now })
        .where(
          and(
            eq(lessonProgress.userId, u.id),
            eq(lessonProgress.lessonId, l.id),
            eq(lessonProgress.status, "current"),
          ),
        )
        .returning({ id: lessonProgress.id }),
    ] as const;

    const results = next
      ? await db.batch([
          ...statements,
          db
            .insert(lessonProgress)
            .values({ userId: u.id, lessonId: next.id, status: "current" })
            .onConflictDoNothing(),
        ])
      : await db.batch([...statements]);

    const [awarded] = results[0];
    // XP berilmagan bo'lsa — dars allaqachon hisoblangan.
    if (!awarded) {
      return { ok: true as const, alreadyDone: true, xpGained: 0, leveledUp: false };
    }

    const award = {
      xp: awarded.xp,
      level: awarded.level,
      leveledUp: awarded.level > current.level,
    };

    // Daqiqalar va daraja xabari — XP muvaffaqiyatli berilgandan keyin.
    await recordActivity(u.id, l.durationMin, award.leveledUp ? award.level : null);
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
    /*
     * XP o'zgardi — yuqoridagi hisoblagich va reyting ham yangilansin.
     *
     * Header `(app)` layout ichida turadi, layout esa sahifa yo'li bilan
     * yangilanmaydi. Ilgari bola darsni tugatib +40 XP olardi, lekin
     * yuqoridagi raqam va `/leaderboard` eski qiymatda qolardi.
     */
    revalidatePath("/(app)", "layout");
    revalidatePath("/leaderboard");

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
    const insertedAttempt = await db
      .insert(quizAttempt)
      .values({
        userId: u.id,
        questionId: q.id,
        selectedIndex: parsed.data.selectedIndex,
        correct,
      })
      .onConflictDoNothing()
      .returning({ id: quizAttempt.id });
    const firstAttempt = insertedAttempt.length > 0;

    if (firstAttempt) {
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
    /*
     * XP o'zgardi — yuqoridagi hisoblagich va reyting ham yangilansin.
     *
     * Header `(app)` layout ichida turadi, layout esa sahifa yo'li bilan
     * yangilanmaydi. Ilgari bola darsni tugatib +40 XP olardi, lekin
     * yuqoridagi raqam va `/leaderboard` eski qiymatda qolardi.
     */
    revalidatePath("/(app)", "layout");
    revalidatePath("/leaderboard");

    return {
      ok: true as const,
      correct,
      correctIndex: q.correctIndex, // javob berilgandan KEYIN oshkor qilinadi
      xpGained: firstAttempt && correct ? 10 : 0,
      alreadyAnswered: !firstAttempt,
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

    // `completeLesson` bilan bir xil qoida — faqat yozilgan va ochilgan/tugallangan darsga eslatma.
    const [enr] = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(and(eq(enrollment.userId, u.id), eq(enrollment.courseId, l.courseId)));
    if (!enr) return fail("Avval kursga yoziling");

    const [progress] = await db
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, u.id), eq(lessonProgress.lessonId, l.id)))
      .limit(1);
    if (progress?.status !== "current" && progress?.status !== "done") {
      return fail("Bu dars hali ochilmagan");
    }

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

    const [project] = await db
      .select({ id: labProject.id })
      .from(labProject)
      .where(eq(labProject.id, id.data))
      .limit(1);
    if (!project) return fail("Loyiha topilmadi");

    if (st.data === "started") {
      await db
        .insert(labProgress)
        .values({
          userId: u.id,
          projectId: id.data,
          status: "started",
          completedAt: null,
        })
        .onConflictDoNothing();

      revalidatePath("/lab");
      return { ok: true as const, status: "started" as const };
    }

    const completedAt = new Date();
    const inserted = await db
      .insert(labProgress)
      .values({
        userId: u.id,
        projectId: id.data,
        status: "done",
        completedAt,
      })
      .onConflictDoNothing()
      .returning({ id: labProgress.id });

    const updated =
      inserted.length > 0
        ? []
        : await db
            .update(labProgress)
            .set({ status: "done", completedAt })
            .where(
              and(
                eq(labProgress.userId, u.id),
                eq(labProgress.projectId, id.data),
                sql`${labProgress.status} <> 'done'`,
              ),
            )
            .returning({ id: labProgress.id });

    const firstCompletion = inserted.length > 0 || updated.length > 0;

    if (firstCompletion) {
      await awardXp(u.id, 60, 20);
      await grantBadgeIfMissing(u.id, "kod-ustasi");
    }

    revalidatePath("/lab");
    revalidatePath("/dashboard");
    /*
     * XP o'zgardi — yuqoridagi hisoblagich va reyting ham yangilansin.
     *
     * Header `(app)` layout ichida turadi, layout esa sahifa yo'li bilan
     * yangilanmaydi. Ilgari bola darsni tugatib +40 XP olardi, lekin
     * yuqoridagi raqam va `/leaderboard` eski qiymatda qolardi.
     */
    revalidatePath("/(app)", "layout");
    revalidatePath("/leaderboard");
    return { ok: true as const, status: "done" as const };
  });
}
