"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Alert, Button, EmptyState, Modal, Select, Tag } from "@/components/admin/ui";
import { deleteUser, setUserBanned, setUserRole } from "@/lib/admin/actions";
import { initials } from "@/lib/admin/format";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  age: number | null;
  xp: number;
  level: number;
  banned: boolean;
  onboarded: boolean;
  phoneNumber: string | null;
  createdAt: Date;
}

const ROLE_LABEL: Record<string, string> = {
  student: "O'quvchi",
  parent: "Ota-ona",
  admin: "Admin",
};

const ROLE_STYLE: Record<string, { color: string; bg: string }> = {
  student: { color: "var(--primary)", bg: "var(--primary-soft)" },
  parent: { color: "var(--fun-violet)", bg: "var(--fun-violet-soft)" },
  admin: { color: "var(--fun-amber)", bg: "var(--fun-amber-soft)" },
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UsersTable({
  rows,
  currentUserId,
}: {
  rows: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);

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

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="person_search"
        title="Foydalanuvchi topilmadi"
        hint="Qidiruv shartini o'zgartirib ko'ring."
      />
    );
  }

  return (
    <>
      {error && (
        <div style={{ padding: "0 0 16px" }}>
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {/* Jadval tor ekranda gorizontal siljiydi — sahifa emas, shu blok. */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr>
              {["Foydalanuvchi", "Rol", "Yosh", "XP", "Qo'shilgan", "Holat", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "0 14px 12px",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isMe = u.id === currentUserId;
              const roleStyle = ROLE_STYLE[u.role] ?? ROLE_STYLE.student!;
              return (
                <tr key={u.id} className="hover-row">
                  <td style={{ padding: "14px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {initials(u.name)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: "var(--text)",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          {u.name}
                          {isMe && (
                            <span style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 600 }}>
                              (siz)
                            </span>
                          )}
                        </div>
                        <div style={{ color: "var(--text-3)", fontSize: 13.5 }}>
                          {u.phoneNumber ?? u.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: "14px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ minWidth: 130 }}>
                      <Select
                        label=""
                        aria-label={`${u.name} uchun rol`}
                        value={u.role}
                        disabled={isPending || isMe}
                        onChange={(e) => run(() => setUserRole(u.id, e.target.value))}
                        options={Object.entries(ROLE_LABEL).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                        style={{ padding: "8px 10px", fontSize: 14 }}
                      />
                    </div>
                  </td>

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-2)",
                      fontSize: 14.5,
                      fontWeight: 600,
                    }}
                  >
                    {u.age ?? "—"}
                  </td>

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-2)",
                      fontSize: 14.5,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.xp} · {u.level}-dr
                  </td>

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-3)",
                      fontSize: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(u.createdAt)}
                  </td>

                  <td style={{ padding: "14px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {u.banned ? (
                        <Tag color="var(--danger)" bg="var(--danger-soft)">
                          Bloklangan
                        </Tag>
                      ) : (
                        <Tag color={roleStyle.color} bg={roleStyle.bg}>
                          Faol
                        </Tag>
                      )}
                      {!u.onboarded && <Tag>Ro&apos;yxat tugallanmagan</Tag>}
                    </div>
                  </td>

                  <td style={{ padding: "14px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Button
                        size="sm"
                        variant={u.banned ? "success" : "ghost"}
                        disabled={isPending || isMe}
                        onClick={() => run(() => setUserBanned(u.id, !u.banned))}
                        title={u.banned ? "Blokdan chiqarish" : "Bloklash"}
                      >
                        <Icon name={u.banned ? "lock_open" : "block"} size={17} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={isPending || isMe}
                        onClick={() => setConfirmDelete(u)}
                        title="O'chirish"
                      >
                        <Icon name="delete" size={17} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* O'chirish qaytarib bo'lmaydi — tasdiq so'raymiz. */}
      <Modal
        open={confirmDelete !== null}
        title="Foydalanuvchini o'chirish"
        onClose={() => setConfirmDelete(null)}
        width={440}
      >
        <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}>
          <strong style={{ color: "var(--text)" }}>{confirmDelete?.name}</strong> hisobi va unga
          bog&apos;liq barcha ma&apos;lumot (progress, nishonlar, sertifikatlar) butunlay
          o&apos;chadi.
        </p>
        <p style={{ color: "var(--danger)", fontSize: 14.5, fontWeight: 600, margin: "0 0 20px" }}>
          Bu amalni qaytarib bo&apos;lmaydi.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Bekor qilish
          </Button>
          <Button
            variant="danger"
            icon="delete"
            disabled={isPending}
            onClick={() => {
              const target = confirmDelete;
              setConfirmDelete(null);
              if (target) run(() => deleteUser(target.id));
            }}
          >
            O&apos;chirish
          </Button>
        </div>
      </Modal>
    </>
  );
}
