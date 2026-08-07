"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { AccountMenu } from "@/components/account-menu";
import { Chip, StatusDot } from "@/components/superadmin/ui";

/**
 * Bosh admin qobig'i.
 *
 * Oddiy admin qobig'idan (`admin-shell.tsx`) farqi ataylab keskin: guruhlangan
 * navigatsiya, muhit (prod/staging) almashtirgichi, jonli soat, ⌘K buyruq
 * paneli va "ROOT ACCESS" nishoni. Oddiy admin bu elementlarning birortasini
 * ham ko'rmaydi.
 */

interface NavItem {
  href: string;
  icon: string;
  label: string;
  /** O'ng chekkadagi kichik hisoblagich (diqqat talab qiladigan narsalar). */
  badge?: string;
  tone?: "crit" | "warn";
}

type ShellStats = {
  adminCount: number;
  moderationOpenCount: number;
  serviceIssueCount: number;
  serviceOkCount: number;
  serviceTotalCount: number;
  threatOpenCount: number;
};

function countBadge(value: number) {
  return value > 0 ? String(value) : undefined;
}

function buildNav(stats: ShellStats): { group: string; items: NavItem[] }[] {
  return [
    {
      group: "Boshqaruv",
      items: [
        { href: "/superadmin", icon: "radar", label: "Boshqaruv markazi" },
        { href: "/superadmin/moliya", icon: "payments", label: "Moliya" },
        { href: "/superadmin/hududlar", icon: "public", label: "Hududlar" },
      ],
    },
    {
      group: "Odamlar",
      items: [
        {
          href: "/superadmin/adminlar",
          icon: "shield_person",
          label: "Adminlar",
          badge: countBadge(stats.adminCount),
        },
        { href: "/superadmin/ruxsatlar", icon: "lock_person", label: "Ruxsatlar" },
        {
          href: "/superadmin/moderatsiya",
          icon: "gavel",
          label: "Moderatsiya",
          badge: countBadge(stats.moderationOpenCount),
          tone: "warn",
        },
      ],
    },
    {
      group: "Platforma",
      items: [
        {
          href: "/superadmin/tizim",
          icon: "monitor_heart",
          label: "Tizim holati",
          badge: countBadge(stats.serviceIssueCount),
          tone: "crit",
        },
        {
          href: "/superadmin/xavfsizlik",
          icon: "security",
          label: "Xavfsizlik",
          badge: countBadge(stats.threatOpenCount),
          tone: "crit",
        },
        { href: "/superadmin/audit", icon: "history", label: "Audit jurnali" },
        { href: "/superadmin/sozlamalar", icon: "tune", label: "Global sozlamalar" },
      ],
    },
  ];
}

/** Buyruq panelidagi barcha maqsadlar (navigatsiya + tez amallar). */
function buildCommands(nav: { group: string; items: NavItem[] }[]) {
  return [
    ...nav.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label, group: g.group }))),
    { href: "/admin", label: "Oddiy admin panelga o'tish", group: "Boshqa" },
    { href: "/dashboard", label: "O'quvchi ilovasini ochish", group: "Boshqa" },
  ];
}

