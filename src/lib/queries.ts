import "server-only";
import { eq, desc, asc, and, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user,
  course,
  category,
  lesson,
  badge,
  labProject,
  quizQuestion,
  enrollment,
  lessonProgress,
  userBadge,
  certificate,
  notification,
  dailyActivity,
  userSettings,
  chatMessage,
  quizAttempt,
  lessonNote,
  labProgress,
} from "@/lib/db/schema";

/* ─────────────────────────── Kontent (umumiy) ─────────────────────────── */

export async function getFeaturedCourses() {
  return db.select().from(course).where(eq(course.featured, true)).orderBy(asc(course.sortOrder));
}

export async function getCategories() {
  return db.select().from(category).orderBy(asc(category.sortOrder));
}

export async function getLabProjects() {
  return db.select().from(labProject).orderBy(asc(labProject.sortOrder));
}

/** Asosiy kurs (birinchi featured) — kurs tafsilotlari sahifasi uchun. */
export async function getMainCourse() {
  const rows = await db.select().from(course).orderBy(asc(course.sortOrder)).limit(1);
  return rows[0] ?? null;
}

/** Kursni slug bo'yicha topish (kategoriya nomi bilan). */
export async function getCourseBySlug(slug: string) {
  const rows = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      icon: course.icon,
      color: course.color,
      soft: course.soft,
      level: course.level,
      totalLessons: course.totalLessons,
      hours: course.hours,
      categoryTitle: category.title,
    })
    .from(course)
    .leftJoin(category, eq(course.categoryId, category.id))
    .where(eq(course.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/** Barcha kurslar — kategoriya nomi va o'quvchilar soni bilan. */
export async function getAllCourses() {
  return db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      icon: course.icon,
      color: course.color,
      soft: course.soft,
      level: course.level,
      totalLessons: course.totalLessons,
      hours: course.hours,
      categorySlug: category.slug,
      categoryTitle: category.title,
      sortOrder: course.sortOrder,
    })
    .from(course)
    .leftJoin(category, eq(course.categoryId, category.id))
    .orderBy(asc(course.sortOrder));
}

/** Kursga yozilgan o'quvchilar soni. */
export async function getCourseStudentCount(courseId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(enrollment)
    .where(eq(enrollment.courseId, courseId));
  return value;
}

/** Bitta darsni kursi bilan birga olish. */
export async function getLessonById(lessonId: string) {
  const rows = await db
    .select({
      id: lesson.id,
      courseId: lesson.courseId,
      sortOrder: lesson.sortOrder,
      title: lesson.title,
      meta: lesson.meta,
      type: lesson.type,
      durationMin: lesson.durationMin,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      xpReward: lesson.xpReward,
      courseTitle: course.title,
      courseSlug: course.slug,
    })
    .from(lesson)
    .innerJoin(course, eq(lesson.courseId, course.id))
    .where(eq(lesson.id, lessonId))
    .limit(1);
  return rows[0] ?? null;
}

/** Foydalanuvchining "davom ettirish" darsi — birinchi tugallanmagan dars. */
export async function getCurrentLesson(userId: string) {
  const rows = await db
    .select({
      id: lesson.id,
      title: lesson.title,
      sortOrder: lesson.sortOrder,
      durationMin: lesson.durationMin,
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      totalLessons: course.totalLessons,
      progressPercent: enrollment.progressPercent,
      status: sql<string>`coalesce(${lessonProgress.status}, 'locked')`,
    })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .innerJoin(lesson, eq(lesson.courseId, course.id))
    .leftJoin(
      lessonProgress,
      and(eq(lessonProgress.lessonId, lesson.id), eq(lessonProgress.userId, userId)),
    )
    .where(
      and(
        eq(enrollment.userId, userId),
        sql`coalesce(${lessonProgress.status}, 'locked') <> 'done'`,
      ),
    )
    .orderBy(asc(course.sortOrder), asc(lesson.sortOrder))
    .limit(1);
  return rows[0] ?? null;
}

