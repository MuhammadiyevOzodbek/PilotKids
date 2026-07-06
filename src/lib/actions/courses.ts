"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, courses, enrollments, notifications } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isUserPremium } from "@/lib/db/queries";
import { applyXp } from "@/lib/xp";

const idSchema = z.string().uuid("Noto'g'ri kurs identifikatori");

export interface ActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

function revalidateAll(slug?: string) {
  revalidatePath("/courses");
  if (slug) revalidatePath(`/courses/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/ranking");
}

/** Kursga yozilish (+25 XP). Premium kurslar aktiv obuna talab qiladi. */
export async function enrollCourse(courseId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const parsed = idSchema.safeParse(courseId);
    if (!parsed.success) return { ok: false, error: "Noto'g'ri kurs" };

    const [course] = await db.select().from(courses).where(eq(courses.id, parsed.data)).limit(1);
    if (!course) return { ok: false, error: "Kurs topilmadi" };

    if (course.isPremium && !(await isUserPremium(user.id))) {
      return { ok: false, error: "Bu kurs Premium obuna talab qiladi" };
    }

    const [existing] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id)))
      .limit(1);
    if (existing) return { ok: true, message: "Siz allaqachon bu kursga yozilgansiz" };

    // Poyga holatida (bir vaqtning o'zida ikki so'rov) unique cheklov ishga
    // tushishi mumkin — onConflictDoNothing bilan xatoni toza qaytaramiz.
    const inserted = await db
      .insert(enrollments)
      .values({ userId: user.id, courseId: course.id, progressPercent: 0 })
      .onConflictDoNothing({ target: [enrollments.userId, enrollments.courseId] })
      .returning({ id: enrollments.id });

    if (inserted.length === 0) {
      return { ok: true, message: "Siz allaqachon bu kursga yozilgansiz" };
    }

    await applyXp(user.id, 25);
    await db.insert(notifications).values({
      userId: user.id,
      message: `"${course.title}" kursiga yozildingiz. +25 XP! 🎯`,
    });

    revalidateAll(course.slug);
    return { ok: true, message: "Kursga muvaffaqiyatli yozildingiz!" };
  } catch (e) {
    console.error("[enrollCourse]", e);
    return { ok: false, error: "Kutilmagan xatolik. Qaytadan urinib ko'ring." };
  }
}

/** Kurs progressini oshiradi. 100% da yakunlanadi (+100 XP bonus). */
export async function advanceCourseProgress(courseId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const parsed = idSchema.safeParse(courseId);
    if (!parsed.success) return { ok: false, error: "Noto'g'ri kurs" };

    const [enr] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, parsed.data)))
      .limit(1);
    if (!enr) return { ok: false, error: "Avval kursga yoziling" };
    if (enr.completedAt) return { ok: true, message: "Kurs allaqachon yakunlangan" };

    const newProgress = Math.min(100, enr.progressPercent + 25);
    const completed = newProgress >= 100;

    await db
      .update(enrollments)
      .set({ progressPercent: newProgress, completedAt: completed ? new Date() : null })
      .where(eq(enrollments.id, enr.id));
    await applyXp(user.id, completed ? 100 : 20);

    const [course] = await db
      .select({ slug: courses.slug, title: courses.title })
      .from(courses)
      .where(eq(courses.id, parsed.data))
      .limit(1);

    if (completed && course) {
      await db.insert(notifications).values({
        userId: user.id,
        message: `"${course.title}" kursini yakunladingiz! 🎉 +100 XP`,
      });
    }

    revalidateAll(course?.slug);
    return {
      ok: true,
      message: completed ? "Tabriklaymiz, kursni yakunladingiz! 🎉" : `Progress: ${newProgress}%`,
    };
  } catch (e) {
    console.error("[advanceCourseProgress]", e);
    return { ok: false, error: "Kutilmagan xatolik. Qaytadan urinib ko'ring." };
  }
}
