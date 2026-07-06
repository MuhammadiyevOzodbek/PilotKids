import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Crown, Layers } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db, categories } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  getCompletedLessonIds,
  getCourseBySlug,
  getCourseLessons,
  getCourseQuizzes,
  getEnrollment,
  isUserPremium,
} from "@/lib/db/queries";
import { GlassCard } from "@/components/ui/glass-card";
import { CourseActions } from "@/components/courses/course-actions";
import { LessonList } from "@/components/courses/lesson-list";
import { DIFFICULTY_LABELS } from "@/lib/course-utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return { title: course?.title ?? "Kurs" };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const [enrollment, premium, categoryRow, lessons, completedIds, quizzesByLesson] =
    await Promise.all([
      getEnrollment(user.id, course.id),
      isUserPremium(user.id),
      course.categoryId
        ? db.select().from(categories).where(eq(categories.id, course.categoryId)).limit(1)
        : Promise.resolve([]),
      getCourseLessons(course.id),
      getCompletedLessonIds(user.id, course.id),
      getCourseQuizzes(course.id),
    ]);
  const categoryName = categoryRow[0]?.name ?? null;
  const isEnrolled = enrollment !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <Link
        href="/courses"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" /> Kurslarga qaytish
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <GlassCard
            padding="none"
            className="bg-grid relative flex aspect-video items-center justify-center overflow-hidden"
          >
            {course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <BookOpen className="icon-gradient size-20" strokeWidth={1.2} aria-hidden />
            )}
          </GlassCard>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {categoryName && (
                <span className="glass rounded-full px-3 py-1 font-medium">{categoryName}</span>
              )}
              <span className="glass rounded-full px-3 py-1">
                {DIFFICULTY_LABELS[course.difficulty]}
              </span>
              {course.isPremium && (
                <span className="text-premium inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 font-semibold">
                  <Crown className="size-3.5" /> Premium
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{course.description}</p>
          </div>

          {lessons.length > 0 && (
            <GlassCard padding="lg">
              <LessonList
                lessons={lessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  content: l.content,
                  order: l.order,
                  durationMinutes: l.durationMinutes,
                }))}
                completedIds={[...completedIds]}
                isEnrolled={isEnrolled}
                quizzesByLesson={quizzesByLesson}
              />
            </GlassCard>
          )}
        </div>

        <aside className="space-y-6">
          <GlassCard padding="lg" className="space-y-4">
            <h2 className="font-display font-semibold">Kurs haqida</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <BookOpen className="text-accent size-5" aria-hidden />
                <span>{course.totalLessons} ta dars</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="text-accent size-5" aria-hidden />
                <span>{course.durationHours} soat davomiylik</span>
              </li>
              <li className="flex items-center gap-3">
                <Layers className="text-accent size-5" aria-hidden />
                <span>{DIFFICULTY_LABELS[course.difficulty]} daraja</span>
              </li>
            </ul>

            {enrollment && (
              <div className="space-y-1.5">
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>Progress</span>
                  <span>{enrollment.progressPercent}%</span>
                </div>
                <div
                  className="bg-muted h-2 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuenow={enrollment.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Kurs progressi"
                >
                  <div
                    className="bg-gradient-signature h-full rounded-full transition-all duration-700"
                    style={{ width: `${enrollment.progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <CourseActions
              courseId={course.id}
              isEnrolled={isEnrolled}
              progress={enrollment?.progressPercent ?? 0}
              completed={enrollment?.completedAt !== null && enrollment?.completedAt !== undefined}
              isPremium={course.isPremium}
              canAccess={premium}
              hasLessons={lessons.length > 0}
            />
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}
