import { Reveal } from "@/components/ui/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/landing/section-heading";
import { BENEFITS } from "@/lib/data/landing";

export function Benefits() {
  return (
    <section id="benefits" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Afzalliklar"
          title={
            <>
              Nega aynan <span className="text-gradient">PilotKids?</span>
            </>
          }
          subtitle="Bolangizning muhandislik sayohatini qiziqarli va samarali qiladigan hamma narsa."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit, i) => (
            <Reveal key={benefit.title} delay={i * 0.06}>
              <GlassCard hover="lift" glow="blue" padding="lg" className="group h-full">
                <div className="bg-gradient-signature glow-blue mb-4 flex size-12 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-110">
                  <benefit.icon className="size-6" aria-hidden />
                </div>
                <h3 className="font-display text-lg font-semibold">{benefit.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
