"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { signOut } from "@/lib/auth/client";

/**
 * Sarlavhadagi hisob menyusi (admin va bosh admin panellari uchun).
 *
 * Chiqish mantig'i bitta joyda: `signOut()` → bosh sahifa → `refresh()`.
 * `refresh()` muhim — usiz Next.js keshlangan server komponentlarini qayta
 * so'ramaydi va chiqqandan keyin ham eski, kirgan holatdagi sahifa ko'rinib
 * turadi.
 */

type Theme = "admin" | "root";

const THEMES: Record<
  Theme,
  {
    chipBg: string;
    chipBorder: string;
    text: string;
    avatar: string;
    menuBg: string;
    menuBorder: string;
    itemText: string;
    itemHover: string;
    divider: string;
    shadow: string;
    danger: string;
    dangerSoft: string;
  }
> = {
  admin: {
    chipBg: "var(--surface)",
    chipBorder: "var(--border)",
    text: "var(--text)",
    avatar: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
    menuBg: "var(--surface)",
    menuBorder: "var(--border)",
    itemText: "var(--text-2)",
    itemHover: "var(--surface-2)",
    divider: "var(--border)",
    shadow: "var(--shadow-lg)",
    danger: "var(--danger)",
    dangerSoft: "var(--danger-soft)",
  },
  root: {
    chipBg: "rgba(124,92,255,.1)",
    chipBorder: "rgba(124,92,255,.4)",
    text: "#fff",
    avatar: "linear-gradient(135deg,#7c5cff,#ff4d5e)",
    menuBg: "#10131e",
    menuBorder: "var(--sa-line-2)",
    itemText: "var(--sa-dim)",
    itemHover: "rgba(255,255,255,.05)",
    divider: "var(--sa-line)",
    shadow: "0 30px 70px -25px rgba(0,0,0,.9)",
    danger: "#ff8b96",
    dangerSoft: "rgba(255,77,94,.14)",
  },
};

export function AccountMenu({
  name,
  theme = "admin",
  /** Avatardagi ikonka — bosh adminda kalit, oddiy adminda qalqon. */
  icon = "shield_person",
}: {
  name: string;
  theme?: Theme;
  icon?: string;
}) {
  const t = THEMES[theme];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Tashqariga bosilsa yoki Escape bosilsa yopiladi.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      // Sahifa almashmasa ham tugma qayta bosiladigan holatga qaytsin.
      setBusy(false);
      setOpen(false);
    }
  }

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px 13px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: t.itemText,
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className="tap"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Hisob menyusi"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "6px 11px 6px 6px",
          borderRadius: 99,
          border: `1px solid ${t.chipBorder}`,
          background: t.chipBg,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: t.avatar,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={17} color="#fff" />
        </span>
        <span
          className="app-header-name"
          style={{ fontWeight: 700, fontSize: 14.5, color: t.text, whiteSpace: "nowrap" }}
        >
          {name}
        </span>
        <Icon
          name="expand_more"
          size={18}
          color={t.itemText}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 216,
            padding: 6,
            borderRadius: 14,
            background: t.menuBg,
            border: `1px solid ${t.menuBorder}`,
            boxShadow: t.shadow,
            zIndex: 60,
            animation: "pop .16s ease both",
          }}
        >
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.itemHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="home" size={19} />
            Ilovaga qaytish
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.itemHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="settings" size={19} />
            Sozlamalar
          </Link>

          <div style={{ height: 1, background: t.divider, margin: "6px 4px" }} />

          <button
            type="button"
            role="menuitem"
            onClick={logout}
            disabled={busy}
            style={{
              ...itemStyle,
              color: t.danger,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.65 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.dangerSoft)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="logout" size={19} />
            {busy ? "Chiqilmoqda…" : "Chiqish"}
          </button>
        </div>
      )}
    </div>
  );
}
