import { Quote } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/landing/section-heading";
import { TESTIMONIALS } from "@/lib/data/landing";

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-grid relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Fikrlar"
          title={
            <>
              Foydalanuvchilar <span className="text-gradient">fikri</span>
            </>
          }
          subtitle="Ota-onalar va o'quvchilar PilotKids haqida nima deyishadi."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <GlassCard padding="lg" hover="lift" className="flex h-full flex-col">
                <Quote className="text-accent/60 size-8" aria-hidden />
                <p className="text-foreground/90 mt-4 flex-1 leading-relaxed">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="bg-gradient-signature flex size-11 items-center justify-center rounded-full text-white">
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
