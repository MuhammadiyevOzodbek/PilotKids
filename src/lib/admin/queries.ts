import "server-only";
import { and, asc, count, desc, eq, gte, ilike, or, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user,
  course,
  category,
  lesson,
  quizQuestion,
  enrollment,
  lessonProgress,
  labProject,
  certificate,
} from "@/lib/db/schema";

/** Admin ro'yxatlarida bir sahifadagi qatorlar soni. */
export const PAGE_SIZE = 20;

/* ─────────────────────────── Umumiy statistika ─────────────────────────── */

export async function getAdminStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[users], [newUsers], [courses], [lessons], [questions], [enrollments], [completed], [xp]] =
    await Promise.all([
      db.select({ value: count() }).from(user),
      db.select({ value: count() }).from(user).where(gte(user.createdAt, weekAgo)),
      db.select({ value: count() }).from(course),
      db.select({ value: count() }).from(lesson),
      db.select({ value: count() }).from(quizQuestion),
      db.select({ value: count() }).from(enrollment),
      db.select({ value: count() }).from(lessonProgress).where(eq(lessonProgress.status, "done")),
      db.select({ value: sum(user.xp) }).from(user),
    ]);

  return {
    users: users?.value ?? 0,
    newUsersThisWeek: newUsers?.value ?? 0,
    courses: courses?.value ?? 0,
    lessons: lessons?.value ?? 0,
    questions: questions?.value ?? 0,
    enrollments: enrollments?.value ?? 0,
    completedLessons: completed?.value ?? 0,
    totalXp: Number(xp?.value ?? 0),
  };
}

/** Oxirgi 14 kun bo'yicha ro'yxatdan o'tishlar (grafik uchun). */
export async function getSignupTrend() {
  const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${user.createdAt}, 'YYYY-MM-DD')`,
      value: count(),
    })
    .from(user)
    .where(gte(user.createdAt, since))
    .groupBy(sql`to_char(${user.createdAt}, 'YYYY-MM-DD')`);

  const map = new Map(rows.map((r) => [r.day, r.value]));

  // Ma'lumot yo'q kunlar ham grafikda ko'rinsin — nol bilan to'ldiramiz.
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return {
      day: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`,
      value: map.get(key) ?? 0,
    };
  });
}

/** Eng ko'p yozilgan kurslar. */
export async function getTopCourses(limit = 5) {
  return db
    .select({
      id: course.id,
      title: course.title,
      icon: course.icon,
      color: course.color,
      soft: course.soft,
      students: count(enrollment.id),
    })
    .from(course)
    .leftJoin(enrollment, eq(enrollment.courseId, course.id))
    .groupBy(course.id)
    .orderBy(desc(count(enrollment.id)))
    .limit(limit);
}

/* ─────────────────────────── Foydalanuvchilar ─────────────────────────── */

export interface UserFilter {
  q?: string;
  role?: string;
  page?: number;
}

export async function getAdminUsers({ q, role, page = 1 }: UserFilter) {
  const where = and(
    q ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)) : undefined,
    role && role !== "all" ? eq(user.role, role) : undefined,
  );

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        age: user.age,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        banned: user.banned,
        onboarded: user.onboarded,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(user).where(where),
  ]);

  return { rows, total: total?.value ?? 0, pages: Math.ceil((total?.value ?? 0) / PAGE_SIZE) };
}

/* ─────────────────────────── Kurslar ─────────────────────────── */

export async function getAdminCourses() {
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
      hours: course.hours,
      featured: course.featured,
      sortOrder: course.sortOrder,
      categoryId: course.categoryId,
      categoryTitle: category.title,
      lessonCount: count(lesson.id),
    })
    .from(course)
    .leftJoin(category, eq(course.categoryId, category.id))
    .leftJoin(lesson, eq(lesson.courseId, course.id))
    .groupBy(course.id, category.title)
    .orderBy(asc(course.sortOrder));
}

export async function getAdminCourse(courseId: string) {
  const rows = await db.select().from(course).where(eq(course.id, courseId)).limit(1);
  return rows[0] ?? null;
}

export async function getAdminCategories() {
  return db.select().from(category).orderBy(asc(category.sortOrder));
}

/* ─────────────────────────── Darslar ─────────────────────────── */

export async function getAdminLessons(courseId: string) {
  return db
    .select()
    .from(lesson)
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lesson.sortOrder));
}

/* ─────────────────────────── Quiz ─────────────────────────── */

export async function getAdminQuestions(courseId?: string) {
  const q = db
    .select({
      id: quizQuestion.id,
      prompt: quizQuestion.prompt,
      options: quizQuestion.options,
      correctIndex: quizQuestion.correctIndex,
      sortOrder: quizQuestion.sortOrder,
      courseId: quizQuestion.courseId,
      courseTitle: course.title,
    })
    .from(quizQuestion)
    .leftJoin(course, eq(quizQuestion.courseId, course.id));

  return courseId
    ? q.where(eq(quizQuestion.courseId, courseId)).orderBy(asc(quizQuestion.sortOrder))
    : q.orderBy(asc(quizQuestion.sortOrder));
}

/* ─────────────────────────── Laboratoriya ─────────────────────────── */

export async function getAdminLabProjects() {
  return db.select().from(labProject).orderBy(asc(labProject.sortOrder));
}

/** Berilgan sertifikatlar soni (dashboard kartochkasi uchun). */
export async function getCertificateCount() {
  const [row] = await db
    .select({ value: count() })
    .from(certificate)
    .where(eq(certificate.state, "done"));
  return row?.value ?? 0;
}
