"use client";

import { Chip, Meter, PageHead, Panel, Stat, type Tone } from "@/components/superadmin/ui";
import type { PayoutRow, PlanRow, RevenuePoint } from "@/lib/superadmin/types";

const STATE: Record<PayoutRow["state"], { label: string; tone: Tone }> = {
  done: { label: "O'tdi", tone: "ok" },
  pending: { label: "Kutilmoqda", tone: "warn" },
  failed: { label: "Xato", tone: "crit" },
  refunded: { label: "Qaytarilgan", tone: "mute" },
};

/**
 * Moliya bo'limi — daromad, obunalar va to'lovlar.
 * Ruxsatlar matritsasiga ko'ra oddiy admin buni faqat ko'ra oladi,
 * pulni qaytarish (refund) esa faqat bosh adminda.
 */
export function FinanceView({
  revenue,
  plans,
  payments,
}: {
  revenue: RevenuePoint[];
  plans: PlanRow[];
  payments: PayoutRow[];
}) {
  const totals = revenue.map((r) => r.premium + r.family + r.school);
  const last = totals[totals.length - 1] ?? 0;
  const prev = totals[totals.length - 2] ?? 0;
  const growth = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;

  return (
    <>
      <PageHead
        eyebrow="Revenue"
        title="Moliya"
        hint="Obuna va to'lov jadvallari ulanganda bu bo'lim real moliyaviy yozuvlarni ko'rsatadi."
      />

      <div
        className="sa-grid"
        style={{ "--sa-min": "210px", marginBottom: 16 } as React.CSSProperties}
      >
        <Stat
          label="Oylik daromad (MRR)"
          value={String(last)}
          unit="mln so'm"
          delta={growth}
          icon="payments"
          tint="var(--sa-ok)"
          spark={totals}
        />
        <Stat
          label="Yillik prognoz"
          value={String(last * 12)}
          unit="mln so'm"
          icon="trending_up"
          tint="var(--sa-accent)"
        />
        <Stat
          label="Faol obunachilar"
          value={String(plans.reduce((s, p) => s + p.subscribers, 0))}
          delta={14}
          icon="card_membership"
          tint="var(--sa-accent-2)"
        />
        <Stat
          label="Qaytarishlar (oy)"
          value="1.4"
          unit="mln so'm"
          delta={-22}
          icon="undo"
          tint="var(--sa-warn)"
        />
      </div>

      <div className="sa-split" style={{ marginBottom: 16 }}>
        <Panel title="Daromad dinamikasi · 8 oy" padding={18}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 200 }}>
            {revenue.map((r, i) => (
              <div
                key={r.month}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <span
                  className="sa-num"
                  style={{ fontSize: 11, color: "var(--sa-faint)", marginBottom: 6 }}
                >
                  {totals[i]}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 40,
                    height: `${((totals[i] ?? 0) / Math.max(1, ...totals)) * 152}px`,
                    borderRadius: "7px 7px 3px 3px",
                    background:
                      i === totals.length - 1
                        ? "linear-gradient(180deg,var(--sa-ok),rgba(46,230,168,.25))"
                        : "linear-gradient(180deg,var(--sa-accent),rgba(124,92,255,.2))",
                  }}
                />
                <span
                  className="sa-num"
                  style={{ fontSize: 11.5, color: "var(--sa-faint)", marginTop: 8 }}
                >
                  {r.month}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Tariflar" padding={16}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
            {plans.length === 0 ? (
              <li style={{ color: "var(--sa-faint)", fontSize: 13 }}>
                Tarif backend jadvali hali qo'shilmagan.
              </li>
            ) : (
              plans.map((p) => (
                <li key={p.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 10,
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 650, color: "#fff" }}>{p.name}</span>
                    <span className="sa-num" style={{ fontSize: 13, color: p.tint }}>
                      {p.mrr}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--sa-faint)",
                      marginBottom: 7,
                    }}
                  >
                    <span>{p.price}</span>
                    <span className="sa-num">{p.subscribers} obunachi</span>
                  </div>
                  <Meter value={p.share} color={p.tint} height={5} />
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>

      <Panel title="Oxirgi to'lovlar" padding={0}>
        <div className="sa-scroll-x">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Kim</th>
                <th>Usul</th>
                <th style={{ textAlign: "right" }}>Summa</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--sa-faint)", textAlign: "center" }}>
                    To'lov backend jadvali hali qo'shilmagan.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="sa-num" style={{ color: "var(--sa-faint)" }}>
                      {p.at}
                    </td>
                    <td style={{ fontWeight: 650, color: "#fff" }}>{p.who}</td>
                    <td className="sa-num" style={{ color: "var(--sa-dim)", fontSize: 12.5 }}>
                      {p.method}
                    </td>
                    <td className="sa-num" style={{ textAlign: "right", color: "#fff" }}>
                      {p.amount} so&apos;m
                    </td>
                    <td>
                      <Chip tone={STATE[p.state].tone}>{STATE[p.state].label}</Chip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
