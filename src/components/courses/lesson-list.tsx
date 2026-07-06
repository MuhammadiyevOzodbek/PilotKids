"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock, HelpCircle, Loader2, Lock } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { toggleLessonComplete } from "@/lib/actions/lessons";
import { LessonQuiz } from "@/components/courses/lesson-quiz";
import type { PublicQuizQuestion } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export interface LessonItem {
  id: string;
  title: string;
  content: string;
  order: number;
  durationMinutes: number;
}

export function LessonList({
  lessons,
  completedIds,
  isEnrolled,
  quizzesByLesson = {},
}: {
  lessons: LessonItem[];
  completedIds: string[];
  isEnrolled: boolean;
  quizzesByLesson?: Record<string, PublicQuizQuestion[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completed = new Set(completedIds);

  function toggle(id: string) {
    if (!isEnrolled || pending) return;
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await toggleLessonComplete(id);
      if (!res.ok) setError(res.error ?? "Xatolik yuz berdi");
      setBusyId(null);
      router.refresh();
    });
  }

  const doneCount = lessons.filter((l) => completed.has(l.id)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Darslar</h2>
        <span className="text-muted-foreground text-sm">
          {doneCount}/{lessons.length} tugatildi
        </span>
      </div>

      <FormError message={error} />

      {!isEnrolled && (
        <div className="glass text-muted-foreground flex items-center gap-2 rounded-xl p-3 text-sm">
          <Lock className="size-4 shrink-0" aria-hidden />
          Darslarni belgilash uchun avval kursga yoziling.
        </div>
      )}

      <ul className="space-y-2">
        {lessons.map((lesson) => {
          const isDone = completed.has(lesson.id);
          const isOpen = openId === lesson.id;
          const isBusy = busyId === lesson.id;
          const quiz = quizzesByLesson[lesson.id] ?? [];
          return (
            <li key={lesson.id} className="glass overflow-hidden rounded-xl">
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => toggle(lesson.id)}
                  disabled={!isEnrolled || pending}
                  aria-pressed={isDone}
                  aria-label={isDone ? "Tugatildi deb belgilangan" : "Tugatildi deb belgilash"}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-input hover:border-primary text-transparent",
                    (!isEnrolled || pending) && "cursor-not-allowed opacity-60",
                  )}
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin text-current" aria-hidden />
                  ) : (
                    <Check className="size-4" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : lesson.id)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-sm font-medium",
                        isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {lesson.order}. {lesson.title}
                    </span>
                    <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden /> {lesson.durationMinutes} daqiqa
                      </span>
                      {quiz.length > 0 && (
                        <span className="text-accent inline-flex items-center gap-1 font-medium">
                          <HelpCircle className="size-3" aria-hidden /> Test
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
              </div>

              {isOpen && lesson.content && (
                <div className="text-muted-foreground border-border/60 border-t px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
                  {lesson.content}
                </div>
              )}

              {isOpen && quiz.length > 0 && (
                <LessonQuiz lessonId={lesson.id} questions={quiz} isEnrolled={isEnrolled} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
