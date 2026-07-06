import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/landing/section-heading";
import { PLANS } from "@/lib/data/landing";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="bg-grid relative scroll-mt-20 overflow-hidden py-24">
      {/* Holo halqa foni (Phase 8'da 3D bilan) */}
      <div
        className="border-primary/10 spin-slow pointer-events-none absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Narxlar"
          title={
            <>
              Sizga mos <span className="text-gradient">rejani</span> tanlang
            </>
          }
          subtitle="Bepul boshlang, tayyor bo'lganingizda Premium'ga o'ting. Yashirin to'lovlar yo'q."
        />

        <div className="mt-14 grid items-stretch gap-6 md:grid-cols-2">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <div
                className={cn(
                  "relative h-full",
                  plan.featured && "border-gradient-signature rounded-2xl",
                )}
              >
                {plan.featured && (
                  <span className="bg-gradient-signature glow-blue absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white">
                    <Sparkles className="size-3.5" /> Eng ommabop
                  </span>
                )}
                <GlassCard
                  variant={plan.featured ? "solid" : "glass"}
                  padding="lg"
                  className={cn("flex h-full flex-col", plan.featured && "border-0")}
                >
                  <div>
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-display text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                          <Check className="size-3.5" />
                        </span>
                        <span className="text-foreground/85">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={plan.featured ? "gradient" : "glass"}
                    size="lg"
                    className="mt-8 w-full"
                  >
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                </GlassCard>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
