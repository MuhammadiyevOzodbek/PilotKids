import { Icon } from "@/components/icon";

/** Sahifa ma'lumoti yuklanayotganda ko'rsatiladi. */
export default function AppLoading() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "50vh",
        gap: 14,
      }}
      role="status"
      aria-live="polite"
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: "var(--primary-soft)",
          display: "grid",
          placeItems: "center",
          animation: "pulse 1.4s ease-in-out infinite",
        }}
      >
        <Icon name="smart_toy" size={30} color="var(--primary)" />
      </span>
      <p style={{ color: "var(--text-3)", fontSize: 14, fontWeight: 600, margin: 0 }}>
        Yuklanmoqda…
      </p>
    </div>
  );
}
