"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { course, lesson, quizQuestion, user } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { enforceLimit } from "@/lib/rate-limit";
import { firstError, userIdSchema, uuidSchema } from "@/lib/validation";

/**
 * Admin action'lari.
 *
 * Har biri `requireAdmin()` bilan boshlanadi — server action HTTP endpoint
 * bo'lgani uchun UI'da tugma ko'rinmasligi himoya emas.
 */

type Result = { ok: true } | { ok: false; error: string };

const ok = { ok: true } as const;
const fail = (error: string) => ({ ok: false as const, error });

/** Slug: kichik harf, raqam va chiziqcha. */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug juda qisqa")
  .max(60, "Slug juda uzun")
  .regex(/^[a-z0-9-]+$/, "Slugda faqat kichik harf, raqam va chiziqcha bo'lsin");

/* ─────────────────────────── Foydalanuvchilar ─────────────────────────── */

const roleSchema = z.enum(["student", "parent", "admin"], { message: "Noto'g'ri rol" });
const booleanSchema = z.boolean({ message: "Noto'g'ri qiymat" });
const moveDirectionSchema = z.enum(["up", "down"], { message: "Noto'g'ri yo'nalish" });

export async function setUserRole(userId: string, role: string): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return fail(firstError(parsedUserId.error));

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return fail(firstError(parsedRole.error));

  // O'zini adminlikdan mahrum qilib, panelga kirolmay qolmasin.
  if (parsedUserId.data === me.id && parsedRole.data !== "admin") {
    return fail("O'z rolingizni o'zgartira olmaysiz");
  }

  await db
    .update(user)
    .set({ role: parsedRole.data, updatedAt: new Date() })
    .where(eq(user.id, parsedUserId.data));

  revalidatePath("/admin/users");
  return ok;
}

export async function setUserBanned(userId: string, banned: boolean): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return fail(firstError(parsedUserId.error));

  const parsedBanned = booleanSchema.safeParse(banned);
  if (!parsedBanned.success) return fail(firstError(parsedBanned.error));

  if (parsedUserId.data === me.id) return fail("O'zingizni bloklay olmaysiz");

  await db
    .update(user)
    .set({
      banned: parsedBanned.data,
      banReason: parsedBanned.data ? "Admin tomonidan bloklandi" : null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, parsedUserId.data));

  revalidatePath("/admin/users");
  return ok;
}

export async function deleteUser(userId: string): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return fail(firstError(parsedUserId.error));

  if (parsedUserId.data === me.id) return fail("O'z hisobingizni o'chira olmaysiz");

  // Oxirgi admin o'chib ketmasin — panelga kirish yopilib qoladi.
  const [{ value: admins }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(user)
    .where(and(eq(user.role, "admin"), ne(user.id, parsedUserId.data)));
  if (admins === 0) return fail("Oxirgi adminni o'chirib bo'lmaydi");

  // Bog'liq yozuvlar `onDelete: cascade` bilan o'zi o'chadi.
  await db.delete(user).where(eq(user.id, parsedUserId.data));

  revalidatePath("/admin/users");
  return ok;
}

/* ─────────────────────────── Kurslar ─────────────────────────── */

const courseSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2, "Sarlavha juda qisqa").max(120, "Sarlavha juda uzun"),
  description: z.string().trim().max(1000, "Tavsif juda uzun").default(""),
  categoryId: z.string().uuid().nullable().optional(),
  icon: z.string().trim().min(1, "Ikonka nomini kiriting").max(60),
  color: z.string().trim().max(40).default("#2F6BF3"),
  soft: z.string().trim().max(60).default("var(--primary-soft)"),
  level: z.string().trim().min(1, "Darajani tanlang").max(40),
  hours: z.string().trim().max(40).default("0 soat"),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export async function createCourse(input: unknown): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const exists = await db
    .select({ id: course.id })
    .from(course)
    .where(eq(course.slug, parsed.data.slug))
    .limit(1);
  if (exists.length > 0) return fail("Bu slug band — boshqasini tanlang");

  await db.insert(course).values({
    ...parsed.data,
    categoryId: parsed.data.categoryId ?? null,
    totalLessons: 0,
  });

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  return ok;
}

export async function updateCourse(courseId: string, input: unknown): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(courseId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const clash = await db
    .select({ id: course.id })
    .from(course)
    .where(and(eq(course.slug, parsed.data.slug), ne(course.id, parsedId.data)))
    .limit(1);
  if (clash.length > 0) return fail("Bu slug boshqa kursda ishlatilgan");

  await db
    .update(course)
    .set({ ...parsed.data, categoryId: parsed.data.categoryId ?? null })
    .where(eq(course.id, parsedId.data));

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath(`/courses/${parsed.data.slug}`);
  return ok;
}

export async function deleteCourse(courseId: string): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(courseId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  await db.delete(course).where(eq(course.id, parsedId.data));

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  return ok;
}

/* ─────────────────────────── Darslar ─────────────────────────── */

const lessonSchema = z.object({
  title: z.string().trim().min(2, "Sarlavha juda qisqa").max(140, "Sarlavha juda uzun"),
  meta: z.string().trim().max(80).default(""),
  type: z.enum(["video", "code", "quiz", "lab"], { message: "Dars turi noto'g'ri" }),
  durationMin: z.number().int().min(0).max(600).default(0),
  content: z.string().trim().max(20000, "Matn juda uzun").default(""),
  videoUrl: z.string().trim().url("Video havolasi noto'g'ri").or(z.literal("")).default(""),
  xpReward: z.number().int().min(0).max(500).default(40),
});