/** Darsdan keyingi dars (bir kurs ichida). */
export async function getNextLesson(courseId: string, currentOrder: number) {
  const rows = await db
    .select({
      id: lesson.id,
      title: lesson.title,
      sortOrder: lesson.sortOrder,
      durationMin: lesson.durationMin,
      type: lesson.type,
    })
    .from(lesson)
    .where(and(eq(lesson.courseId, courseId), sql`${lesson.sortOrder} > ${currentOrder}`))
    .orderBy(asc(lesson.sortOrder))
    .limit(1);
  return rows[0] ?? null;
}

/** Foydalanuvchining dars bo'yicha shaxsiy eslatmasi. */
export async function getLessonNote(userId: string, lessonId: string) {
  const rows = await db
    .select({ body: lessonNote.body })
    .from(lessonNote)
    .where(and(eq(lessonNote.userId, userId), eq(lessonNote.lessonId, lessonId)))
    .limit(1);
  return rows[0]?.body ?? "";
}

/**
 * Kurs uchun quiz savollari — `correctIndex` QAYTARILMAYDI.
 * To'g'ri javob faqat serverda, `submitQuizAnswer` ichida solishtiriladi.
 */
export async function getQuizQuestions(courseId?: string) {
  const base = db
    .select({
      id: quizQuestion.id,
      prompt: quizQuestion.prompt,
      options: quizQuestion.options,
      sortOrder: quizQuestion.sortOrder,
    })
    .from(quizQuestion);
  const rows = courseId
    ? await base.where(eq(quizQuestion.courseId, courseId)).orderBy(asc(quizQuestion.sortOrder))
    : await base.orderBy(asc(quizQuestion.sortOrder));
  return rows;
}

/** Foydalanuvchining quiz urinishlari (savol id → tanlangan javob, to'g'rimi). */
export async function getQuizAttempts(userId: string) {
  const rows = await db
    .select({
      questionId: quizAttempt.questionId,
      selectedIndex: quizAttempt.selectedIndex,
      correct: quizAttempt.correct,
    })
    .from(quizAttempt)
    .where(eq(quizAttempt.userId, userId));
  return rows;
}

/** Lab loyihalari + foydalanuvchi holati. */
export async function getLabProjectsWithProgress(userId: string) {
  return db
    .select({
      id: labProject.id,
      slug: labProject.slug,
      title: labProject.title,
      description: labProject.description,
      icon: labProject.icon,
      color: labProject.color,
      soft: labProject.soft,
      diff: labProject.diff,
      diffCol: labProject.diffCol,
      diffBg: labProject.diffBg,
      parts: labProject.parts,
      status: sql<string | null>`${labProgress.status}`,
    })
    .from(labProject)
    .leftJoin(
      labProgress,
      and(eq(labProgress.projectId, labProject.id), eq(labProgress.userId, userId)),
    )
    .orderBy(asc(labProject.sortOrder));
}

/** Oxirgi qo'lga kiritilgan nishon (ota-ona paneli uchun). */
export async function getLatestBadge(userId: string) {
  const rows = await db
    .select({
      name: badge.name,
      icon: badge.icon,
      color: badge.color,
      soft: badge.soft,
      earnedAt: userBadge.earnedAt,
    })
    .from(userBadge)
    .innerJoin(badge, eq(userBadge.badgeId, badge.id))
    .where(eq(userBadge.userId, userId))
    .orderBy(desc(userBadge.earnedAt))
    .limit(1);
  return rows[0] ?? null;
}

/* ─────────────────────────── Foydalanuvchi ─────────────────────────── */

export async function getUserStats(userId: string) {
  const [u] = await db
    .select({ xp: user.xp, streak: user.streak, level: user.level, name: user.name })
    .from(user)
    .where(eq(user.id, userId));
  const [{ value: badgeCount }] = await db
    .select({ value: count() })
    .from(userBadge)
    .where(eq(userBadge.userId, userId));
  const [{ value: enrolledCount }] = await db
    .select({ value: count() })
    .from(enrollment)
    .where(eq(enrollment.userId, userId));
  const [{ value: doneLessons }] = await db
    .select({ value: count() })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "done")));
  return {
    xp: u?.xp ?? 0,
    streak: u?.streak ?? 0,
    level: u?.level ?? 1,
    name: u?.name ?? "",
    badgeCount,
    enrolledCount,
    doneLessons,
  };
}

