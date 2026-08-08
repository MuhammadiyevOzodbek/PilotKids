"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import {
  Btn,
  Chip,
  Empty,
  Modal,
  PageHead,
  Panel,
  Person,
  Stat,
  StatusDot,
} from "@/components/superadmin/ui";
import { setUserRole } from "@/lib/admin/actions";
import {
  ADMIN_LEVEL_LABEL,
  ADMIN_LEVEL_TONE,
  type AdminLevel,
  type AdminRow,
} from "@/lib/superadmin/types";

const LEVEL_ORDER: AdminLevel[] = ["root", "admin"];

const STATUS: Record<AdminRow["status"], { label: string; tone: "ok" | "crit" | "warn" }> = {
  active: { label: "Faol", tone: "ok" },
  suspended: { label: "To'xtatilgan", tone: "crit" },
};

/**
 * Adminlar boshqaruvi — bosh adminning eng katta imtiyozi.
 *
 * Oddiy admin panelidagi "Foydalanuvchilar" ro'yxati rolni ko'rsatadi, xolos;
 * bu yerda daraja berish/olib qo'yish, 2FA majburlash va huquqni butunlay
 * so'ndirish mumkin.
 */
export function AdminsView({ admins }: { admins: AdminRow[] }) {
  const router = useRouter();
  const [level, setLevel] = useState<"all" | AdminLevel>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [revoking, setRevoking] = useState<AdminRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return admins.filter(
      (a) =>
        (level === "all" || a.level === level) &&
        (!needle ||
          a.name.toLowerCase().includes(needle) ||
          a.email.toLowerCase().includes(needle)),
    );
  }, [admins, level, q]);

  return (
    <>
      <PageHead
        eyebrow="Huquqlar boshqaruvi"
        title="Adminlar"
        hint="Kim platformani boshqarayotganini shu yerdan nazorat qilasiz. Daraja o'zgarishi darhol kuchga kiradi."
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
        <Stat label="Jami admin" value={String(admins.length)} icon="shield_person" />
        <Stat
          label="Bosh admin"
          value={String(admins.filter((a) => a.level === "root").length)}
          icon="key"
          tint="var(--sa-crit)"
        />
        <Stat
          label="30 kunlik sessiya"
          value={String(admins.reduce((s, a) => s + a.actions30d, 0))}
          icon="bolt"
          tint="var(--sa-accent-2)"
        />
        <Stat
          label="Hozir ochiq sessiya"
          value={String(admins.reduce((s, a) => s + a.liveSessions, 0))}
          icon="devices"
          tint="var(--sa-ok)"
        />
      </div>

      <Panel
        title="Admin hisoblari"
        padding={0}
        action={
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="sa-input"
              placeholder="Ism yoki email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Adminlar orasidan qidirish"
              style={{ width: 190 }}
            />
            <div style={{ display: "flex", gap: 3 }}>
              {(["all", ...LEVEL_ORDER] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className="sa-btn"
                  data-variant={level === l ? undefined : "quiet"}
                  style={{ padding: "6px 10px", fontSize: 12.5 }}
                >
                  {l === "all" ? "Barchasi" : ADMIN_LEVEL_LABEL[l]}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty icon="person_search" text="Bu filtrga mos admin topilmadi" />
        ) : (
          <div className="sa-scroll-x">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Daraja</th>
                  <th>Hudud</th>
                  <th>30 kun</th>
                  <th>Oxirgi faollik</th>
                  <th>Holat</th>
                  <th style={{ textAlign: "right" }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Person
                        name={a.name}
                        sub={a.email}
                        tint={a.level === "root" ? "var(--sa-crit)" : "var(--sa-accent)"}
                      />
                    </td>
                    <td>
                      <Chip tone={ADMIN_LEVEL_TONE[a.level]}>{ADMIN_LEVEL_LABEL[a.level]}</Chip>
                    </td>
                    <td style={{ color: "var(--sa-dim)" }}>{a.region}</td>
                    <td className="sa-num" style={{ color: "var(--sa-dim)" }}>
                      {a.actions30d}
                    </td>
                    <td style={{ color: "var(--sa-faint)", fontSize: 12.5 }}>{a.lastSeen}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <StatusDot
                          tone={STATUS[a.status].tone}
                          pulse={a.status === "active" && a.lastSeen === "Hozir onlayn"}
                        />
                        <span style={{ fontSize: 12.5, color: "var(--sa-dim)" }}>
                          {STATUS[a.status].label}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn
                          variant="quiet"
                          icon="tune"
                          disabled={isPending}
                          onClick={() => setEditing(a)}
                          style={{ padding: "6px 10px", fontSize: 12.5 }}
                        >
                          Daraja
                        </Btn>
                        <Btn
                          variant="crit"
                          icon="block"
                          disabled={isPending || a.level === "root"}
                          onClick={() => setRevoking(a)}
                          style={{ padding: "6px 10px", fontSize: 12.5 }}
                        >
                          Huquqni olish
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Daraja o'zgartirish */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Darajani o'zgartirish"
        subtitle={editing?.email}
      >
        <div style={{ display: "grid", gap: 9 }}>
          {LEVEL_ORDER.map((l) => (
            <button
              key={l}
              type="button"
              disabled={isPending}
              onClick={() => {
                const target = editing;
                setEditing(null);
                if (target)
                  run(() => setUserRole(target.id, l === "root" ? "superadmin" : "admin"));
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 15px",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                border: `1px solid ${editing?.level === l ? "var(--sa-accent)" : "var(--sa-line-2)"}`,
                background: editing?.level === l ? "rgba(124,92,255,.12)" : "transparent",
                color: "var(--sa-text)",
                fontFamily: "inherit",
              }}
            >
              <Icon
                name={l === "root" ? "key" : l === "admin" ? "shield_person" : "badge"}
                size={20}
                color={l === "root" ? "var(--sa-crit)" : "var(--sa-accent)"}
              />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, color: "#fff" }}>
                  {ADMIN_LEVEL_LABEL[l]}
                </span>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--sa-dim)" }}>
                  {l === "root" ? "Cheklovsiz — huquq berish, moliya, tizim" : "Kontent boshqaruvi"}
                </span>
              </span>
              {editing?.level === l && <Icon name="check" size={19} color="var(--sa-accent)" />}
            </button>
          ))}
        </div>
      </Modal>

      {/* Huquqni olib tashlash */}
      <Modal
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        tone="crit"
        title="Admin huquqini olib tashlash"
        subtitle={revoking?.email}
      >
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--sa-dim)", lineHeight: 1.6 }}>
          <b style={{ color: "#fff" }}>{revoking?.name}</b> oddiy foydalanuvchiga aylanadi, barcha
          admin sessiyalari darhol tugatiladi. Hisob o&apos;chirilmaydi.
        </p>
        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
          <Btn variant="quiet" onClick={() => setRevoking(null)}>
            Bekor qilish
          </Btn>
          <Btn
            variant="crit"
            icon="block"
            disabled={isPending}
            onClick={() => {
              const target = revoking;
              setRevoking(null);
              if (target) run(() => setUserRole(target.id, "student"));
            }}
          >
            Huquqni olib tashlash
          </Btn>
        </div>
      </Modal>
    </>
  );
}