/** Kurs darslari sonini qayta hisoblaydi (kartochkalarda ko'rsatiladi). */
async function syncLessonCount(courseId: string) {
  const [{ value }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(lesson)
    .where(eq(lesson.courseId, courseId));
  await db.update(course).set({ totalLessons: value }).where(eq(course.id, courseId));
}

export async function createLesson(courseId: string, input: unknown): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(courseId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  // Tartib raqami qo'lda emas, oxirgisidan keyin qo'yiladi — `unique(courseId,
  // sortOrder)` cheklovi buzilmasin.
  const [{ value: last }] = await db
    .select({ value: max(lesson.sortOrder) })
    .from(lesson)
    .where(eq(lesson.courseId, parsedId.data));

  await db.insert(lesson).values({
    courseId: parsedId.data,
    sortOrder: (last ?? 0) + 1,
    ...parsed.data,
    videoUrl: parsed.data.videoUrl || null,
  });

  await syncLessonCount(parsedId.data);
  revalidatePath(`/admin/courses/${parsedId.data}`);
  return ok;
}

export async function updateLesson(lessonId: string, input: unknown): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(lessonId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  await db
    .update(lesson)
    .set({ ...parsed.data, videoUrl: parsed.data.videoUrl || null })
    .where(eq(lesson.id, parsedId.data));

  revalidatePath("/admin/courses");
  revalidatePath(`/lesson/${parsedId.data}`);
  return ok;
}

export async function deleteLesson(lessonId: string, courseId: string): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(lessonId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  const parsedCourseId = uuidSchema.safeParse(courseId);
  if (!parsedCourseId.success) return fail(firstError(parsedCourseId.error));

  await db.delete(lesson).where(eq(lesson.id, parsedId.data));
  await syncLessonCount(parsedCourseId.data);

  revalidatePath(`/admin/courses/${parsedCourseId.data}`);
  return ok;
}

/** Darsni ro'yxatda bir pog'ona yuqoriga/pastga siljitish. */
export async function moveLesson(
  lessonId: string,
  courseId: string,
  direction: "up" | "down",
): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedLessonId = uuidSchema.safeParse(lessonId);
  if (!parsedLessonId.success) return fail(firstError(parsedLessonId.error));

  const parsedCourseId = uuidSchema.safeParse(courseId);
  if (!parsedCourseId.success) return fail(firstError(parsedCourseId.error));

  const parsedDirection = moveDirectionSchema.safeParse(direction);
  if (!parsedDirection.success) return fail(firstError(parsedDirection.error));

  const rows = await db
    .select({ id: lesson.id, sortOrder: lesson.sortOrder })
    .from(lesson)
    .where(eq(lesson.courseId, parsedCourseId.data))
    .orderBy(lesson.sortOrder);

  const index = rows.findIndex((r) => r.id === parsedLessonId.data);
  if (index < 0) return fail("Dars topilmadi");

  const target = parsedDirection.data === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return ok; // chekkada — o'zgarish yo'q

  const a = rows[index]!;
  const b = rows[target]!;

  // `unique(courseId, sortOrder)` bor, shuning uchun to'g'ridan-to'g'ri
  // almashtirib bo'lmaydi — vaqtincha bo'sh o'ringa chiqaramiz.
  const temp = -1;
  await db.update(lesson).set({ sortOrder: temp }).where(eq(lesson.id, a.id));
  await db.update(lesson).set({ sortOrder: a.sortOrder }).where(eq(lesson.id, b.id));
  await db.update(lesson).set({ sortOrder: b.sortOrder }).where(eq(lesson.id, a.id));

  revalidatePath(`/admin/courses/${parsedCourseId.data}`);
  return ok;
}

/* ─────────────────────────── Quiz savollari ─────────────────────────── */

const questionSchema = z
  .object({
    courseId: z.string().uuid().nullable().optional(),
    prompt: z.string().trim().min(4, "Savol juda qisqa").max(500, "Savol juda uzun"),
    options: z
      .array(z.string().trim().min(1, "Javob varianti bo'sh bo'lmasin").max(200))
      .min(2, "Kamida 2 ta variant bo'lsin")
      .max(6, "Ko'pi bilan 6 ta variant"),
    correctIndex: z.number().int().min(0),
    sortOrder: z.number().int().min(0).max(999).default(0),
  })
  .refine((v) => v.correctIndex < v.options.length, {
    message: "To'g'ri javob variantlar ichida bo'lsin",
    path: ["correctIndex"],
  });

export async function createQuestion(input: unknown): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  await db.insert(quizQuestion).values({
    ...parsed.data,
    courseId: parsed.data.courseId ?? null,
  });

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  return ok;
}

export async function updateQuestion(questionId: string, input: unknown): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(questionId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  await db
    .update(quizQuestion)
    .set({ ...parsed.data, courseId: parsed.data.courseId ?? null })
    .where(eq(quizQuestion.id, parsedId.data));

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  return ok;
}

export async function deleteQuestion(questionId: string): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(questionId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  await db.delete(quizQuestion).where(eq(quizQuestion.id, parsedId.data));

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  return ok;
}
