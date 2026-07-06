import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <GlassCard hover="lift" padding="md" className="flex items-center gap-4">
      <span className="bg-gradient-signature glow-blue flex size-12 shrink-0 items-center justify-center rounded-2xl text-white">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="font-display truncate text-2xl font-bold">{value}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
    </GlassCard>
  );
}
