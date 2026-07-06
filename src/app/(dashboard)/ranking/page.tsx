import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db, ranks } from "@/lib/db";
import { computeRankInfo, getLeaderboard } from "@/lib/db/queries";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reyting" };

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function RankingPage() {
  const user = await requireUser();
  const [leaders, allRanks] = await Promise.all([getLeaderboard(50), db.select().from(ranks)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header className="text-center">
        <div className="glass glow-cyan mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl">
          <Trophy className="text-premium size-8" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Reyting jadvali</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Eng ko'p XP to'plagan o'quvchilar. O'rganib, yuqoriga ko'tariling!
        </p>
      </header>

      {leaders.length === 0 ? (
        <GlassCard padding="lg" className="text-center">
          <p className="text-muted-foreground">Hozircha reyting bo'sh.</p>
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="divide-border divide-y overflow-hidden">
          {leaders.map((leader, i) => {
            const rankInfo = computeRankInfo(leader.xp, allRanks);
            const isMe = leader.id === user.id;
            return (
              <div
                key={leader.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 transition-colors sm:px-6",
                  isMe && "bg-primary/10",
                )}
              >
                <div className="flex w-8 shrink-0 justify-center">
                  {i < 3 ? (
                    <span className="text-2xl" aria-label={`${i + 1}-o'rin`}>
                      {MEDALS[i]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-display font-semibold">
                      {i + 1}
                    </span>
                  )}
                </div>

                <span
                  className="bg-gradient-signature font-display flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  aria-hidden
                >
                  {leader.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium">
                    {leader.name}
                    {isMe && (
                      <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs">
                        Siz
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {rankInfo.current?.badge} {rankInfo.current?.name}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-gradient font-display font-bold">{leader.xp}</p>
                  <p className="text-muted-foreground text-xs">XP</p>
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}
