"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HelpCircle, Loader2, XCircle } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { submitQuiz, type QuizResult } from "@/lib/actions/quiz";
import type { PublicQuizQuestion } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export function LessonQuiz({
  lessonId,
  questions,
  isEnrolled,
}: {
  lessonId: string;
  questions: PublicQuizQuestion[];
  isEnrolled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = answers.every((a) => a !== null);

  function choose(qIndex: number, optIndex: number) {
    if (result?.passed) return; // O'tgandan keyin o'zgartirmaymiz
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  }

  function submit() {
    if (!isEnrolled || !allAnswered || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz({
        lessonId,
        answers: answers.map((a) => a ?? -1),
      });
      if (!res.ok) {
        setError(res.error ?? "Xatolik yuz berdi");
        return;
      }
      setResult(res);
      if (res.lessonCompleted) router.refresh();
    });
  }

  function retry() {
    setResult(null);
    setAnswers(questions.map(() => null));
    setError(null);
  }

  const graded = result?.results;

  return (
    <div className="border-border/60 space-y-4 border-t px-4 py-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="text-accent size-4" aria-hidden />
        <h4 className="text-sm font-semibold">Bilimni tekshirish</h4>
        {result && (
          <span
            className={cn(
              "ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold",
              result.passed ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500",
            )}
          >
            {result.score}% ({result.correct}/{result.total})
          </span>
        )}
      </div>

      {!isEnrolled && (
        <p className="text-muted-foreground text-xs">Testni yechish uchun kursga yoziling.</p>
      )}

      <ol className="space-y-4">
        {questions.map((q, qi) => (
          <li key={q.id} className="space-y-2">
            <p className="text-sm font-medium">
              {qi + 1}. {q.prompt}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                const isGraded = graded !== undefined;
                const isThisCorrectlyAnswered = isGraded && selected && graded[qi];
                const isThisWrong = isGraded && selected && !graded[qi];
                return (
                  <label
                    key={oi}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                      isThisCorrectlyAnswered && "border-emerald-500 bg-emerald-500/10",
                      isThisWrong && "border-red-500 bg-red-500/10",
                      (!isEnrolled || result?.passed) && "cursor-default",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={selected}
                      onChange={() => choose(qi, oi)}
                      disabled={!isEnrolled || result?.passed || pending}
                      className="text-primary size-4 shrink-0"
                    />
                    <span className="flex-1">{opt}</span>
                    {isThisCorrectlyAnswered && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden />
                    )}
                    {isThisWrong && (
                      <XCircle className="size-4 shrink-0 text-red-500" aria-hidden />
                    )}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <FormError message={error} />

      {result && (
        <p
          className={cn("text-sm font-medium", result.passed ? "text-emerald-500" : "text-red-500")}
          role="status"
        >
          {result.message}
        </p>
      )}

      {!result?.passed && (
        <button
          type="button"
          onClick={result ? retry : submit}
          disabled={!isEnrolled || (!result && !allAnswered) || pending}
          className="bg-gradient-signature glow-blue inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {result ? "Qayta urinish" : pending ? "Tekshirilmoqda…" : "Tekshirish"}
        </button>
      )}
    </div>
  );
}
