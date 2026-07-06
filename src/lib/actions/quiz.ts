"use server";

import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db, enrollments, lessonCompletions, lessons, quizQuestions } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { syncLessonCompletion } from "@/lib/actions/lesson-progress";
import type { ActionResult } from "@/lib/actions/courses";

const PASS_THRESHOLD = 70; // Foizda — shu balldan yuqori bo'lsa dars yakunlanadi

const submitSchema = z.object({
  lessonId: z.string().uuid("Noto'g'ri dars"),
  answers: z.array(z.number().int().min(0)).min(1, "Javob berilmadi"),
});

export interface QuizResult extends ActionResult {
  score?: number;
  correct?: number;
  total?: number;
  passed?: boolean;
  /** Har bir savol to'g'ri javob berilganmi (savol tartibida). */
  results?: boolean[];
  /** Test o'tib, dars shu urinishda yakunlandimi. */
  lessonCompleted?: boolean;
}

/**
 * Test javoblarini SERVER tomonda baholaydi. To'g'ri javoblar hech qachon
 * mijozga yuborilmaydi. {PASS_THRESHOLD}% dan yuqori ball to'plansa va dars
 * hali yakunlanmagan bo'lsa — dars avtomatik yakunlanadi (+XP).
 */
export async function submitQuiz(input: {
  lessonId: string;
  answers: number[];
}): Promise<QuizResult> {
  const user = await requireUser();
  try {
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" };
    }
    const { lessonId, answers } = parsed.data;

    const [lesson] = await db
      .select({ id: lessons.id, courseId: lessons.courseId })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    if (!lesson) return { ok: false, error: "Dars topilmadi" };

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, lesson.courseId)))
      .limit(1);
    if (!enrollment) return { ok: false, error: "Avval kursga yoziling" };

    const questions = await db
      .select({ correctIndex: quizQuestions.correctIndex })
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lessonId))
      .orderBy(asc(quizQuestions.order));
    if (questions.length === 0) return { ok: false, error: "Bu darsda test yo'q" };

    // Baholash
    const results = questions.map((q, i) => answers[i] === q.correctIndex);
    const correct = results.filter(Boolean).length;
    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= PASS_THRESHOLD;

    // O'tgan bo'lsa va dars hali yakunlanmagan bo'lsa — yakunlaymiz
    let lessonCompleted = false;
    let courseJustCompleted = false;
    if (passed) {
      const [existing] = await db
        .select({ id: lessonCompletions.id })
        .from(lessonCompletions)
        .where(and(eq(lessonCompletions.userId, user.id), eq(lessonCompletions.lessonId, lessonId)))
        .limit(1);

      if (!existing) {
        await db
          .insert(lessonCompletions)
          .values({ userId: user.id, lessonId })
          .onConflictDoNothing({
            target: [lessonCompletions.userId, lessonCompletions.lessonId],
          });
        const sync = await syncLessonCompletion({
          userId: user.id,
          courseId: lesson.courseId,
          enrollment,
          changed: "completed",
        });
        lessonCompleted = true;
        courseJustCompleted = sync.courseJustCompleted;
      }
    }

    const message = courseJustCompleted
      ? "Ajoyib! Test o'tdingiz va kursni yakunladingiz! 🎉"
      : passed
        ? lessonCompleted
          ? "Barakalla! Test o'tdingiz, dars yakunlandi ✅"
          : "Test o'tdingiz ✅"
        : "Ballingiz yetarli emas — qayta urinib ko'ring.";

    return { ok: true, score, correct, total, passed, results, lessonCompleted, message };
  } catch (e) {
    console.error("[submitQuiz]", e);
    return { ok: false, error: "Kutilmagan xatolik. Qaytadan urinib ko'ring." };
  }
}
