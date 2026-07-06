import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import type { EnrollmentWithCourse } from "@/lib/db/queries";

export function EnrolledCourses({ items }: { items: EnrollmentWithCourse[] }) {
  return (
    <GlassCard padding="lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display flex items-center gap-2 font-semibold">
          <BookOpen className="size-5" aria-hidden /> Mening kurslarim
        </h3>
        <Link
          href="/courses"
          className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          Barchasi <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-muted-foreground text-sm">Siz hali birorta kursga yozilmagansiz.</p>
          <Button asChild variant="gradient" size="sm">
            <Link href="/courses">Kurslarni ko'rish</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((e) => {
            const done = e.completedAt !== null;
            return (
              <li key={e.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {done && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden />
                    )}
                    <Link
                      href={`/courses/${e.course.slug}`}
                      className="hover:text-primary truncate text-sm font-medium transition-colors"
                    >
                      {e.course.title}
                    </Link>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {e.progressPercent}%
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-gradient-signature h-full rounded-full transition-all duration-700"
                    style={{ width: `${e.progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={e.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${e.course.title} progressi`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
