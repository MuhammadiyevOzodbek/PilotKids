import { Trophy } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/landing/section-heading";
import { ACHIEVEMENTS } from "@/lib/data/landing";

export function Achievements() {
  return (
    <section className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Yutuqlar"
          title={
            <>
              Har bir qadam uchun <span className="text-gradient">mukofot</span>
            </>
          }
          subtitle="O'rganish davomida XP to'plang, darajalar oshiring va noyob medallarni qo'lga kiriting."
        />

        {/* Trophy vizuali (Phase 8'da 3D Trophy) */}
        <Reveal className="mt-14 flex justify-center">
          <div
            className="glass glow-cyan animate-float flex size-28 items-center justify-center rounded-3xl"
            aria-hidden
          >
            <Trophy className="text-premium size-14" strokeWidth={1.5} />
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ACHIEVEMENTS.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.06}>
              <GlassCard
                hover="lift"
                padding="md"
                className="group relative h-full overflow-hidden text-center"
              >
                {/* Shimmer qatlami */}
                <span className="shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
                <div
                  className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${a.glow} ring-1 ring-white/10 transition-transform group-hover:scale-110`}
                >
                  <a.icon className={`size-7 ${a.color}`} strokeWidth={1.75} />
                </div>
                <h3 className="font-display mt-3 text-sm font-semibold">{a.title}</h3>
                <p className="text-muted-foreground mt-1 text-xs">{a.description}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
