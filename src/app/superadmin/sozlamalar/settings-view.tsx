"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Btn, Chip, Modal, PageHead, Panel } from "@/components/superadmin/ui";
import { clearLearningContent } from "@/lib/superadmin/actions";
import type { SettingGroup } from "@/lib/superadmin/types";

/** Qaytarib bo'lmaydigan amallar — har biri yozib tasdiqlashni talab qiladi. */
const DANGER = [
  {
    id: "clear-content",
    icon: "restart_alt",
    label: "O'quv kontentini tozalash",
    hint: "Barcha kurs, dars va test savollari o'chadi. Foydalanuvchilar qoladi.",
    confirm: "KONTENTNI TOZALA",
  },
] as const;

/**
 * Global sozlamalar va "xavfli zona".
 *
 * `rootOnly` belgisi qo'yilgan kalitlar oddiy admin panelida umuman
 * ko'rinmasligi kerak — bu yerda esa alohida nishon bilan ajratilgan.
 */
export function SettingsView({ groups }: { groups: SettingGroup[] }) {
  const router = useRouter();
  const [danger, setDanger] = useState<(typeof DANGER)[number] | null>(null);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "crit"; text: string } | null>(null);

  function runDanger() {
    if (!danger) return;
    setMessage(null);
    startTransition(async () => {
      const res = await clearLearningContent(typed);
      if (!res.ok) {
        setMessage({ tone: "crit", text: res.error ?? "Amal bajarilmadi" });
        return;
      }
      setDanger(null);
      setTyped("");
      setMessage({ tone: "ok", text: "O'quv kontenti tozalandi" });
      router.refresh();
    });
  }

  return (
    <>
      <PageHead
        eyebrow="Global config"
        title="Global sozlamalar"
        hint="Bu yerda server konfiguratsiyasi holati va bosh adminning real backend amallari ko'rsatiladi."
      />

      {message && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "11px 14px",
            borderRadius: 12,
            border:
              message.tone === "ok"
                ? "1px solid rgba(46,230,168,.35)"
                : "1px solid rgba(255,77,94,.35)",
            background: message.tone === "ok" ? "rgba(46,230,168,.1)" : "rgba(255,77,94,.1)",
            color: message.tone === "ok" ? "var(--sa-ok)" : "var(--sa-crit)",
            fontSize: 13.5,
            fontWeight: 650,
          }}
        >
          {message.text}
        </div>
      )}

      <div
        className="sa-grid"
        style={{ "--sa-min": "320px", marginBottom: 18 } as React.CSSProperties}
      >
        {groups.map((g) => (
          <Panel key={g.id} title={g.title} padding={0}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {g.items.map((item, i) => (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "13px 18px",
                    borderBottom:
                      i < g.items.length - 1 ? "1px solid rgba(255,255,255,.045)" : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 2,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 650, color: "#fff" }}>
                        {item.label}
                      </span>
                      {item.rootOnly && <Chip tone="root">ROOT</Chip>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--sa-faint)" }}>{item.hint}</div>
                  </div>
                  <Chip tone={item.on ? "ok" : "warn"}>
                    {item.on ? "Sozlangan" : "Sozlanmagan"}
                  </Chip>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel title="Xavfli zona · qaytarib bo'lmaydi" tone="crit" padding={0}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {DANGER.map((d, i) => (
            <li
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 18px",
                flexWrap: "wrap",
                borderBottom: i < DANGER.length - 1 ? "1px solid rgba(255,77,94,.14)" : "none",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  background: "rgba(255,77,94,.13)",
                }}
              >
                <Icon name={d.icon} size={19} color="var(--sa-crit)" />
              </span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--sa-dim)" }}>{d.hint}</div>
              </div>
              <Btn
                variant="crit"
                disabled={isPending}
                onClick={() => {
                  setDanger(d);
                  setTyped("");
                }}
              >
                Bajarish
              </Btn>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Tasdiqlash uchun matnni qo'lda yozish talab qilinadi. */}
      <Modal
        open={danger !== null}
        onClose={() => setDanger(null)}
        tone="crit"
        title={danger?.label ?? ""}
        subtitle="Bu amalni ortga qaytarib bo'lmaydi"
      >
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--sa-dim)", lineHeight: 1.6 }}>
          {danger?.hint}
        </p>
        <label style={{ display: "grid", gap: 7, marginBottom: 18 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--sa-dim)" }}>
            Tasdiqlash uchun{" "}
            <code className="sa-num" style={{ color: "var(--sa-crit)" }}>
              {danger?.confirm}
            </code>{" "}
            deb yozing
          </span>
          <input
            className="sa-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={danger?.confirm}
            autoComplete="off"
            disabled={isPending}
          />
        </label>
        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
          <Btn variant="quiet" disabled={isPending} onClick={() => setDanger(null)}>
            Bekor qilish
          </Btn>
          <Btn
            variant="crit"
            icon="warning"
            disabled={isPending || typed.trim() !== danger?.confirm}
            onClick={runDanger}
          >
            Bajarish
          </Btn>
        </div>
      </Modal>
    </>
  );
}
