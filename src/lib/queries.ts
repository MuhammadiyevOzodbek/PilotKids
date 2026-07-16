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

export async function getQuizQuestion() {
  const rows = await db.select().from(quizQuestion).orderBy(asc(quizQuestion.sortOrder)).limit(1);
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

/** Reyting — XP bo'yicha tartiblangan barcha foydalanuvchilar. */
export async function getLeaderboard(currentUserId: string) {
  const rows = await db
    .select({ id: user.id, name: user.name, xp: user.xp })
    .from(user)
    .orderBy(desc(user.xp), asc(user.createdAt))
    .limit(12);
  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    name: r.id === currentUserId ? `${firstName(r.name)} (Siz)` : r.name,
    init: initials(r.name),
    xp: formatXp(r.xp),
    you: r.id === currentUserId,
  }));
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
