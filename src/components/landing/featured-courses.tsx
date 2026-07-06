import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Crown } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/landing/section-heading";
import { FEATURED_COURSES } from "@/lib/data/landing";

export function FeaturedCourses() {
  return (
    <section id="courses" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Kurslar"
          title={
            <>
              Mashhur <span className="text-gradient">kurslar</span>
            </>
          }
          subtitle="Eng ko'p tanlangan kurslardan biri bilan sayohatingizni boshlang."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_COURSES.map((course, i) => (
            <Reveal key={course.title} delay={i * 0.06}>
              <GlassCard
                hover="lift"
                glow="cyan"
                padding="none"
                className="group h-full overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="bg-grid bg-gradient-signature/10 relative flex aspect-video items-center justify-center overflow-hidden">
                  <BookOpen className="icon-gradient size-12 transition-transform group-hover:scale-110" />
                  {course.premium && (
                    <span className="text-premium absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold">
                      <Crown className="size-3.5" /> Premium
                    </span>
                  )}
                </div>
                {/* Ma'lumot */}
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-accent font-medium">{course.category}</span>
                    <span className="text-muted-foreground">· {course.level}</span>
                  </div>
                  <h3 className="font-display leading-snug font-semibold">{course.title}</h3>
                  <div className="text-muted-foreground flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3.5" /> {course.lessons} dars
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {course.hours} soat
                    </span>
                  </div>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-12 flex justify-center">
          <Button asChild variant="glass" size="lg">
            <Link href="/courses">
              Barcha kurslar <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
