"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";

/** Bosh admin panelidagi kutilmagan xato — qora qobiq ichida qoladi. */
export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 16, minHeight: "56svh" }}>
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,77,94,.13)",
          border: "1px solid rgba(255,77,94,.35)",
        }}
      >
        <Icon name="error" size={27} color="#ff4d5e" />
      </span>

      <div style={{ textAlign: "center" }}>
        <h1
          className="font-display"
          style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#fff" }}
        >
          Boshqaruv paneli javob bermadi
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#838ea6" }}>
          Bo&apos;limni qayta yuklab ko&apos;ring. Takrorlansa — tizim holatini tekshiring.
        </p>
        {error.digest && (
          <p className="sa-num" style={{ margin: "8px 0 0", fontSize: 11.5, color: "#4d566c" }}>
            digest: {error.digest}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" className="sa-btn" data-variant="primary" onClick={reset}>
          <Icon name="refresh" size={17} />
          Qayta urinish
        </button>
        <Link href="/superadmin" className="sa-btn" data-variant="quiet">
          <Icon name="radar" size={17} />
          Boshqaruv markazi
        </Link>
      </div>
    </div>
  );
}