/** Foydalanuvchi yozilgan kurslar + progress foizi. */
export async function getUserCourses(userId: string) {
  return db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      icon: course.icon,
      color: course.color,
      soft: course.soft,
      level: course.level,
      totalLessons: course.totalLessons,
      hours: course.hours,
      progressPercent: enrollment.progressPercent,
      sortOrder: course.sortOrder,
    })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .where(eq(enrollment.userId, userId))
    .orderBy(asc(course.sortOrder));
}

/** Kurs darslari + foydalanuvchi holati (done/current/locked). */
export async function getCourseLessons(userId: string, courseId: string) {
  return db
    .select({
      id: lesson.id,
      sortOrder: lesson.sortOrder,
      title: lesson.title,
      meta: lesson.meta,
      type: lesson.type,
      status: sql<string>`coalesce(${lessonProgress.status}, 'locked')`,
    })
    .from(lesson)
    .leftJoin(
      lessonProgress,
      and(eq(lessonProgress.lessonId, lesson.id), eq(lessonProgress.userId, userId)),
    )
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lesson.sortOrder));
}

/**
 * Reyting — XP bo'yicha tartiblangan foydalanuvchilar.
 *
 * MAXFIYLIK: bu 8–15 yoshli bolalar platformasi, shuning uchun reytingda
 * HECH KIMNING to'liq ismi (familiyasi) ko'rsatilmaydi — faqat ism.
 * Foydalanuvchi `id` ham klientga chiqarilmaydi; "siz"ni belgilash uchun
 * `you` bayrog'i yetarli.
 */
export async function getLeaderboard(currentUserId: string) {
  const rows = await db
    .select({ id: user.id, name: user.name, xp: user.xp })
    .from(user)
    .orderBy(desc(user.xp), asc(user.createdAt))
    .limit(12);
  return rows.map((r, i) => {
    const you = r.id === currentUserId;
    const short = firstName(r.name);
    return {
      rank: i + 1,
      name: you ? `${short} (Siz)` : short,
      init: initials(r.name),
      xp: formatXp(r.xp),
      you,
    };
  });
}

export async function getUserBadges(userId: string) {
  const earned = await db
    .select({ badgeId: userBadge.badgeId })
    .from(userBadge)
    .where(eq(userBadge.userId, userId));
  const earnedSet = new Set(earned.map((e) => e.badgeId));
  const all = await db.select().from(badge).orderBy(asc(badge.sortOrder));
  return all.map((b) => ({ ...b, earned: earnedSet.has(b.id) }));
}

export async function getUserCertificates(userId: string) {
  return db
    .select()
    .from(certificate)
    .where(eq(certificate.userId, userId))
    .orderBy(asc(certificate.sortOrder));
}

export async function getWeekActivity(userId: string) {
  const rows = await db
    .select()
    .from(dailyActivity)
    .where(eq(dailyActivity.userId, userId))
    .orderBy(asc(dailyActivity.weekday));
  const labels = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return labels.map((d, i) => {
    const row = rows.find((r) => r.weekday === i);
    return { d, h: row ? Math.round((row.minutes / max) * 100) : 0, minutes: row?.minutes ?? 0 };
  });
}

export async function getNotifications(userId: string) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(20);
}

export async function getChatMessages(userId: string) {
  return db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.userId, userId))
    .orderBy(asc(chatMessage.createdAt));
}

export async function getUserSettings(userId: string) {
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return rows[0] ?? { userId, notificationsEnabled: true, theme: "light" };
}

/* ─────────────────────────── Yordamchilar ─────────────────────────── */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function formatXp(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}
