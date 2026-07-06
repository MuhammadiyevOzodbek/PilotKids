"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, PlayCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/auth/form-error";
import { advanceCourseProgress, enrollCourse } from "@/lib/actions/courses";

interface CourseActionsProps {
  courseId: string;
  isEnrolled: boolean;
  progress: number;
  completed: boolean;
  isPremium: boolean;
  canAccess: boolean;
  /** Kursda darslar bo'lsa, progress darslar orqali boshqariladi. */
  hasLessons?: boolean;
}

export function CourseActions({
  courseId,
  isEnrolled,
  progress,
  completed,
  isPremium,
  canAccess,
  hasLessons = false,
}: CourseActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) setSuccess(res.message ?? null);
      else setError(res.error ?? "Xatolik yuz berdi");
      router.refresh();
    });
  }

  if (isPremium && !canAccess && !isEnrolled) {
    return (
      <div className="space-y-3">
        <div className="glass flex items-center gap-3 rounded-xl p-4">
          <Lock className="text-premium size-5 shrink-0" aria-hidden />
          <p className="text-sm">Bu Premium kurs — kirish uchun obunani faollashtiring.</p>
        </div>
        <Button asChild variant="gradient" size="lg" className="w-full">
          <a href="/subscription">Premium olish</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <FormSuccess message={success} />

      {!isEnrolled ? (
        <Button
          type="button"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => run(() => enrollCourse(courseId))}
        >
          <Plus className="size-5" />
          {pending ? "Yozilmoqda…" : "Kursga yozilish"}
        </Button>
      ) : completed ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-sm font-medium text-emerald-500">
          <CheckCircle2 className="size-5" /> Kurs yakunlandi 🎉
        </div>
      ) : hasLessons ? (
        <div className="text-muted-foreground bg-muted/50 rounded-xl py-3 text-center text-sm">
          Darslarni belgilab, kursni yakunlang 👇
        </div>
      ) : (
        <Button
          type="button"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => run(() => advanceCourseProgress(courseId))}
        >
          <PlayCircle className="size-5" />
          {pending ? "Saqlanmoqda…" : `Davom etish (${progress}%)`}
        </Button>
      )}
    </div>
  );
}
