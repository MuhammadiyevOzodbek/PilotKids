"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

/** Ilova sahifalarida kutilmagan xato yuz berganda ko'rsatiladi. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] xato:", error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 560,
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
          background: "rgba(229,72,77,.12)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
        }}
      >
        <Icon name="error" size={36} color="#E5484D" />
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
        Nimadir noto&apos;g&apos;ri ketdi
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 26px" }}>
        Xatolik yuz berdi. Qayta urinib ko&apos;ring — muammo takrorlansa, biroz kutib turing.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 24px",
            borderRadius: 13,
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          <Icon name="refresh" size={19} />
          Qayta urinish
        </button>
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
