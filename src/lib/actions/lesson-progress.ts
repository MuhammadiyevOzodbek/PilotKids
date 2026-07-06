import "server-only";
import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db, courses, enrollments, lessonCompletions, lessons, notifications } from "@/lib/db";
import { applyXp } from "@/lib/xp";
import type { Enrollment } from "@/lib/db/schema";

export const LESSON_XP = 15; // Har bir tugatilgan dars uchun
export const COURSE_BONUS_XP = 100; // Kurs to'liq yakunlanganda bir marta

export interface SyncResult {
  progress: number;
  courseJustCompleted: boolean;
}

/**
 * Dars belgisi o'zgargandan SO'NG (yozuv qo'shilgan/o'chirilgan) chaqiriladi:
 * kurs progressini qayta hisoblaydi, XP'ni simmetrik qo'llaydi (+/-LESSON_XP),
 * kurs to'liq yakunlanish holatiga o'tsa bonus beradi (yoki qaytaradi) va
 * tegishli sahifalarni yangilaydi.
 *
 * `toggleLessonComplete` ham, `submitQuiz` ham shu yagona manbadan foydalanadi.
 */
export async function syncLessonCompletion(params: {
  userId: string;
  courseId: string;
  enrollment: Enrollment;
  changed: "completed" | "uncompleted";
}): Promise<SyncResult> {
  const { userId, courseId, enrollment, changed } = params;
  const xpDelta = changed === "completed" ? LESSON_XP : -LESSON_XP;

  const [{ total }] = await db
    .select({ total: count() })
    .from(lessons)
    .where(eq(lessons.courseId, courseId));

  const completedRows = await db
    .select({ id: lessonCompletions.id })
    .from(lessonCompletions)
    .innerJoin(lessons, eq(lessonCompletions.lessonId, lessons.id))
    .where(and(eq(lessonCompletions.userId, userId), eq(lessons.courseId, courseId)));
  const completedCount = completedRows.length;

  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const wasCompleted = enrollment.completedAt !== null;
  const isNowComplete = total > 0 && completedCount >= total;

  await db
    .update(enrollments)
    .set({
      progressPercent: progress,
      completedAt: isNowComplete ? (enrollment.completedAt ?? new Date()) : null,
    })
    .where(eq(enrollments.id, enrollment.id));

  await applyXp(userId, xpDelta);

  let courseJustCompleted = false;
  if (!wasCompleted && isNowComplete) {
    await applyXp(userId, COURSE_BONUS_XP);
    courseJustCompleted = true;
    const [course] = await db
      .select({ title: courses.title })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    if (course) {
      await db.insert(notifications).values({
        userId,
        message: `"${course.title}" kursini yakunladingiz! 🎉 +${COURSE_BONUS_XP} XP bonus`,
      });
    }
  } else if (wasCompleted && !isNowComplete) {
    await applyXp(userId, -COURSE_BONUS_XP);
  }

  const [course] = await db
    .select({ slug: courses.slug })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (course) revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");

  return { progress, courseJustCompleted };
}
