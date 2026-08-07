"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { Chip, Empty, Meter, PageHead, Panel, Stat, StatusDot } from "@/components/superadmin/ui";
import type {
  MetricCard,
  RegionRow,
  RevenuePoint,
  ServiceRow,
  StreamEvent,
} from "@/lib/superadmin/types";

/**
 * Boshqaruv markazi — bosh admin kunni shu ekrandan boshlaydi.
 *
 * Oddiy admin bosh sahifasi 4 ta kartochka va bitta grafikdan iborat; bu yerda
 * esa jonli oqim, xizmatlar puls'i, daromad tuzilishi va faqat bosh adminga
 * ochiq bo'lgan "xavfli amallar" bloki bor.
 */
export function CommandCenter({
  data,
}: {
  data: {
    metrics: MetricCard[];
    stream: StreamEvent[];
    services: ServiceRow[];
    revenue: RevenuePoint[];
    regions: RegionRow[];
  };
}) {
  const down = data.services.filter((s) => s.status !== "ok");

  return (
    <>
      <PageHead
        eyebrow="Command center"
        title="Boshqaruv markazi"
        hint="Platformaning jonli holati, moliya, xavfsizlik va faqat bosh admin ixtiyoridagi amallar — bitta ekranda."
      />

      {/* Diqqat talab qiladigan holat — sahifaning eng tepasida. */}
      {down.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "13px 16px",
            marginBottom: 18,
            borderRadius: 14,
            border: "1px solid rgba(255,77,94,.35)",
            background: "linear-gradient(90deg, rgba(255,77,94,.13), transparent 70%)",
          }}
        >
          <StatusDot tone="crit" pulse />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
            {down.length} ta xizmatda muammo
          </span>
          <span style={{ fontSize: 13.5, color: "var(--sa-dim)", flex: 1, minWidth: 200 }}>
            {down.map((s) => s.name).join(", ")} — darhol ko&apos;rib chiqing.
          </span>
          <Link href="/superadmin/tizim" className="sa-btn" data-variant="crit">
            <Icon name="monitor_heart" size={16} />
            Tizim holati
          </Link>
        </div>
      )}

      {/* Asosiy metrikalar */}
      <div className="sa-grid" style={{ marginBottom: 16 }}>
        {data.metrics.map((m) => (
          <Stat
            key={m.key}
            label={m.label}
            value={m.value}
            unit={m.unit}
            delta={m.delta}
            tint={m.tint}
            icon={m.icon}
            spark={m.spark}
          />
        ))}
      </div>

      <div className="sa-split" style={{ marginBottom: 16 }}>
        {/* Jonli oqim */}
        <Panel
          title="Jonli faoliyat oqimi"
          padding={0}
          action={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <StatusDot tone="ok" pulse />
              <span className="sa-num" style={{ fontSize: 11.5, color: "var(--sa-faint)" }}>
                real vaqt
              </span>
            </span>
          }
        >
          {data.stream.length === 0 ? (
            <Empty icon="inbox" text="Hozircha hodisa yo'q" />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {data.stream.map((e, i) => (
                <li
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 18px",
                    borderBottom:
                      i < data.stream.length - 1 ? "1px solid rgba(255,255,255,.045)" : "none",
                  }}
                >
                  <span
                    className="sa-num"
                    style={{ fontSize: 11.5, color: "var(--sa-faint)", flexShrink: 0, width: 58 }}
                  >
                    {e.at}
                  </span>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,255,255,.05)",
                    }}
                  >
                    <Icon name={e.icon} size={16} color="var(--sa-dim)" />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
                    <b style={{ color: "#fff", fontWeight: 650 }}>{e.actor}</b>{" "}
                    <span style={{ color: "var(--sa-dim)" }}>{e.action}</span>
                    <span
                      style={{
                        display: "block",
                        color: "var(--sa-faint)",
                        fontSize: 12.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.target}
                    </span>
                  </span>
                  <Chip tone={e.tone}>{e.tone === "root" ? "ROOT" : e.tone.toUpperCase()}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          {/* Xizmatlar pulsi */}
          <Panel
            title="Xizmatlar pulsi"
            padding={14}
            action={
              <Link
                href="/superadmin/tizim"
                style={{ fontSize: 12.5, fontWeight: 650, color: "var(--sa-accent)" }}
              >
                Batafsil
              </Link>
            }
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 11 }}>
              {data.services.slice(0, 6).map((s) => (
                <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusDot
                    tone={s.status === "ok" ? "ok" : s.status === "degraded" ? "warn" : "crit"}
                    pulse={s.status !== "ok"}
                  />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>
                    {s.name}
                  </span>
                  <span
                    className="sa-num"
                    style={{
                      fontSize: 12,
                      color:
                        s.latency === 0
                          ? "var(--sa-crit)"
                          : s.latency > 500
                            ? "var(--sa-warn)"
                            : "var(--sa-faint)",
                    }}
                  >
                    {s.latency === 0 ? "off" : `${s.latency}ms`}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Faqat bosh adminda bor blok */}
          <Panel title="Xavfli amallar · faqat root" tone="crit" padding={14}>
            <p
              style={{ margin: "0 0 14px", fontSize: 13, color: "var(--sa-dim)", lineHeight: 1.5 }}
            >
              Bu amallar butun platformaga ta&apos;sir qiladi va audit jurnaliga o&apos;chirilmas
              holda yoziladi.
            </p>
            <div style={{ display: "grid", gap: 9 }}>
              <Link href="/superadmin/sozlamalar" className="sa-btn" data-variant="crit">
                <Icon name="delete_sweep" size={16} />
                O&apos;quv kontentini tozalash
              </Link>
              <Link href="/superadmin/xavfsizlik" className="sa-btn" data-variant="crit">
                <Icon name="logout" size={16} />
                Admin sessiyalarini boshqarish
              </Link>
              <Link href="/superadmin/audit" className="sa-btn" data-variant="quiet">
                <Icon name="history" size={16} />
                Audit jurnalini ko&apos;rish
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <div className="sa-split" style={{ "--sa-split": "1.35fr 1fr" } as React.CSSProperties}>
        <Panel
          title="Daromad tuzilishi · 8 oy"
          action={
            <Link
              href="/superadmin/moliya"
              style={{ fontSize: 12.5, fontWeight: 650, color: "var(--sa-accent)" }}
            >
              Moliya bo&apos;limi
            </Link>
          }
        >
          <RevenueChart data={data.revenue} />
        </Panel>

        <Panel title="Hududlar bo'yicha o'sish" padding={16}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 13 }}>
            {data.regions.slice(0, 6).map((r) => (
              <li key={r.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="sa-num" style={{ fontSize: 13, color: "var(--sa-dim)" }}>
                      {r.users.toLocaleString("ru-RU").replace(/,/g, " ")}
                    </span>
                    <span
                      className="sa-num"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: r.growth >= 0 ? "var(--sa-ok)" : "var(--sa-crit)",
                      }}
                    >
                      {r.growth >= 0 ? "+" : ""}
                      {r.growth}%
                    </span>
                  </span>
                </div>
                <Meter
                  value={r.share}
                  color={r.growth >= 0 ? "var(--sa-accent)" : "var(--sa-crit)"}
                  height={5}
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ─────────────────────────── Ustunli diagramma ─────────────────────────── */

const SERIES = [
  { key: "premium" as const, label: "Premium", color: "var(--sa-accent)" },
  { key: "family" as const, label: "Oila", color: "var(--sa-accent-2)" },
  { key: "school" as const, label: "Maktab", color: "var(--sa-ok)" },
];

/**
 * Qo'lda yozilgan yig'ma ustunlar — kutubxonasiz, chunki bu yerda kerakli
 * narsa juda oddiy va qora fon ostida ranglarni to'liq nazorat qilish oson.
 */
function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const totals = data.map((d) => d.premium + d.family + d.school);
  const max = Math.max(1, ...totals);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span
              style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--sa-dim)" }}>
              {s.label}
            </span>
          </span>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          height: 190,
          padding: "0 2px",
        }}
      >
        {data.map((d, i) => (
          <div
            key={d.month}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <span
              className="sa-num"
              style={{ fontSize: 11, color: "var(--sa-faint)", marginBottom: 6 }}
            >
              {totals[i]}
            </span>
            <div
              title={`${d.month}: ${totals[i]} mln so'm`}
              style={{
                width: "100%",
                maxWidth: 42,
                height: `${(totals[i] / max) * 148}px`,
                borderRadius: "7px 7px 3px 3px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column-reverse",
              }}
            >
              {SERIES.map((s) => (
                <div
                  key={s.key}
                  style={{
                    height: `${(d[s.key] / totals[i]) * 100}%`,
                    background: s.color,
                    opacity: 0.88,
                  }}
                />
              ))}
            </div>
            <span
              className="sa-num"
              style={{ fontSize: 11.5, color: "var(--sa-faint)", marginTop: 8 }}
            >
              {d.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
