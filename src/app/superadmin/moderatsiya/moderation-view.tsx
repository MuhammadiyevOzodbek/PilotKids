"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Chip, Empty, PageHead, Panel, Stat, type Tone } from "@/components/superadmin/ui";
import type { ReportRow } from "@/lib/superadmin/types";

const STATUS: Record<ReportRow["status"], { label: string; tone: Tone }> = {
  new: { label: "Yangi", tone: "crit" },
  reviewing: { label: "Ko'rilmoqda", tone: "warn" },
  resolved: { label: "Hal qilingan", tone: "ok" },
};

const TABS = [
  { id: "new", label: "Yangi" },
  { id: "reviewing", label: "Ko'rilmoqda" },
  { id: "resolved", label: "Hal qilingan" },
  { id: "all", label: "Barchasi" },
] as const;

/**
 * Moderatsiya navbati — shikoyat qilingan kontent.
 * Bosh admin bu yerda moderatorlar qarorini bekor qila oladi.
 */
export function ModerationView({ reports }: { reports: ReportRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("new");

  const rows = reports.filter((r) => tab === "all" || r.status === tab);

  return (
    <>
      <PageHead
        eyebrow="Trust & safety"
        title="Moderatsiya"
        hint="Foydalanuvchilar shikoyat qilgan kontent. Bolalar platformasida bu navbat hech qachon uzoq kutmasligi kerak."
      />

      <div
        className="sa-grid"
        style={{ "--sa-min": "200px", marginBottom: 16 } as React.CSSProperties}
      >
        <Stat
          label="Yangi shikoyat"
          value={String(reports.filter((r) => r.status === "new").length)}
          icon="flag"
          tint="var(--sa-crit)"
        />
        <Stat
          label="Ko'rilmoqda"
          value={String(reports.filter((r) => r.status === "reviewing").length)}
          icon="visibility"
          tint="var(--sa-warn)"
        />
        <Stat
          label="Jami shikoyat"
          value={String(reports.reduce((s, r) => s + r.reports, 0))}
          icon="report"
        />
        <Stat
          label="O'rtacha javob vaqti"
          value="42"
          unit="daqiqa"
          icon="timer"
          tint="var(--sa-ok)"
        />
      </div>

      <Panel
        title="Navbat"
        padding={0}
        action={
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="sa-btn"
                data-variant={tab === t.id ? undefined : "quiet"}
                style={{ padding: "6px 11px", fontSize: 12.5 }}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty icon="task_alt" text="Bu bo'limda hech narsa yo'q — navbat toza" />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((r, i) => (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  flexWrap: "wrap",
                  borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,.045)" : "none",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    background: r.reports > 5 ? "rgba(255,77,94,.15)" : "rgba(255,255,255,.05)",
                  }}
                >
                  <Icon
                    name="flag"
                    size={18}
                    color={r.reports > 5 ? "var(--sa-crit)" : "var(--sa-dim)"}
                  />
                </span>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 650, fontSize: 14, color: "#fff" }}>
                      {r.content}
                    </span>
                    <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Chip>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--sa-faint)", marginTop: 3 }}>
                    {r.kind} · {r.author} · {r.at} · {r.reports} ta shikoyat
                  </div>
                </div>

                <Chip tone="mute">Report backend kutilmoqda</Chip>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
