"use client";

import { Icon } from "@/components/icon";
import {
  Chip,
  Meter,
  PageHead,
  Panel,
  Stat,
  StatusDot,
  type Tone,
} from "@/components/superadmin/ui";
import type { FeatureFlag, ServiceRow } from "@/lib/superadmin/types";

const STATE: Record<"ok" | "degraded" | "down", { label: string; tone: Tone }> = {
  ok: { label: "Normal", tone: "ok" },
  degraded: { label: "Sekinlashgan", tone: "warn" },
  down: { label: "Ishlamayapti", tone: "crit" },
};

const RISK: Record<FeatureFlag["risk"], { label: string; tone: Tone }> = {
  low: { label: "Past xavf", tone: "mute" },
  medium: { label: "O'rta xavf", tone: "warn" },
  high: { label: "Yuqori xavf", tone: "crit" },
};

/**
 * Tizim holati — infratuzilma, feature flag'lar va zaxira nusxalar.
 * Oddiy admin panelida bu bo'lim umuman yo'q.
 */
export function SystemView({ services, flags }: { services: ServiceRow[]; flags: FeatureFlag[] }) {
  const ok = services.filter((s) => s.status === "ok").length;

  return (
    <>
      <PageHead
        eyebrow="Infrastructure"
        title="Tizim holati"
        hint="Xizmatlar va server konfiguratsiyasi holati real backend tekshiruvlari asosida ko'rsatiladi."
      />

      <div
        className="sa-grid"
        style={{ "--sa-min": "210px", marginBottom: 16 } as React.CSSProperties}
      >
        <Stat
          label="Ishlayotgan xizmatlar"
          value={`${ok}/${services.length}`}
          icon="lan"
          tint={ok === services.length ? "var(--sa-ok)" : "var(--sa-warn)"}
        />
        <Stat label="CPU yuklama" value="—" unit="%" icon="memory" tint="var(--sa-faint)" />
        <Stat label="Xotira" value="—" unit="%" icon="database" tint="var(--sa-faint)" />
        <Stat label="Oxirgi zaxira" value="—" icon="backup" tint="var(--sa-faint)" />
      </div>

      <Panel title="Xizmatlar" padding={0} style={{ marginBottom: 16 }}>
        <div className="sa-scroll-x">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Xizmat</th>
                <th>Holat</th>
                <th style={{ minWidth: 150 }}>Yuklama</th>
                <th>Javob vaqti</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(255,255,255,.05)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name={s.icon} size={17} color="var(--sa-dim)" />
                      </span>
                      <span>
                        <span style={{ display: "block", fontWeight: 650, color: "#fff" }}>
                          {s.name}
                        </span>
                        <span
                          className="sa-num"
                          style={{ display: "block", fontSize: 11.5, color: "var(--sa-faint)" }}
                        >
                          {s.note}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <StatusDot tone={STATE[s.status].tone} pulse={s.status !== "ok"} />
                      <span style={{ fontSize: 12.5, color: "var(--sa-dim)" }}>
                        {STATE[s.status].label}
                      </span>
                    </span>
                  </td>
                  <td>
                    <Meter
                      value={s.load}
                      color={
                        s.load > 80
                          ? "var(--sa-crit)"
                          : s.load > 60
                            ? "var(--sa-warn)"
                            : "var(--sa-ok)"
                      }
                    />
                    <span
                      className="sa-num"
                      style={{
                        fontSize: 11.5,
                        color: "var(--sa-faint)",
                        marginTop: 4,
                        display: "block",
                      }}
                    >
                      {s.load}%
                    </span>
                  </td>
                  <td
                    className="sa-num"
                    style={{
                      color:
                        s.latency === 0
                          ? "var(--sa-crit)"
                          : s.latency > 500
                            ? "var(--sa-warn)"
                            : "var(--sa-dim)",
                    }}
                  >
                    {s.latency === 0 ? "—" : `${s.latency} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="sa-split">
        <Panel title="Funksiya kalitlari (feature flags)" padding={0}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {flags.map((f, i) => (
              <li
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderBottom: i < flags.length - 1 ? "1px solid rgba(255,255,255,.045)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      flexWrap: "wrap",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 650, fontSize: 14, color: "#fff" }}>{f.name}</span>
                    <Chip tone={RISK[f.risk].tone}>{RISK[f.risk].label}</Chip>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--sa-faint)", marginBottom: 8 }}>
                    {f.hint}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, maxWidth: 200 }}>
                      <Meter
                        value={f.on ? f.rollout : 0}
                        color={f.on ? "var(--sa-accent)" : "var(--sa-faint)"}
                        height={5}
                      />
                    </div>
                    <span className="sa-num" style={{ fontSize: 11.5, color: "var(--sa-faint)" }}>
                      {f.on ? `${f.rollout}% foydalanuvchi` : "o'chirilgan"}
                    </span>
                  </div>
                </div>
                <Chip tone={f.on ? "ok" : "warn"}>{f.on ? "Sozlangan" : "Sozlanmagan"}</Chip>
              </li>
            ))}
          </ul>
        </Panel>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel title="Resurs sarfi · 24 soat" padding={16}>
            <p style={{ margin: 0, color: "var(--sa-faint)", fontSize: 13, lineHeight: 1.6 }}>
              Server monitoring backend jadvali yoki provider API hali ulanmagan.
            </p>
          </Panel>

          <Panel title="Zaxira nusxalar" padding={0}>
            <p style={{ margin: 0, padding: 18, color: "var(--sa-faint)", fontSize: 13 }}>
              Zaxira nusxa tarixi uchun backend jadvali hali ulanmagan.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