export function SuperAdminShell({
  name,
  stats,
  children,
}: {
  name: string;
  stats: ShellStats;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [env, setEnv] = useState<"prod" | "staging">("prod");
  const [clock, setClock] = useState<string | null>(null);

  const isActive = (href: string) =>
    href === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(href);
  const nav = useMemo(() => buildNav(stats), [stats]);
  const commands = useMemo(() => buildCommands(nav), [nav]);

  // Soat faqat klientda boshlanadi — server HTML'ida vaqt bo'lsa hidratsiya
  // mos kelmaydi, shuning uchun birinchi renderda `null`.
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ⌘K / Ctrl+K — buyruq paneli; Escape hamma narsani yopadi.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPalette((p) => !p);
        setQuery("");
      }
      if (e.key === "Escape") {
        setPalette(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open && !palette) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, palette]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const go = (href: string) => {
    setPalette(false);
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="sa-root">
      <div className="sa-side-scrim" data-open={open} onClick={() => setOpen(false)} />

      {/* ───────────────── Yon panel ───────────────── */}
      <aside className="sa-side" data-open={open} aria-label="Bosh admin bo'limlari">
        <Link
          href="/superadmin"
          onClick={() => setOpen(false)}
          style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 8px 16px" }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              background: "linear-gradient(135deg,#7c5cff,#ff4d5e)",
              boxShadow: "0 8px 22px -8px rgba(124,92,255,.9)",
            }}
          >
            <Icon name="workspace_premium" size={21} color="#fff" />
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              className="font-display"
              style={{ display: "block", fontWeight: 800, fontSize: 16, color: "#fff" }}
            >
              PilotKids
            </span>
            <span
              className="sa-num"
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".15em",
                color: "#b9a6ff",
                textTransform: "uppercase",
              }}
            >
              Bosh boshqaruv
            </span>
          </span>
        </Link>

        <div style={{ padding: "0 8px 12px" }}>
          <span className="sa-root-badge">
            <Icon name="key" size={13} />
            Root access
          </span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column" }}>
          {nav.map((g) => (
            <div key={g.group}>
              <div className="sa-navgroup">{g.group}</div>
              {g.items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="sa-navlink"
                  data-active={isActive(n.href)}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={n.icon} size={19} />
                  <span style={{ flex: 1, minWidth: 0 }}>{n.label}</span>
                  {n.badge && (
                    <span
                      className="sa-num"
                      style={{
                        minWidth: 19,
                        height: 19,
                        padding: "0 5px",
                        borderRadius: 6,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          n.tone === "crit" ? "#ffb8bf" : n.tone === "warn" ? "#ffd79a" : "#c9d2e6",
                        background:
                          n.tone === "crit"
                            ? "rgba(255,77,94,.22)"
                            : n.tone === "warn"
                              ? "rgba(255,176,32,.2)"
                              : "rgba(255,255,255,.07)",
                      }}
                    >
                      {n.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ flex: 1, minHeight: 20 }} />

        {/* Oddiy admin paneliga qaytish — ikki panel borligini aniq ko'rsatadi. */}
        <Link
          href="/admin"
          className="sa-navlink"
          style={{ marginTop: 10, border: "1px dashed var(--sa-line-2)" }}
        >
          <Icon name="arrow_back" size={18} />
          <span style={{ flex: 1 }}>Oddiy admin panel</span>
        </Link>

        <div
          style={{
            marginTop: 10,
            padding: "10px 11px",
            borderRadius: 11,
            background: "rgba(255,255,255,.03)",
            border: "1px solid var(--sa-line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <StatusDot tone="ok" pulse />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sa-dim)" }}>
              Tizim barqaror
            </span>
          </div>
          <div className="sa-num" style={{ fontSize: 11, color: "var(--sa-faint)" }}>
            {stats.serviceTotalCount} xizmatdan {stats.serviceOkCount} tasi normal
          </div>
        </div>
      </aside>

      {/* ───────────────── Asosiy ustun ───────────────── */}
      <div className="sa-main">
        <header className="sa-top">
          <button
            type="button"
            className="sa-btn sa-burger"
            data-variant="quiet"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menyuni ochish"
            aria-expanded={open}
            style={{ padding: 9 }}
          >
            <Icon name="menu" size={19} />
          </button>

          {/* Muhit almashtirgichi — bu panelda qaysi bazaga tegayotganingiz muhim. */}
          <div
            style={{
              display: "flex",
              gap: 3,
              padding: 3,
              borderRadius: 10,
              border: "1px solid var(--sa-line)",
              background: "#090b13",
            }}
          >
            {(["prod", "staging"] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEnv(e)}
                className="sa-num"
                style={{
                  padding: "5px 11px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: env === e ? "#fff" : "var(--sa-faint)",
                  background:
                    env === e
                      ? e === "prod"
                        ? "rgba(255,77,94,.28)"
                        : "rgba(124,92,255,.28)"
                      : "transparent",
                }}
              >
                {e}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPalette(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              maxWidth: 340,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--sa-line)",
              background: "#090b13",
              color: "var(--sa-faint)",
              fontFamily: "inherit",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Icon name="search" size={17} />
            <span style={{ flex: 1 }}>Buyruq yoki bo&apos;lim…</span>
            <span
              className="sa-num"
              style={{
                padding: "2px 6px",
                borderRadius: 5,
                border: "1px solid var(--sa-line-2)",
                fontSize: 10.5,
              }}
            >
              ⌘K
            </span>
          </button>

          <div style={{ flex: 1 }} />

          <span
            className="sa-num"
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--sa-dim)",
              minWidth: 68,
              textAlign: "right",
            }}
          >
            {clock ?? "—"}
          </span>

          <Chip tone={env === "prod" ? "crit" : "root"}>
            {env === "prod" ? "Jonli baza" : "Sinov bazasi"}
          </Chip>

          <AccountMenu name={name} theme="root" icon="key" />
        </header>

        <main id="content" className="sa-content">
          {children}
        </main>
      </div>

      {/* ───────────────── Buyruq paneli ───────────────── */}
      {palette && (
        <div className="sa-modal-scrim" onClick={() => setPalette(false)}>
          <div
            className="sa-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Buyruq paneli"
            style={{ maxWidth: 520, alignSelf: "start", marginTop: "10svh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 14, borderBottom: "1px solid var(--sa-line)" }}>
              <input
                autoFocus
                className="sa-input"
                placeholder="Bo'lim nomini yozing…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hits[0]) go(hits[0].href);
                }}
                aria-label="Buyruq qidirish"
              />
            </div>
            <div style={{ maxHeight: "52svh", overflowY: "auto", padding: 8 }}>
              {hits.length === 0 ? (
                <p
                  style={{
                    padding: 20,
                    margin: 0,
                    textAlign: "center",
                    color: "var(--sa-faint)",
                    fontSize: 13.5,
                  }}
                >
                  Hech narsa topilmadi
                </p>
              ) : (
                hits.map((c) => (
                  <button
                    key={c.href}
                    type="button"
                    onClick={() => go(c.href)}
                    className="sa-navlink"
                    style={{ width: "100%", border: "none", background: "none", cursor: "pointer" }}
                  >
                    <Icon name="chevron_right" size={17} />
                    <span style={{ flex: 1, textAlign: "left" }}>{c.label}</span>
                    <span style={{ fontSize: 11, color: "var(--sa-faint)" }}>{c.group}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
