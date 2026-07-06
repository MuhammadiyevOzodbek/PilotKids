import { GlassCard } from "@/components/ui/glass-card";
import type { RankInfo } from "@/lib/db/queries";

export function RankProgress({ xp, rankInfo }: { xp: number; rankInfo: RankInfo }) {
  const { current, next, progressToNext, xpToNext } = rankInfo;
  const pct = Math.round(progressToNext * 100);

  return (
    <GlassCard padding="lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden>
            {current?.badge ?? "🎯"}
          </span>
          <div>
            <p className="text-muted-foreground text-xs">Joriy daraja</p>
            <p className="font-display text-lg font-bold">{current?.name ?? "—"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gradient font-display text-2xl font-bold">{xp}</p>
          <p className="text-muted-foreground text-xs">XP</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
          <span>{current?.name ?? ""}</span>
          <span>{next ? next.name : "Maksimal daraja"}</span>
        </div>
        <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-gradient-signature h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {next
            ? `Keyingi darajagacha ${xpToNext} XP qoldi`
            : "Tabriklaymiz — eng yuqori darajaga yetdingiz!"}
        </p>
      </div>
    </GlassCard>
  );
}
