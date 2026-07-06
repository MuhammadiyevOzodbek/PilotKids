import Link from "next/link";
import { Bot, Rocket } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <div className="bg-circuit glow-blue border-border relative overflow-hidden rounded-3xl border px-6 py-16 text-center sm:px-12">
            <div className="bg-primary/20 pointer-events-none absolute -top-20 -left-20 size-72 rounded-full blur-3xl" />
            <div className="bg-accent/20 pointer-events-none absolute -right-20 -bottom-20 size-72 rounded-full blur-3xl" />

            {/* Qo'l silkituvchi robot (Phase 8'da 3D) */}
            <div
              className="animate-float relative mx-auto mb-8 flex size-24 items-center justify-center"
              aria-hidden
            >
              <div className="border-accent/30 spin-slow absolute inset-0 rounded-full border-2 border-dashed" />
              <div className="glass glow-cyan flex size-20 items-center justify-center rounded-3xl">
                <Bot className="icon-gradient size-11" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="font-display relative text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Kelajakni <span className="text-gradient">bugun</span> boshlang
            </h2>
            <p className="text-muted-foreground relative mx-auto mt-4 max-w-xl text-lg">
              Bepul ro'yxatdan o'ting va bolangizni kelajak muhandisiga aylantiring. Birinchi dars
              hoziroq sizni kutmoqda.
            </p>

            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild magnetic variant="gradient" size="lg">
                <Link href="/register">
                  <Rocket className="size-5" /> Bepul boshlash
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link href="/login">Hisobim bor</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
