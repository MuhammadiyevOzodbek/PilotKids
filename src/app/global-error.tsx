"use client";

import { useEffect } from "react";

/**
 * Ildiz darajasidagi kutilmagan xatoliklar uchun oxirgi chegara. Bu komponent
 * root layout'ni almashtiradi, shuning uchun o'zining <html>/<body>'si bo'lishi
 * shart. Minimal, bog'liqliksiz (inline uslub) — hatto layout yiqilsa ham ishlaydi.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] jiddiy xatolik:", error);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1120",
          color: "#f1f5f9",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Kutilmagan xatolik</h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 20px" }}>
            Ilovada jiddiy xatolik yuz berdi. Sahifani qayta yuklab ko'ring.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "linear-gradient(135deg, #38bdf8, #06b6d4, #2563eb)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Qaytadan urinish
          </button>
        </div>
      </body>
    </html>
  );
}
