"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Chip, Empty, PageHead, Panel, Stat, type Tone } from "@/components/superadmin/ui";
import { ADMIN_LEVEL_LABEL, ADMIN_LEVEL_TONE, type AuditRow } from "@/lib/superadmin/types";

const IMPACT: Record<AuditRow["impact"], { label: string; tone: Tone }> = {
  high: { label: "Yuqori ta'sir", tone: "crit" },
  medium: { label: "O'rta", tone: "warn" },
  low: { label: "Past", tone: "mute" },
};

const FILTERS = [
  { id: "all", label: "Barchasi" },
  { id: "high", label: "Faqat yuqori ta'sir" },
  { id: "root", label: "Bosh admin amallari" },
  { id: "system", label: "Tizim" },
] as const;

/**
 * Audit jurnali — o'chirib bo'lmaydigan tarix.
 *
 * Oddiy admin o'z amallarini ko'ra oladi (kelajakda), bosh admin esa hammani
 * ko'radi va eksport qila oladi.
 */
export function AuditView({ audit }: { audit: AuditRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return audit.filter((r) => {
      if (filter === "high" && r.impact !== "high") return false;
      if (filter === "root" && r.level !== "root") return false;
      if (filter === "system" && r.actor !== "Tizim") return false;
      if (!needle) return true;
      return (
        r.actor.toLowerCase().includes(needle) ||
        r.action.toLowerCase().includes(needle) ||
        r.target.toLowerCase().includes(needle)
      );
    });
  }, [audit, filter, q]);

  return (
    <>
      <PageHead
        eyebrow="Immutable log"
        title="Audit jurnali"
        hint="Platformada bajarilgan har bir boshqaruv amali. Yozuvlarni o'chirib yoki tahrirlab bo'lmaydi."
      />

      <div
        className="sa-grid"
        style={{ "--sa-min": "200px", marginBottom: 16 } as React.CSSProperties}
      >
        <Stat label="Jurnal yozuvlari" value={String(audit.length)} icon="history" />
        <Stat
          label="Yuqori ta'sirli"
          value={String(audit.filter((r) => r.impact === "high").length)}
          icon="priority_high"
          tint="var(--sa-crit)"
        />
        <Stat
          label="Root amallari"
          value={String(audit.filter((r) => r.level === "root").length)}
          icon="key"
          tint="var(--sa-accent)"
        />
        {/* Jurnal yozuvlari hech qachon o'chirilmaydi — tozalash vazifasi yo'q.
            Ilgari "24 oy" deb turardi, bu esa haqiqatga mos emas edi. */}
        <Stat label="Saqlash muddati" value="Cheksiz" icon="lock_clock" tint="var(--sa-ok)" />
      </div>

      <Panel
        title="Yozuvlar"
        padding={0}
        action={
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="sa-input"
              placeholder="Amal, admin yoki obyekt…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Audit jurnalidan qidirish"
              style={{ width: 210 }}
            />
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="sa-btn"
                data-variant={filter === f.id ? undefined : "quiet"}
                style={{ padding: "6px 10px", fontSize: 12.5 }}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty icon="search_off" text="Bu filtrga mos yozuv yo'q" />
        ) : (
          <div className="sa-scroll-x">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Vaqt</th>
                  <th>Kim</th>
                  <th>Amal</th>
                  <th>Obyekt</th>
                  <th>IP</th>
                  <th>Ta&apos;sir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td
                      className="sa-num"
                      style={{ color: "var(--sa-faint)", whiteSpace: "nowrap" }}
                    >
                      {r.at}
                    </td>
                    <td>
                      <div style={{ fontWeight: 650, color: "#fff", whiteSpace: "nowrap" }}>
                        {r.actor}
                      </div>
                      <div style={{ marginTop: 3 }}>
                        <Chip tone={ADMIN_LEVEL_TONE[r.level]}>{ADMIN_LEVEL_LABEL[r.level]}</Chip>
                      </div>
                    </td>
                    <td>
                      <code
                        className="sa-num"
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "rgba(124,92,255,.13)",
                          border: "1px solid rgba(124,92,255,.28)",
                          color: "#b9a6ff",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.action}
                      </code>
                    </td>
                    <td style={{ color: "var(--sa-dim)" }}>{r.target}</td>
                    <td className="sa-num" style={{ color: "var(--sa-faint)", fontSize: 12.5 }}>
                      {r.ip}
                    </td>
                    <td>
                      <Chip tone={IMPACT[r.impact].tone}>{IMPACT[r.impact].label}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p
        style={{
          margin: "14px 0 0",
          fontSize: 12.5,
          color: "var(--sa-faint)",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <Icon name="verified" size={15} />
        Jurnal yozuvlari server actionlardan DB'ga yoziladi; bu UI yozuvlarni tahrirlamaydi yoki
        o&apos;chirmaydi.
      </p>
    </>
  );
}
