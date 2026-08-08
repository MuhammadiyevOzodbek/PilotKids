"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Xato chegaralari (`error.tsx`) uchun umumiy ko'rinish.
 *
 * Har bir segment o'z `error.tsx`iga ega bo'lishi kerak — aks holda xato
 * `global-error`gacha ko'tarilib, foydalanuvchi layout'siz yalang'och sahifani
 * ko'radi. Ko'rinish bir xil bo'lishi uchun uni shu yerda saqlaymiz.
 */
export function ErrorView({
  error,
  reset,
  scope,
  homeHref = "/",
  homeLabel = "Bosh sahifa",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Log'da qaysi qism ekanini ko'rsatish uchun (masalan "app", "admin"). */
  scope: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    console.error(`[${scope}] xato:`, error);
  }, [error, scope]);

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
          background: "var(--danger-soft)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
        }}
      >
        <Icon name="error" size={36} color="var(--danger)" />
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
          className="tap"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "13px 24px",
            borderRadius: 13,
            border: "none",
            background: "var(--primary)",
            color: "var(--on-primary)",
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
          href={homeHref}
          className="tap"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
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
          {homeLabel}
        </Link>
      </div>
      {/* `digest` — server log'idagi yozuvni topish uchun yagona kalit. */}
      {error.digest && (
        <p
          style={{ marginTop: 22, fontSize: 12.5, color: "var(--text-3)", fontFamily: "monospace" }}
        >
          Kod: {error.digest}
        </p>
      )}
    </div>
  );
}
