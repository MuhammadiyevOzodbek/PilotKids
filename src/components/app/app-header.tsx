"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSidebar } from "@/lib/ui-store";

const iconBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

export function AppHeader({
  name,
  initials,
  xp,
  streak,
  hasUnread,
}: {
  name: string;
  initials: string;
  xp: string;
  streak: number;
  hasUnread: boolean;
}) {
  const toggle = useSidebar((s) => s.toggle);

  return (
    <header
      className="app-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        background: "color-mix(in srgb,var(--bg) 82%,transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Ko'rinishni `.app-burger` klassi boshqaradi — shuning uchun bu yerda
          ataylab `display` berilmagan (inline stil klassni bosib ketardi). */}
      <button
        className="app-burger tap"
        onClick={toggle}
        aria-label="Menyuni ochish"
        style={{
          placeItems: "center",
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        <Icon name="menu" size={21} />
      </button>

      <div className="app-header-search" style={{ position: "relative", flex: 1, maxWidth: 440 }}>
        <span
          className="ms"
          aria-hidden
          style={{
            position: "absolute",
            left: 15,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 21,
            color: "var(--text-3)",
          }}
        >
          search
        </span>
        <input
          placeholder="Kurs, dars yoki loyiha qidiring…"
          style={{
            width: "100%",
            padding: "12px 16px 12px 46px",
            borderRadius: 13,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 14.5,
            outline: "none",
          }}
        />
      </div>
      <div style={{ flex: 1 }} />

      <div
        className="app-header-stats"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "9px 14px",
          borderRadius: 12,
          background: "var(--success-soft)",
          color: "var(--success)",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        <Icon name="local_fire_department" size={19} />
        {streak}
      </div>
      <div
        className="app-header-stats"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "9px 14px",
          borderRadius: 12,
          background: "var(--primary-soft)",
          color: "var(--primary)",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        <Icon name="bolt" size={19} />
        {xp} XP
      </div>

      <ThemeToggle />

      <button style={{ ...iconBtn, position: "relative" }} aria-label="Bildirishnomalar">
        <Icon name="notifications" size={21} />
        {hasUnread && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 11,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--success)",
              border: "2px solid var(--surface)",
            }}
          />
        )}
      </button>

      <Link
        href="/profile"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "5px 12px 5px 5px",
          borderRadius: 99,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <span
          style={{
            fontFamily: "'Sora'",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {initials}
        </span>
        <span
          className="app-header-name"
          style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}
        >
          {name}
        </span>
      </Link>
    </header>
  );
}
