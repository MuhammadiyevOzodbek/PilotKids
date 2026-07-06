import Link from "next/link";
import { Bot, CircuitBoard, Cpu, Rocket, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { STATS } from "@/lib/data/landing";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24 pb-16">
      {/* Fon glow'lari */}
      <div className="bg-primary/20 pointer-events-none absolute top-1/4 -left-32 size-96 rounded-full blur-3xl" />
      <div className="bg-accent/20 pointer-events-none absolute right-0 bottom-0 size-96 rounded-full blur-3xl" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        {/* Chap: matn */}
        <div className="space-y-8 text-center lg:text-left">
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
              <span className="bg-accent pulse-glow inline-block size-2 rounded-full" />
              Robototexnika Akademiyasi
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="font-display text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
              Robototexnikani
              <br />
              <span className="text-gradient">Onlayn O'rganing</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-muted-foreground mx-auto max-w-xl text-lg lg:mx-0">
              8–18 yoshli bolalar uchun amaliy loyihalar, tajribali mentorlar va zamonaviy o'quv
              yo'li. Kelajak muhandislari shu yerda boshlanadi.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Button asChild magnetic variant="gradient" size="lg">
                <Link href="/register">
                  <Bot className="size-5" /> Boshlash
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link href="/#pricing">
                  <Rocket className="size-5" /> Bepul Sinov
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <dl className="grid max-w-md grid-cols-3 gap-4 pt-4">
              {STATS.map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-gradient font-display text-3xl font-bold sm:text-4xl">
                    {s.value}
                  </dd>
                  <dd className="text-muted-foreground text-sm">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* O'ng: dekorativ vizual (Phase 8'da 3D bilan to'ldiriladi) */}
        <div className="relative hidden lg:block" aria-hidden>
          <div className="relative mx-auto flex aspect-square max-w-md items-center justify-center">
            {/* Aylanma halqalar */}
            <div className="border-primary/30 spin-slow absolute inset-0 rounded-full border-2 border-dashed" />
            <div
              className="border-accent/30 spin-slow absolute inset-8 rounded-full border-2 border-dashed"
              style={{ animationDirection: "reverse", animationDuration: "18s" }}
            />
            {/* Markaziy robot */}
            <div className="glass glow-blue animate-float flex size-40 items-center justify-center rounded-3xl">
              <Bot className="icon-gradient size-20" strokeWidth={1.5} />
            </div>
            {/* Suzuvchi chiplar */}
            <FloatingChip className="top-4 left-8" icon={Cpu} delay="0s" />
            <FloatingChip className="right-6 bottom-10" icon={CircuitBoard} delay="1.5s" />
            <FloatingChip className="top-16 right-2" icon={Zap} delay="0.8s" />
            <FloatingChip className="bottom-4 left-14" icon={Sparkles} delay="2.2s" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingChip({
  className,
  icon: Icon,
  delay,
}: {
  className: string;
  icon: typeof Cpu;
  delay: string;
}) {
  return (
    <div
      className={`glass animate-float absolute flex size-12 items-center justify-center rounded-2xl ${className}`}
      style={{ animationDelay: delay }}
    >
      <Icon className="text-accent size-6" />
    </div>
  );
}
