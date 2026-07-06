import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Crown } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { DIFFICULTY_LABELS } from "@/lib/course-utils";
import type { Course } from "@/lib/db/schema";

export type CourseWithMeta = Course & { categoryName: string | null };

export function CourseCard({ course, enrolled }: { course: CourseWithMeta; enrolled?: boolean }) {
  return (
    <Link href={`/courses/${course.slug}`} className="group block h-full">
      <GlassCard
        hover="lift"
        glow="cyan"
        padding="none"
        className="flex h-full flex-col overflow-hidden"
      >
        <div className="bg-grid relative flex aspect-video items-center justify-center overflow-hidden">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <BookOpen
              className="icon-gradient size-12 transition-transform group-hover:scale-110"
              aria-hidden
            />
          )}
          {course.isPremium && (
            <span className="text-premium absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold">
              <Crown className="size-3.5" /> Premium
            </span>
          )}
          {enrolled && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500">
              <CheckCircle2 className="size-3.5" /> Yozilgan
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-center gap-2 text-xs">
            {course.categoryName && (
              <span className="text-accent font-medium">{course.categoryName}</span>
            )}
            <span className="text-muted-foreground">· {DIFFICULTY_LABELS[course.difficulty]}</span>
          </div>
          <h3 className="font-display leading-snug font-semibold">{course.title}</h3>
          <p className="text-muted-foreground line-clamp-2 flex-1 text-sm">{course.description}</p>
          <div className="text-muted-foreground flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3.5" /> {course.totalLessons} dars
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {course.durationHours} soat
            </span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
