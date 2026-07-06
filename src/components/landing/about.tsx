import { CircuitBoard, Cpu, Layers, Zap } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { GlassCard } from "@/components/ui/glass-card";

const POINTS = [
  { icon: Layers, text: "Bosqichma-bosqich, tushunarli o'quv yo'li" },
  { icon: Cpu, text: "Haqiqiy jihozlar va simulyatsiyalar" },
  { icon: Zap, text: "Interaktiv darslar va tezkor fikr-mulohaza" },
];

export function About() {
  return (
    <section id="about" className="relative scroll-mt-20 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <span className="glass text-foreground/80 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase">
            <span className="bg-accent pulse-glow inline-block size-1.5 rounded-full" />
            PilotKids nima?
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Bolalar uchun <span className="text-gradient">kelajak texnologiyalarining</span> virtual
            maktabi
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            PilotKids — bu robototexnika, dasturlash va sun'iy intellektni o'yin tarzida
            o'rgatadigan onlayn platforma. Biz murakkab muhandislik tushunchalarini bolalar uchun
            qiziqarli va oson qilib taqdim etamiz.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="glass flex size-9 items-center justify-center rounded-xl">
                  <Icon className="text-accent size-5" aria-hidden />
                </span>
                <span className="text-foreground/85">{text}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Plata vizuali (Phase 8'da 3D CircuitBoard bilan) */}
        <Reveal delay={0.1} className="order-1 lg:order-2">
          <GlassCard className="bg-grid relative aspect-[4/3] overflow-hidden" padding="none">
            <div className="bg-accent/20 pointer-events-none absolute -top-10 -right-10 size-52 rounded-full blur-3xl" />
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="relative">
                <div className="border-primary/30 spin-slow absolute -inset-16 rounded-full border border-dashed" />
                <div className="glass glow-cyan animate-float flex size-32 items-center justify-center rounded-3xl">
                  <CircuitBoard className="icon-gradient size-16" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}
