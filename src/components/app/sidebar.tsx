"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { navItems } from "@/lib/data";
import { useSidebar } from "@/lib/ui-store";

const detailsParent: Record<string, string> = {
  "/courses/details": "/courses",
  "/lesson": "/courses",
  "/quiz": "/courses",
};

export function Sidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();

  // Sahifa almashganda mobil panel yopilsin
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Panel ochiq turganda Escape yopadi
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <div className="app-backdrop" data-open={open} onClick={close} />
      <aside
        className="app-sidebar"
        data-open={open}
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "24px 18px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 11, padding: "6px 10px 22px" }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 8px 18px -6px var(--ring)",
            }}
          >
            <Icon name="smart_toy" size={22} color="#fff" />
          </div>
          <span
            className="font-display"
            style={{ fontWeight: 800, fontSize: 19, color: "var(--text)" }}
          >
            PilotKids
          </span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((n) => {
            const active = pathname === n.href || detailsParent[pathname] === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  padding: "11px 14px",
                  borderRadius: 13,
                  cursor: "pointer",
                  transition: "all .18s ease",
                  background: active ? "var(--primary-soft)" : "transparent",
                  color: active ? "var(--primary)" : "var(--text-2)",
                }}
              >
                <Icon name={n.icon} size={22} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div
          style={{
            background: "linear-gradient(135deg,#12203f,#0B1220)",
            borderRadius: 18,
            padding: 18,
            color: "#EAF0FB",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="shield_person" size={20} color="#38d39a" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Ota-ona rejimi</span>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#AEBBD4", lineHeight: 1.5 }}>
            Farzandingiz progressi va ekran vaqtini kuzating.
          </p>
          <Link
            href="/parent"
            className="tap"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 9,
              borderRadius: 10,
              background: "rgba(255,255,255,.1)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Ochish
          </Link>
        </div>

        <Link
          href="/settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            borderRadius: 12,
            color: "var(--text-2)",
          }}
        >
          <Icon name="settings" size={21} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Sozlamalar</span>
        </Link>
      </aside>
    </>
  );
}
