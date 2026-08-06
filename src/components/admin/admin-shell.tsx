"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/admin", icon: "monitoring", label: "Umumiy" },
  { href: "/admin/users", icon: "group", label: "Foydalanuvchilar" },
  { href: "/admin/courses", icon: "school", label: "Kurslar" },
  { href: "/admin/quiz", icon: "quiz", label: "Testlar" },
];

/**
 * Admin panel qobig'i.
 *
 * Ilova qobig'idan (`(app)/layout.tsx`) ataylab alohida: bu yer bolalar uchun
 * emas, boshqaruv uchun — quyuqroq, zichroq, o'yin elementlarisiz.
 */
export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div style={{ display: "flex", minHeight: "100svh", background: "var(--bg)" }}>
      <div className="app-backdrop" data-open={open} onClick={() => setOpen(false)} />

      <aside
        className="app-sidebar"
        data-open={open}
        style={{
          background: "linear-gradient(180deg,#12203f,#0B1220)",
          borderRight: "1px solid rgba(255,255,255,.08)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          color: "#EAF0FB",
        }}
      >
        <Link
          href="/admin"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "6px 10px 22px",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="admin_panel_settings" size={22} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 17 }}>
              PilotKids
            </div>
            <div style={{ fontSize: 13, color: "#8fb2ff", fontWeight: 700 }}>Admin panel</div>
          </div>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: 12,
                  transition: "all .18s ease",
                  background: active ? "rgba(76,130,247,.22)" : "transparent",
                  color: active ? "#fff" : "#AEBBD4",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                <Icon name={n.icon} size={21} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            borderRadius: 12,
            color: "#AEBBD4",
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          <Icon name="arrow_back" size={20} />
          Ilovaga qaytish
        </Link>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          className="app-header"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            background: "color-mix(in srgb,var(--bg) 84%,transparent)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            className="app-burger tap"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menyuni ochish"
            aria-expanded={open}
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

          <div style={{ flex: 1 }} />

          <ThemeToggle />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 14px 7px 9px",
              borderRadius: 99,
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Icon name="shield_person" size={17} color="#fff" />
            </span>
            <span
              className="app-header-name"
              style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}
            >
              {name}
            </span>
          </div>
        </header>

        <main className="app-main" style={{ flex: 1 }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
