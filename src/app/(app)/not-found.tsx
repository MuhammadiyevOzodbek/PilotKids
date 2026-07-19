import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Ilova ichidagi 404 — sidebar va header saqlanib qoladi,
 * shuning uchun foydalanuvchi "saytdan chiqib ketgandek" bo'lmaydi.
 */
export default function AppNotFound() {
  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "60px 24px",
        textAlign: "center",
        animation: "fadeUp .5s ease both",
      }}
    >
      <span
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "var(--surface-3)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
        }}
      >
        <Icon name="search_off" size={36} color="var(--text-3)" />
      </span>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 24,
          margin: "0 0 10px",
          color: "var(--text)",
        }}
      >
        Bunday sahifa topilmadi
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 26px" }}>
        Siz qidirgan kurs yoki dars mavjud emas — balki havola eskirgandir.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/courses"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 24px",
            borderRadius: 13,
            background: "var(--primary)",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          <Icon name="menu_book" size={19} />
          Kurslarga
        </Link>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 24px",
            borderRadius: 13,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}
