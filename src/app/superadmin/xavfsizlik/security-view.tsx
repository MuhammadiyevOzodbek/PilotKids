"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import {
  Btn,
  Chip,
  Modal,
  PageHead,
  Panel,
  Person,
  Stat,
  StatusDot,
  type Tone,
} from "@/components/superadmin/ui";
import { revokeAdminSession, revokeOtherAdminSessions } from "@/lib/superadmin/actions";
import { ADMIN_LEVEL_LABEL, type SessionRow, type ThreatRow } from "@/lib/superadmin/types";

const SEVERITY: Record<ThreatRow["severity"], { label: string; tone: Tone }> = {
  high: { label: "Yuqori", tone: "crit" },
  medium: { label: "O'rta", tone: "warn" },
  low: { label: "Past", tone: "mute" },
};

/**
 * Xavfsizlik markazi — hujum urinishlari va admin sessiyalari.
 * Bu ma'lumot oddiy admin panelida hech qachon ko'rsatilmaydi.
 */
export function SecurityView({
  sessions,
  threats,
  layers,
}: {
  sessions: SessionRow[];
  threats: ThreatRow[];
  layers: { label: string; note: string; tone: Tone }[];
}) {
  const router = useRouter();
  const [killing, setKilling] = useState<SessionRow | null>(null);
  const [killAll, setKillAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = threats.filter((t) => !t.handled);
  const high = threats.filter((t) => t.severity === "high").length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Amal bajarilmadi");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <PageHead
        eyebrow="Security center"
        title="Xavfsizlik"
        hint="Hujum urinishlari, shubhali sessiyalar va admin kirishlari ustidan to'liq nazorat."
        actions={
          <Btn icon="logout" variant="crit" onClick={() => setKillAll(true)}>
            Boshqa admin sessiyalarini tugatish
          </Btn>
        }
      />

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "11px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,77,94,.35)",
            background: "rgba(255,77,94,.1)",
            color: "var(--sa-crit)",
            fontSize: 13.5,
            fontWeight: 650,
          }}
        >
          {error}
        </div>
      )}

      <div
        className="sa-grid"
        style={{ "--sa-min": "200px", marginBottom: 16 } as React.CSSProperties}
      >
        <Stat
          label="Ochiq ogohlantirish"
          value={String(open.length)}
          icon="warning"
          tint="var(--sa-crit)"
        />
        <Stat
          label="Yuqori darajali"
          value={String(high)}
          icon="e911_emergency"
          tint="var(--sa-crit)"
        />
        <Stat
          label="Faol admin sessiya"
          value={String(sessions.length)}
          icon="devices"
          tint="var(--sa-accent)"
        />
        <Stat label="Bloklangan IP" value="0" icon="shield" tint="var(--sa-ok)" />
      </div>

      <Panel
        title="Xavf signallari"
        padding={0}
        tone={open.length > 0 ? "crit" : undefined}
        style={{ marginBottom: 16 }}
      >
        <div className="sa-scroll-x">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Turi</th>
                <th>Manba</th>
                <th>Daraja</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {threats.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--sa-faint)", textAlign: "center" }}>
                    Ochiq xavfsizlik signali yo'q.
                  </td>
                </tr>
              ) : (
                threats.map((t) => (
                  <tr key={t.id}>
                    <td className="sa-num" style={{ color: "var(--sa-faint)" }}>
                      {t.at}
                    </td>
                    <td>
                      <div style={{ fontWeight: 650, color: "#fff" }}>{t.kind}</div>
                      <div style={{ fontSize: 12, color: "var(--sa-faint)", marginTop: 2 }}>
                        {t.detail}
                      </div>
                    </td>
                    <td>
                      <div className="sa-num" style={{ fontSize: 12.5 }}>
                        {t.ip}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--sa-faint)" }}>{t.geo}</div>
                    </td>
                    <td>
                      <Chip tone={SEVERITY[t.severity].tone}>{SEVERITY[t.severity].label}</Chip>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <StatusDot tone={t.handled ? "ok" : "crit"} pulse={!t.handled} />
                        <span style={{ fontSize: 12.5, color: "var(--sa-dim)" }}>
                          {t.handled ? "Hal qilingan" : "Ochiq"}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="sa-split">
        <Panel title="Faol admin sessiyalari" padding={0}>
          <div className="sa-scroll-x">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Qurilma</th>
                  <th>Joylashuv</th>
                  <th>Boshlangan</th>
                  <th style={{ textAlign: "right" }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--sa-faint)", textAlign: "center" }}>
                      Faol admin sessiyasi topilmadi.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => {
                    // Hududdan tashqari kirish — alohida belgilanadi.
                    const foreign = !s.geo.endsWith("UZ");
                    return (
                      <tr key={s.id}>
                        <td>
                          <Person
                            name={s.name}
                            sub={ADMIN_LEVEL_LABEL[s.level]}
                            tint={s.level === "root" ? "var(--sa-crit)" : "var(--sa-accent)"}
                          />
                        </td>
                        <td style={{ color: "var(--sa-dim)", fontSize: 12.5 }}>{s.device}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            {foreign && <Icon name="warning" size={15} color="var(--sa-crit)" />}
                            <span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 12.5,
                                  color: foreign ? "var(--sa-crit)" : "var(--sa-dim)",
                                }}
                              >
                                {s.geo}
                              </span>
                              <span
                                className="sa-num"
                                style={{
                                  display: "block",
                                  fontSize: 11.5,
                                  color: "var(--sa-faint)",
                                }}
                              >
                                {s.ip}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="sa-num" style={{ fontSize: 12.5, color: "var(--sa-faint)" }}>
                          {s.started}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Btn
                            variant="crit"
                            icon="logout"
                            disabled={isPending}
                            onClick={() => setKilling(s)}
                            style={{ padding: "6px 10px", fontSize: 12.5 }}
                          >
                            Tugatish
                          </Btn>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel title="Himoya qatlamlari" padding={16}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {layers.map((l) => (
                <li key={l.label} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <StatusDot tone={l.tone} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 650 }}>
                      {l.label}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--sa-faint)" }}>
                      {l.note}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Kim qayerdan kirdi · 7 kun" padding={16}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {sessions.map((r, i) => (
                <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className="sa-num"
                    style={{ width: 16, fontSize: 11.5, color: "var(--sa-faint)" }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{ flex: 1, fontSize: 13, color: i > 2 ? "var(--sa-crit)" : undefined }}
                  >
                    {r.geo}
                  </span>
                  <span className="sa-num" style={{ fontSize: 12.5, color: "var(--sa-dim)" }}>
                    {r.ip}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Modal
        open={killing !== null}
        onClose={() => setKilling(null)}
        tone="crit"
        title="Sessiyani tugatish"
        subtitle={killing?.email}
      >
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--sa-dim)", lineHeight: 1.6 }}>
          <b style={{ color: "#fff" }}>{killing?.name}</b> ({killing?.device}) tizimdan darhol
          chiqariladi va qayta kirish uchun parol so&apos;raladi.
        </p>
        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
          <Btn variant="quiet" onClick={() => setKilling(null)}>
            Bekor qilish
          </Btn>
          <Btn
            variant="crit"
            icon="logout"
            disabled={isPending}
            onClick={() => {
              const target = killing;
              setKilling(null);
              if (target) run(() => revokeAdminSession(target.id));
            }}
          >
            Tugatish
          </Btn>
        </div>
      </Modal>

      <Modal
        open={killAll}
        onClose={() => setKillAll(false)}
        tone="crit"
        title="Boshqa admin sessiyalarini tugatish"
        subtitle="Joriy sessiyangiz saqlanadi"
      >
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--sa-dim)", lineHeight: 1.6 }}>
          Boshqa admin va bosh admin sessiyalari tizimdan chiqariladi. Bu odatda hisob
          ma&apos;lumotlari sizib chiqqanda qo&apos;llaniladi.
        </p>
        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
          <Btn variant="quiet" onClick={() => setKillAll(false)}>
            Bekor qilish
          </Btn>
          <Btn
            variant="crit"
            icon="warning"
            disabled={isPending}
            onClick={() => {
              setKillAll(false);
              run(() => revokeOtherAdminSessions());
            }}
          >
            Boshqalarini tugatish
          </Btn>
        </div>
      </Modal>
    </>
  );
}
