import "server-only";
import { and, asc, desc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "./index";
import {
  courses,
  enrollments,
  lessonCompletions,
  lessons,
  notifications,
  quizQuestions,
  ranks,
  subscriptions,
  users,
} from "./schema";
import type { Course, Enrollment, Lesson, Notification, Rank, Subscription } from "./schema";

export interface RankInfo {
  current: Rank | null;
  next: Rank | null;
  /** Joriy darajadan keyingisigacha progress (0..1) */
  progressToNext: number;
  /** Keyingi darajagacha qolgan XP */
  xpToNext: number;
}

export function computeRankInfo(xp: number, allRanks: Rank[]): RankInfo {
  const sorted = [...allRanks].sort((a, b) => a.order - b.order);
  let current: Rank | null = null;
  let next: Rank | null = null;
  for (const rank of sorted) {
    if (xp >= rank.minXp) current = rank;
    else {
      next = rank;
      break;
    }
  }
  if (!current) current = sorted[0] ?? null;

  let progressToNext = 1;
  let xpToNext = 0;
  if (current && next) {
    const span = next.minXp - current.minXp;
    progressToNext = span > 0 ? Math.min(1, Math.max(0, (xp - current.minXp) / span)) : 1;
    xpToNext = Math.max(0, next.minXp - xp);
  }
  return { current, next, progressToNext, xpToNext };
}

export type EnrollmentWithCourse = Enrollment & { course: Course };

export interface DashboardData {
  user: { id: string; name: string; email: string; xp: number };
  rankInfo: RankInfo;
  enrollments: EnrollmentWithCourse[];
  notifications: Notification[];
  stats: {
    enrolledCount: number;
    completedCount: number;
    inProgressCount: number;
    unreadNotifications: number;
  };
}

/** Dashboard uchun barcha ma'lumotni bitta joyda yig'adi. */
export async function getDashboardData(userId: string): Promise<DashboardData | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const allRanks = await db.select().from(ranks);
  const rankInfo = computeRankInfo(user.xp, allRanks);

  const rows = await db
    .select({ enrollment: enrollments, course: courses })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.createdAt));
  const enrollmentList: EnrollmentWithCourse[] = rows.map((r) => ({
    ...r.enrollment,
    course: r.course,
  }));

  const notificationList = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(10);

  const completedCount = enrollmentList.filter((e) => e.completedAt !== null).length;
  const unreadNotifications = notificationList.filter((n) => !n.read).length;

  return {
    user: { id: user.id, name: user.name, email: user.email, xp: user.xp },
    rankInfo,
    enrollments: enrollmentList,
    notifications: notificationList,
    stats: {
      enrolledCount: enrollmentList.length,
      completedCount,
      inProgressCount: enrollmentList.length - completedCount,
      unreadNotifications,
    },
  };
}

/** Foydalanuvchining o'qilmagan bildirishnomalari soni (sidebar belgisi uchun). */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows.length;
}

/** Reyting (leaderboard) — XP bo'yicha tartiblangan foydalanuvchilar. */
export async function getLeaderboard(limit = 20) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      xp: users.xp,
      rankId: users.rankId,
    })
    .from(users)
    .orderBy(desc(users.xp))
    .limit(limit);
  return rows;
}

/** Barcha kurslar (katalog uchun) — kategoriyasi bilan. */
export async function getAllCourses() {
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

/** Foydalanuvchi ro'yxatga olgan kurs id'lari. */
export async function getEnrolledCourseIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), isNotNull(enrollments.courseId)));
  return rows.map((r) => r.courseId);
}

/**
 * Muddati o'tgan (endDate < hozir) premium obunalarni "expired" holatiga
 * o'tkazadi. Kron o'rniga lazy-expiry: obuna o'qilganda tekshiriladi.
 */
async function expireStaleSubscriptions(userId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        eq(subscriptions.plan, "premium"),
        isNotNull(subscriptions.endDate),
        lt(subscriptions.endDate, new Date()),
      ),
    );
}

/** Foydalanuvchida aktiv (muddati o'tmagan) Premium obuna bormi. */
export async function isUserPremium(userId: string): Promise<boolean> {
  await expireStaleSubscriptions(userId);
  const rows = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.plan, "premium"),
        eq(subscriptions.status, "active"),
        // endDate yo'q (cheksiz) yoki hali kelajakda
        or(isNull(subscriptions.endDate), gt(subscriptions.endDate, new Date())),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Foydalanuvchining eng so'nggi obunasi (muddati o'tganlar avval yopiladi). */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  await expireStaleSubscriptions(userId);
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.startDate))
    .limit(1);
  return row ?? null;
}

/** Bitta kursni slug bo'yicha oladi. */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return course ?? null;
}

export interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    age: number | null;
    avatarUrl: string | null;
    xp: number;
    createdAt: Date;
  };
  rankInfo: RankInfo;
  stats: { enrolledCount: number; completedCount: number };
}

/** Profil sahifasi uchun foydalanuvchi ma'lumoti, darajasi va statistikasi. */
export async function getProfileData(userId: string): Promise<ProfileData | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const allRanks = await db.select().from(ranks);
  const rankInfo = computeRankInfo(user.xp, allRanks);

  const enrolled = await db
    .select({ completedAt: enrollments.completedAt })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));
  const completedCount = enrolled.filter((e) => e.completedAt !== null).length;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      avatarUrl: user.avatarUrl,
      xp: user.xp,
      createdAt: user.createdAt,
    },
    rankInfo,
    stats: { enrolledCount: enrolled.length, completedCount },
  };
}

/** Kursning barcha darslari (tartib bo'yicha). */
export async function getCourseLessons(courseId: string): Promise<Lesson[]> {
  return db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.order));
}

/** Test savoli — mijozga uzatiladigan xavfsiz shakli (to'g'ri javob YASHIRIN). */
export interface PublicQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  order: number;
}

/**
 * Kursning barcha darslari uchun test savollarini lessonId bo'yicha guruhlaydi.
 * correctIndex QAYTARILMAYDI — baholash faqat serverda (submitQuiz) amalga oshadi.
 */
export async function getCourseQuizzes(
  courseId: string,
): Promise<Record<string, PublicQuizQuestion[]>> {
  const rows = await db
    .select({
      id: quizQuestions.id,
      lessonId: quizQuestions.lessonId,
      prompt: quizQuestions.prompt,
      options: quizQuestions.options,
      order: quizQuestions.order,
    })
    .from(quizQuestions)
    .innerJoin(lessons, eq(quizQuestions.lessonId, lessons.id))
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(quizQuestions.order));

  const map: Record<string, PublicQuizQuestion[]> = {};
  for (const r of rows) {
    (map[r.lessonId] ??= []).push({
      id: r.id,
      prompt: r.prompt,
      options: r.options,
      order: r.order,
    });
  }
  return map;
}

/** Foydalanuvchi shu kursda tugatgan dars id'lari. */
export async function getCompletedLessonIds(
  userId: string,
  courseId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ lessonId: lessonCompletions.lessonId })
    .from(lessonCompletions)
    .innerJoin(lessons, eq(lessonCompletions.lessonId, lessons.id))
    .where(and(eq(lessonCompletions.userId, userId), eq(lessons.courseId, courseId)));
  return new Set(rows.map((r) => r.lessonId));
}

/** Foydalanuvchining muayyan kursdagi enrollmenti (bo'lsa). */
export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const [row] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);
  return row ?? null;
}
