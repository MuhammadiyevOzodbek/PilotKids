import Link from "next/link";
import { Icon } from "@/components/icon";
import { Card } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getAdminUsers, PAGE_SIZE } from "@/lib/admin/queries";
import { UsersTable } from "./users-table";

export const metadata = { title: "Foydalanuvchilar" };

const ROLE_TABS = [
  { value: "all", label: "Barchasi" },
  { value: "student", label: "O'quvchilar" },
  { value: "parent", label: "Ota-onalar" },
  { value: "admin", label: "Adminlar" },
  { value: "superadmin", label: "Bosh adminlar" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  // Foydalanuvchilar ro'yxati barcha PII'ni (email, telefon, yosh) ko'rsatadi —
  // bu faqat SUPERADMIN uchun. Oddiy `admin` kontent roli, unga bu ochilmasin.
  const me = await requireSuperAdmin();
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const role = sp.role ?? "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total, pages } = await getAdminUsers({ q, role, page });

  /** Joriy filtrni saqlab, faqat bitta parametrni almashtiradi. */
  const linkTo = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role !== "all") params.set("role", role);
    Object.entries(patch).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    const s = params.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <h1
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(24px,3vw,30px)",
          letterSpacing: "-.02em",
          margin: "0 0 6px",
          color: "var(--text)",
        }}
      >
        Foydalanuvchilar
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 15.5, margin: "0 0 22px" }}>
        Jami {total} ta hisob
        {q && ` · "${q}" bo'yicha qidiruv`}
      </p>

      {/* Qidiruv — GET forma, holat URL'da qoladi (havolani ulashsa ham ishlaydi) */}
      <form
        action="/admin/users"
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        {role !== "all" && <input type="hidden" name="role" value={role} />}
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Icon
            name="search"
            size={20}
            color="var(--text-3)"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Ism yoki email bo'yicha qidirish"
            placeholder="Ism yoki email bo'yicha qidirish…"
            className="field"
            style={{
              width: "100%",
              padding: "12px 14px 12px 44px",
              borderRadius: 13,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>
        <button
          type="submit"
          className="tap"
          style={{
            padding: "12px 22px",
            borderRadius: 13,
            border: "none",
            background: "var(--primary)",
            color: "var(--on-primary)",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Qidirish
        </button>
      </form>

      {/* Rol bo'yicha filtr */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {ROLE_TABS.map((t) => {
          const active = role === t.value;
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (t.value !== "all") params.set("role", t.value);
          const href = params.toString() ? `/admin/users?${params}` : "/admin/users";
          return (
            <Link
              key={t.value}
              href={href}
              className="tap"
              style={{
                padding: "9px 16px",
                borderRadius: 11,
                fontWeight: 700,
                fontSize: 14.5,
                background: active ? "var(--primary-soft)" : "var(--surface)",
                color: active ? "var(--primary)" : "var(--text-2)",
                border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <Card padding={16}>
        <UsersTable rows={rows} currentUserId={me.id} currentUserRole={me.role ?? "admin"} />
      </Card>

      {pages > 1 && (
        <nav
          aria-label="Sahifalar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 20,
          }}
        >
          {page > 1 && (
            <Link
              href={linkTo({ page: String(page - 1) })}
              className="tap"
              style={{
                padding: "10px 16px",
                borderRadius: 11,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-2)",
                fontWeight: 700,
                fontSize: 14.5,
              }}
            >
              ← Oldingi
            </Link>
          )}
          <span style={{ color: "var(--text-2)", fontSize: 14.5, fontWeight: 600 }}>
            {page} / {pages} · {PAGE_SIZE} tadan
          </span>
          {page < pages && (
            <Link
              href={linkTo({ page: String(page + 1) })}
              className="tap"
              style={{
                padding: "10px 16px",
                borderRadius: 11,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-2)",
                fontWeight: 700,
                fontSize: 14.5,
              }}
            >
              Keyingi →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
