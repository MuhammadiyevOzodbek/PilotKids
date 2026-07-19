"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/app/global-search";
import { NotificationsMenu, type NotificationItem } from "@/components/app/notifications-menu";
import { useSidebar } from "@/lib/ui-store";

export function AppHeader({
  name,
  initials,
  xp,
  streak,
  notifications,
}: {
  name: string;
  initials: string;
  xp: string;
  streak: number;
  notifications: NotificationItem[];
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

      <GlobalSearch />
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

      <NotificationsMenu notifications={notifications} />

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
