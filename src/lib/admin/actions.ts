"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { certificate, course, lesson, quizQuestion, user } from "@/lib/db/schema";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/session";
import { isAdminRole, isSuperAdminRole, USER_ROLES } from "@/lib/auth/roles";
import { enforceLimit } from "@/lib/rate-limit";
import { writeSuperadminAudit } from "@/lib/superadmin/audit";
import { firstError, userIdSchema, uuidSchema } from "@/lib/validation";

/**
 * Admin action'lari.
 *
 * Har biri serverda rolni qayta tekshiradi — server action HTTP endpoint
 * bo'lgani uchun UI'da tugma ko'rinmasligi himoya emas. Kontent mutatsiyalari
 * admin/superadmin, user boshqaruvi esa faqat superadmin uchun.
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

const roleSchema = z.enum(USER_ROLES, { message: "Noto'g'ri rol" });
const booleanSchema = z.boolean({ message: "Noto'g'ri qiymat" });
const moveDirectionSchema = z.enum(["up", "down"], { message: "Noto'g'ri yo'nalish" });

export async function setUserRole(userId: string, role: string): Promise<Result> {
  const me = await requireSuperAdmin();
  await enforceLimit("action", me.id);

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return fail(firstError(parsedUserId.error));

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return fail(firstError(parsedRole.error));

  // O'zini bosh adminlikdan mahrum qilib, panelga kirolmay qolmasin.
  if (parsedUserId.data === me.id && parsedRole.data !== "superadmin") {
    return fail("O'z rolingizni o'zgartira olmaysiz");
  }

  const [target] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, parsedUserId.data))
    .limit(1);
  if (!target) return fail("Foydalanuvchi topilmadi");

  if (target.role === "superadmin" && parsedRole.data !== "superadmin") {
    const [{ value: remainingSuperAdmins }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(user)
      .where(and(eq(user.role, "superadmin"), ne(user.id, parsedUserId.data)));
    if (remainingSuperAdmins === 0) return fail("Oxirgi bosh admin rolini olib bo'lmaydi");
  }

  const nextUserPatch: { role: string; onboarded?: boolean; updatedAt: Date } = {
    role: parsedRole.data,
    updatedAt: new Date(),
  };
  if (isAdminRole(parsedRole.data)) nextUserPatch.onboarded = true;

  await db.update(user).set(nextUserPatch).where(eq(user.id, parsedUserId.data));
  await writeSuperadminAudit({
    actor: me,
    action: "user.role.update",
    target: `${target.email}: ${target.role} -> ${parsedRole.data}`,
    impact: isAdminRole(parsedRole.data) || isAdminRole(target.role) ? "high" : "medium",
  });

  revalidatePath("/admin/users");
  revalidatePath("/superadmin/adminlar");
  revalidatePath("/superadmin/audit");
  return ok;
}

export async function setUserBanned(userId: string, banned: boolean): Promise<Result> {
  const me = await requireSuperAdmin();
  await enforceLimit("action", me.id);

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return fail(firstError(parsedUserId.error));

  const parsedBanned = booleanSchema.safeParse(banned);
  if (!parsedBanned.success) return fail(firstError(parsedBanned.error));

  if (parsedUserId.data === me.id) return fail("O'zingizni bloklay olmaysiz");

  const [target] = await db
    .select({ email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, parsedUserId.data))
    .limit(1);
  if (!target) return fail("Foydalanuvchi topilmadi");
  if (isSuperAdminRole(target.role)) return fail("Bosh adminni bloklab bo'lmaydi");

  await db
    .update(user)
    .set({
      banned: parsedBanned.data,
      banReason: parsedBanned.data ? "Admin tomonidan bloklandi" : null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, parsedUserId.data));
  await writeSuperadminAudit({
    actor: me,
    action: parsedBanned.data ? "user.ban" : "user.unban",
    target: target.email,
    impact: "medium",
  });

  revalidatePath("/admin/users");
  revalidatePath("/superadmin/xavfsizlik");
  revalidatePath("/superadmin/audit");
  return ok;
}

export async function deleteUser(userId: string): Promise<Result> {
  const me = await requireSuperAdmin();
  await enforceLimit("action", me.id);

  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) return fail(firstError(parsedUserId.error));

  if (parsedUserId.data === me.id) return fail("O'z hisobingizni o'chira olmaysiz");

  const [target] = await db
    .select({ email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, parsedUserId.data))
    .limit(1);
  if (!target) return fail("Foydalanuvchi topilmadi");
  if (isSuperAdminRole(target.role)) return fail("Bosh adminni o'chirib bo'lmaydi");

  // Oxirgi admin/superadmin o'chib ketmasin — panelga kirish yopilib qoladi.
  if (isAdminRole(target.role)) {
    const [{ value: admins }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(user)
      .where(and(sql`${user.role} in ('admin', 'superadmin')`, ne(user.id, parsedUserId.data)));
    if (admins === 0) return fail("Oxirgi adminni o'chirib bo'lmaydi");
  }

  // Bog'liq yozuvlar `onDelete: cascade` bilan o'zi o'chadi.
  await db.delete(user).where(eq(user.id, parsedUserId.data));
  await writeSuperadminAudit({
    actor: me,
    action: "user.delete",
    target: target.email,
    impact: "high",
  });

  revalidatePath("/admin/users");
  revalidatePath("/superadmin/adminlar");
  revalidatePath("/superadmin/audit");
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
  await writeSuperadminAudit({
    actor: me,
    action: "course.create",
    target: parsed.data.title,
    impact: "medium",
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

  const [current] = await db
    .select({ slug: course.slug })
    .from(course)
    .where(eq(course.id, parsedId.data))
    .limit(1);
  if (!current) return fail("Kurs topilmadi");

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
  await writeSuperadminAudit({
    actor: me,
    action: "course.update",
    target: parsed.data.title,
    impact: "medium",
  });

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath(`/courses/${current.slug}`);
  revalidatePath(`/courses/${parsed.data.slug}`);
  return ok;
}

export async function deleteCourse(courseId: string): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(courseId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  const [target] = await db
    .select({ title: course.title })
    .from(course)
    .where(eq(course.id, parsedId.data))
    .limit(1);
  await db.delete(certificate).where(eq(certificate.courseId, parsedId.data));
  await db.delete(course).where(eq(course.id, parsedId.data));
  await writeSuperadminAudit({
    actor: me,
    action: "course.delete",
    target: target?.title ?? parsedId.data,
    impact: "high",
  });

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

async function courseExists(courseId: string) {
  const rows = await db
    .select({ id: course.id })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  return rows.length > 0;
}

export async function createLesson(courseId: string, input: unknown): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(courseId);
  if (!parsedId.success) return fail(firstError(parsedId.error));
  if (!(await courseExists(parsedId.data))) return fail("Kurs topilmadi");

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
  await writeSuperadminAudit({
    actor: me,
    action: "lesson.create",
    target: parsed.data.title,
    impact: "low",
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

  const existing = await db
    .select({ id: lesson.id })
    .from(lesson)
    .where(eq(lesson.id, parsedId.data))
    .limit(1);
  if (!existing.length) return fail("Dars topilmadi");

  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  await db
    .update(lesson)
    .set({ ...parsed.data, videoUrl: parsed.data.videoUrl || null })
    .where(eq(lesson.id, parsedId.data));
  await writeSuperadminAudit({
    actor: me,
    action: "lesson.update",
    target: parsed.data.title,
    impact: "low",
  });

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

  const deleted = await db
    .delete(lesson)
    .where(and(eq(lesson.id, parsedId.data), eq(lesson.courseId, parsedCourseId.data)))
    .returning({ id: lesson.id, title: lesson.title });
  if (!deleted.length) return fail("Dars topilmadi");

  await syncLessonCount(parsedCourseId.data);
  await writeSuperadminAudit({
    actor: me,
    action: "lesson.delete",
    target: deleted[0]?.title ?? parsedId.data,
    impact: "medium",
  });

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
  // almashtirib bo'lmaydi — vaqtincha bo'sh o'ringa chiqaramiz. Uch qadam bitta
  // atomik `batch`da (neon-http interaktiv tranzaksiyani qo'llamaydi, lekin
  // batch bitta HTTP tranzaksiyada bajariladi): o'rtada uzilib qolsa manfiy
  // `sortOrder` qolib ketmasin.
  const temp = -Date.now();
  await db.batch([
    db.update(lesson).set({ sortOrder: temp }).where(eq(lesson.id, a.id)),
    db.update(lesson).set({ sortOrder: a.sortOrder }).where(eq(lesson.id, b.id)),
    db.update(lesson).set({ sortOrder: b.sortOrder }).where(eq(lesson.id, a.id)),
  ]);

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
  await writeSuperadminAudit({
    actor: me,
    action: "quiz.create",
    target: parsed.data.prompt,
    impact: "low",
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
  await writeSuperadminAudit({
    actor: me,
    action: "quiz.update",
    target: parsed.data.prompt,
    impact: "low",
  });

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  return ok;
}

export async function deleteQuestion(questionId: string): Promise<Result> {
  const me = await requireAdmin();
  await enforceLimit("action", me.id);

  const parsedId = uuidSchema.safeParse(questionId);
  if (!parsedId.success) return fail(firstError(parsedId.error));

  const deleted = await db
    .delete(quizQuestion)
    .where(eq(quizQuestion.id, parsedId.data))
    .returning({ prompt: quizQuestion.prompt });
  await writeSuperadminAudit({
    actor: me,
    action: "quiz.delete",
    target: deleted[0]?.prompt ?? parsedId.data,
    impact: "medium",
  });

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  return ok;
}
