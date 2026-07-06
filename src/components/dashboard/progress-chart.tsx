"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { useThemeStore } from "@/store/useThemeStore";

export interface ChartDatum {
  name: string;
  progress: number;
}

const COLORS = ["#38bdf8", "#06b6d4", "#2563eb", "#0ea5e9", "#3b82f6"];

export function ProgressChart({ data }: { data: ChartDatum[] }) {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const isDark = resolvedTheme === "dark";
  // Temaga mos o'q va tooltip ranglari (yorug' rejimda ham o'qiladi)
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.98)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,0.9)";
  const tooltipText = isDark ? "#f1f5f9" : "#0f172a";
  const cursorFill = isDark ? "rgba(148,163,184,0.1)" : "rgba(100,116,139,0.08)";

  if (data.length === 0) {
    return (
      <GlassCard padding="lg" className="flex h-full min-h-64 items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Hali kurslar yo'q — birinchi kursga yoziling va progressingiz shu yerda ko'rinadi.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="lg" className="h-full">
      <h3 className="font-display mb-4 font-semibold">Kurslar progressi</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: axisColor, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: axisColor, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: cursorFill }}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 12,
                color: tooltipText,
                fontSize: 12,
              }}
              formatter={(value) => [`${String(value)}%`, "Progress"] as [string, string]}
            />
            <Bar dataKey="progress" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
