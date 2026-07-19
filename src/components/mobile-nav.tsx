"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

/** Ilova sahifalari auth talab qiladi — mehmon `proxy.ts` orqali /login'ga yo'naltiriladi. */
const links = [
  { label: "Kurslar", href: "/courses" },
  { label: "Laboratoriya", href: "/lab" },
  { label: "Ota-onalar", href: "/parent" },
  { label: "Narxlar", href: "/#narxlar" },
];

/** Landing sarlavhasidagi mobil menyu — 900px'dan tor ekranlarda ko'rinadi
 *  (ko'rinishni `.nav-burger` klassi boshqaradi, globals.css'ga qarang). */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Panel ochiq turganda fon skroll qilinmasin
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        className="nav-burger tap"
        aria-label="Menyuni ochish"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{
          placeItems: "center",
          width: 44,
          height: 44,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.16)",
          background: "rgba(255,255,255,.05)",
          color: "#EAF0FB",
          cursor: "pointer",
        }}
      >
        <Icon name="menu" size={22} />
      </button>

      <div className="nav-drawer" data-open={open}>
        <div className="nav-drawer-backdrop" onClick={() => setOpen(false)} />
        <div className="nav-drawer-panel" role="dialog" aria-modal="true" aria-label="Menyu">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span className="font-display" style={{ fontWeight: 800, fontSize: 19, color: "#fff" }}>
              PilotKids
            </span>
            <button
              className="tap"
              aria-label="Menyuni yopish"
              onClick={() => setOpen(false)}
              style={{
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.16)",
                background: "transparent",
                color: "#EAF0FB",
                cursor: "pointer",
              }}
            >
              <Icon name="close" size={22} />
            </button>
          </div>

          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: 48,
                padding: "0 12px",
                borderRadius: 12,
                color: "#AEBBD4",
                fontWeight: 600,
                fontSize: 16,
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}

          <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: "12px 0" }} />

          <Link
            href="/login"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.16)",
              color: "#EAF0FB",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Kirish
          </Link>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              marginTop: 10,
              borderRadius: 12,
              background: "var(--success)",
              color: "#fff",
              fontFamily: "'Sora'",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Boshlash
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 18,
              color: "#8496b5",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Tungi rejim
            <ThemeToggle variant="navy" />
          </div>
        </div>
      </div>
    </>
  );
}
