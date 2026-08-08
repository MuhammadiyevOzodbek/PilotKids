import "server-only";
import { cache } from "react";
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

/**
 * Manzildan kelgan identifikator UUID ekanini tekshiradi.
 *
 * `/lesson/not-a-uuid` kabi murakkab bo'lmagan so'rov Postgres'da `22P02`
 * xatosini keltirib chiqarardi: foydalanuvchi «Sahifa topilmadi» o'rniga
 * «Nimadir noto'g'ri ketdi» degan server xatosini ko'rardi. Identifikatorni
 * so'rovdan OLDIN tekshirsak, bunday manzil oddiy 404 bo'lib qoladi.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/* ─────────────────────────── Kontent (umumiy) ─────────────────────────── */

async function getFeaturedCourses_impl() {
  return db.select().from(course).where(eq(course.featured, true)).orderBy(asc(course.sortOrder));
}

async function getCategories_impl() {
  return db.select().from(category).orderBy(asc(category.sortOrder));
}

async function getLabProjects_impl() {
  return db.select().from(labProject).orderBy(asc(labProject.sortOrder));
}

/** Asosiy kurs (birinchi featured) — kurs tafsilotlari sahifasi uchun. */
async function getMainCourse_impl() {
  const rows = await db.select().from(course).orderBy(asc(course.sortOrder)).limit(1);
  return rows[0] ?? null;
}

