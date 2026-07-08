import { Reveal } from "@/components/ui/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/landing/section-heading";
import { ROADMAP } from "@/lib/data/landing";
import { cn } from "@/lib/utils";

export function Roadmap() {
  return (
    <section id="roadmap" className="bg-grid relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Yo'l xaritasi"
          title={
            <>
              Bilimdan <span className="text-gradient">mahoratgacha</span>
            </>
          }
          subtitle="Noldan boshlab, bosqichma-bosqich haqiqiy muhandisga aylanasiz."
        />

        <div className="relative mt-16">
          {/* Markaziy chiziq (desktop) */}
          <div className="via-primary/40 absolute top-0 left-1/2 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-transparent lg:block" />
          {/* Chap chiziq (mobil) */}
          <div className="via-primary/40 absolute top-0 left-[27px] h-full w-px bg-gradient-to-b from-transparent to-transparent lg:hidden" />

          <ul className="space-y-8 lg:space-y-12">
            {ROADMAP.map((item, i) => {
              const rightSide = i % 2 === 1;
              return (
                <li
                  key={item.step}
                  className={cn(
                    "relative flex items-center gap-6 lg:gap-0",
                    rightSide ? "lg:flex-row-reverse" : "lg:flex-row",
                  )}
                >
                  {/* Raqamli tugun */}
                  <div className="relative z-10 shrink-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                    <div className="bg-gradient-signature glow-blue font-display flex size-14 items-center justify-center rounded-2xl text-xl font-bold text-white">
                      {item.step}
                    </div>
                  </div>

                  {/* Karta */}
                  <div className="flex-1 lg:w-1/2 lg:flex-none lg:px-12">
                    <Reveal delay={i * 0.04}>
                      <GlassCard hover="lift" padding="lg">
                        <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                        <p className="text-muted-foreground mt-1.5 text-sm">{item.description}</p>
                      </GlassCard>
                    </Reveal>
                  </div>

                  {/* Bo'sh yarim (desktop muvozanat) */}
                  <div className="hidden lg:block lg:w-1/2" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
