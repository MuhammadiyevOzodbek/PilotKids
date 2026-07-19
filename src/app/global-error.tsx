"use client";

import { useEffect } from "react";

/**
 * Root layout darajasidagi xato — bu holda `layout.tsx` render bo'lmaydi,
 * shuning uchun o'z `<html>` va `<body>` teglarimizni beramiz.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] xato:", error);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0B1220",
          color: "#EAF0FB",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <p style={{ fontSize: 44, margin: "0 0 12px" }}>🤖</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>Kutilmagan xatolik</h1>
          <p style={{ color: "#AEBBD4", fontSize: 15, lineHeight: 1.6, margin: "0 0 26px" }}>
            Sayt yuklanishida muammo yuz berdi. Sahifani yangilab ko&apos;ring.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "13px 26px",
              borderRadius: 13,
              border: "none",
              background: "#2F6BF3",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
