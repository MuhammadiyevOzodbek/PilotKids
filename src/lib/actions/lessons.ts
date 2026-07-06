"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, enrollments, lessonCompletions, lessons } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { syncLessonCompletion } from "@/lib/actions/lesson-progress";
import type { ActionResult } from "@/lib/actions/courses";

const idSchema = z.string().uuid("Noto'g'ri dars identifikatori");

export interface ToggleLessonResult extends ActionResult {
  completed?: boolean;
  progress?: number;
}

/**
 * Darsni tugatilgan/tugatilmagan holatiga o'tkazadi va kurs progressini
 * (tugatilgan darslar / jami) qayta hisoblaydi. Barcha darslar tugallanganda
 * kurs yakunlanadi va bonus XP beriladi.
 */
export async function toggleLessonComplete(lessonId: string): Promise<ToggleLessonResult> {
  const user = await requireUser();
  try {
    const parsed = idSchema.safeParse(lessonId);
    if (!parsed.success) return { ok: false, error: "Noto'g'ri dars" };

    const [lesson] = await db
      .select({ id: lessons.id, courseId: lessons.courseId })
      .from(lessons)
      .where(eq(lessons.id, parsed.data))
      .limit(1);
    if (!lesson) return { ok: false, error: "Dars topilmadi" };

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, lesson.courseId)))
      .limit(1);
    if (!enrollment) return { ok: false, error: "Avval kursga yoziling" };

    // Joriy holat
    const [existing] = await db
      .select({ id: lessonCompletions.id })
      .from(lessonCompletions)
      .where(and(eq(lessonCompletions.userId, user.id), eq(lessonCompletions.lessonId, lesson.id)))
      .limit(1);

    // XP simmetrik: belgilashda +LESSON_XP, olib tashlashda -LESSON_XP.
    // Shu tufayli darsni takroran off/on qilib XP yig'ib bo'lmaydi.
    if (existing) {
      await db.delete(lessonCompletions).where(eq(lessonCompletions.id, existing.id));
    } else {
      await db
        .insert(lessonCompletions)
        .values({ userId: user.id, lessonId: lesson.id })
        .onConflictDoNothing({ target: [lessonCompletions.userId, lessonCompletions.lessonId] });
    }

    const { progress, courseJustCompleted } = await syncLessonCompletion({
      userId: user.id,
      courseId: lesson.courseId,
      enrollment,
      changed: existing ? "uncompleted" : "completed",
    });

    return {
      ok: true,
      completed: !existing,
      progress,
      message: courseJustCompleted ? "Tabriklaymiz, kursni yakunladingiz! 🎉" : undefined,
    };
  } catch (e) {
    console.error("[toggleLessonComplete]", e);
    return { ok: false, error: "Kutilmagan xatolik. Qaytadan urinib ko'ring." };
  }
}
