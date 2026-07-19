import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata = { title: "Sahifa topilmadi — PilotKids" };

/** 404 — mavjud bo'lmagan sahifa. */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "40px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <span
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            background: "var(--primary-soft)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 22px",
          }}
        >
          <Icon name="smart_toy" size={42} color="var(--primary)" />
        </span>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 52,
            color: "var(--primary)",
            margin: "0 0 6px",
            lineHeight: 1,
          }}
        >
          404
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 26,
            margin: "0 0 12px",
            color: "var(--text)",
          }}
        >
          Bu sahifa topilmadi
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 28px" }}>
          Robo bu manzilni qidirib topolmadi. Balki havola eskirgan yoki manzilda xatolik bordir.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 26px",
              borderRadius: 14,
              background: "var(--primary)",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: "0 12px 26px -12px var(--ring)",
            }}
          >
            <Icon name="grid_view" size={19} />
            Bosh sahifaga
          </Link>
          <Link
            href="/courses"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 26px",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Kurslarni ko&apos;rish
          </Link>
        </div>
      </div>
    </div>
  );
}
