import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "Hisob vaqtincha yopilgan",
  robots: { index: false },
};

/**
 * Admin bloklagan hisob shu yerga tushadi.
 * Sabab ko'rsatilmaydi — bola uchun aniq, bosim qilmaydigan matn.
 */
export default function BlockedPage() {
  return (
    <main
      id="content"
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: "var(--danger-soft)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
          }}
        >
          <Icon name="shield_person" size={36} color="var(--danger)" />
        </div>
        <h1
          className="font-display"
          style={{
            fontWeight: 800,
            fontSize: "clamp(24px,5vw,30px)",
            margin: "0 0 12px",
            color: "var(--text)",
          }}
        >
          Hisobingiz vaqtincha yopilgan
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 16, lineHeight: 1.65, margin: "0 0 28px" }}>
          Nima bo&apos;lganini bilish uchun ota-onangiz bilan birga bizga yozing — biz albatta
          yordam beramiz.
        </p>
        <Link
          href="/"
          className="tap"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 26px",
            borderRadius: 14,
            background: "var(--primary)",
            color: "var(--on-primary)",
            fontWeight: 700,
            fontSize: 15.5,
          }}
        >
          <Icon name="home" size={20} color="#fff" />
          Bosh sahifaga
        </Link>
      </div>
    </main>
  );
}