/** Kursni slug bo'yicha topish (kategoriya nomi bilan). */
async function getCourseBySlug_impl(slug: string) {
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
async function getAllCourses_impl() {
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
async function getCourseStudentCount_impl(courseId: string) {
  if (!isUuid(courseId)) return 0;
  const [{ value }] = await db
    .select({ value: count() })
    .from(enrollment)
    .where(eq(enrollment.courseId, courseId));
  return value;
}

/** Bitta darsni kursi bilan birga olish. */
async function getLessonById_impl(lessonId: string) {
  if (!isUuid(lessonId)) return null;
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
async function getCurrentLesson_impl(userId: string) {
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
async function getNextLesson_impl(courseId: string, currentOrder: number) {
  if (!isUuid(courseId)) return null;
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
async function getLessonNote_impl(userId: string, lessonId: string) {
  if (!isUuid(lessonId)) return "";
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
async function getQuizQuestions_impl(courseId?: string) {
  if (courseId && !isUuid(courseId)) return [];
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
async function getQuizAttempts_impl(userId: string) {
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
async function getLabProjectsWithProgress_impl(userId: string) {
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
      kind: labProject.kind,
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
async function getLatestBadge_impl(userId: string) {
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

/**
 * Foydalanuvchi ko'rsatkichlari — BITTA so'rovda.
 *
 * Ilgari bu to'rt alohida so'rov edi. Ma'lumotlar bazasi uzoqda (har so'rov
 * ~240ms sof tarmoq vaqti), shuning uchun so'rovlar sonining o'zi asosiy
 * xarajat. `Promise.all` bu yerda yordam bermaydi: neon-http har so'rov uchun
 * alohida HTTPS ulanish ochadi, ya'ni parallel yuborish tezlashtirmaydi
 * (o'lchovda hatto sekinlashtirdi). Yagona to'g'ri yo'l — bitta borishda
 * hammasini olish: sanoqlar skalyar subquery sifatida yoziladi.
 */
async function getUserStats_impl(userId: string) {
  const [row] = await db
    .select({
      xp: user.xp,
      streak: user.streak,
      level: user.level,
      name: user.name,
      // Rol shu yerda ham qaytariladi — sidebar'dagi admin havolasi uchun
      // alohida so'rov yubormaslik kerak (bu ham DB'dan, ya'ni sessiya
      // keshiga ishonilmaydi).
      role: user.role,
      // Diqqat: subquery ichida ${user.id} YOZIB BO'LMAYDI — drizzle uni
      // jadval prefiksisiz (`"id"`) chiqaradi va Postgres uni tashqi `user`
      // emas, subquery'ning o'z jadvalidagi `id` deb tushunadi. `enrollment`
      // da `id` uuid, `user_id` esa text bo'lgani uchun bu
      // `operator does not exist: text = uuid` xatosini bergan.
      // Yechim: korrelyatsiya o'rniga `userId` parametrini bevosita berish.
      badgeCount: sql<number>`(
        select count(*)::int from ${userBadge} where ${userBadge.userId} = ${userId}
      )`,
      enrolledCount: sql<number>`(
        select count(*)::int from ${enrollment} where ${enrollment.userId} = ${userId}
      )`,
      doneLessons: sql<number>`(
        select count(*)::int from ${lessonProgress}
        where ${lessonProgress.userId} = ${userId} and ${lessonProgress.status} = 'done'
      )`,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    xp: row?.xp ?? 0,
    streak: row?.streak ?? 0,
    level: row?.level ?? 1,
    name: row?.name ?? "",
    role: row?.role ?? "student",
    badgeCount: row?.badgeCount ?? 0,
    enrolledCount: row?.enrolledCount ?? 0,
    doneLessons: row?.doneLessons ?? 0,
  };
}

/** Foydalanuvchi yozilgan kurslar + progress foizi. */
async function getUserCourses_impl(userId: string) {
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
async function getCourseLessons_impl(userId: string, courseId: string) {
  if (!isUuid(courseId)) return [];
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
async function getLeaderboard_impl(currentUserId: string) {
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

/**
 * Barcha nishonlar + foydalanuvchi qaysilarini olganini belgilash.
 * Ilgari ikki so'rov edi; `leftJoin` bilan bitta borishda hal bo'ladi.
 */
async function getUserBadges_impl(userId: string) {
  const rows = await db
    .select({
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      icon: badge.icon,
      color: badge.color,
      soft: badge.soft,
      sortOrder: badge.sortOrder,
      earnedAt: userBadge.earnedAt,
    })
    .from(badge)
    .leftJoin(userBadge, and(eq(userBadge.badgeId, badge.id), eq(userBadge.userId, userId)))
    .orderBy(asc(badge.sortOrder));

  return rows.map(({ earnedAt, ...b }) => ({ ...b, earned: earnedAt !== null }));
}

async function getUserCertificates_impl(userId: string) {
  return db
    .select()
    .from(certificate)
    .where(eq(certificate.userId, userId))
    .orderBy(asc(certificate.sortOrder));
}

async function getWeekActivity_impl(userId: string) {
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

async function getNotifications_impl(userId: string) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(20);
}

async function getChatMessages_impl(userId: string) {
  return db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.userId, userId))
    .orderBy(asc(chatMessage.createdAt));
}

async function getUserSettings_impl(userId: string) {
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return rows[0] ?? { userId, notificationsEnabled: true, theme: "light" };
}

/* ─────────────────────────── Keshlangan eksportlar ───────────────────────────
   React `cache()` — BITTA so'rov ichida bir xil argument bilan ikkinchi marta
   chaqirilsa DB'ga qayta bormaydi, birinchi natijani qaytaradi.

   Bu shu yerda muhim: `(app)/layout.tsx` header uchun `getUserStats` chaqiradi,
   sahifaning o'zi ham chaqiradi — kesh bo'lmasa bir xil so'rovlar ikki marta
   ketardi. DB uzoq bo'lgani uchun har takror ~250ms yo'qotish edi.

   Kesh faqat bitta so'rov (request) doirasida yashaydi — sahifa yangilanganda
   ma'lumot baribir yangi olinadi, ya'ni eskirgan qiymat ko'rsatilmaydi. */

export const getFeaturedCourses = cache(getFeaturedCourses_impl);
export const getCategories = cache(getCategories_impl);
export const getLabProjects = cache(getLabProjects_impl);
export const getMainCourse = cache(getMainCourse_impl);
export const getCourseBySlug = cache(getCourseBySlug_impl);
export const getAllCourses = cache(getAllCourses_impl);
export const getCourseStudentCount = cache(getCourseStudentCount_impl);
export const getLessonById = cache(getLessonById_impl);
export const getCurrentLesson = cache(getCurrentLesson_impl);
export const getNextLesson = cache(getNextLesson_impl);
export const getLessonNote = cache(getLessonNote_impl);
export const getQuizQuestions = cache(getQuizQuestions_impl);
export const getQuizAttempts = cache(getQuizAttempts_impl);
export const getLabProjectsWithProgress = cache(getLabProjectsWithProgress_impl);
export const getLatestBadge = cache(getLatestBadge_impl);
export const getUserStats = cache(getUserStats_impl);
export const getUserCourses = cache(getUserCourses_impl);
export const getCourseLessons = cache(getCourseLessons_impl);
export const getLeaderboard = cache(getLeaderboard_impl);
export const getUserBadges = cache(getUserBadges_impl);
export const getUserCertificates = cache(getUserCertificates_impl);
export const getWeekActivity = cache(getWeekActivity_impl);
export const getNotifications = cache(getNotifications_impl);
export const getChatMessages = cache(getChatMessages_impl);
export const getUserSettings = cache(getUserSettings_impl);

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
