"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";

/**
 * Bosh admin panelining UI to'plami.
 *
 * `@/components/admin/ui` dan ataylab alohida: oddiy admin komponentlari
 * ilova tokenlariga (`--surface`, `--text`) tayanadi va mavzu bilan
 * o'zgaradi, bu yerdagilar esa `superadmin.css` dagi `--sa-*` tokenlarida —
 * har doim qora, zichroq va "boshqaruv pulti" ko'rinishida.
 */

/* ─────────────────────────── Sarlavha ─────────────────────────── */

export function PageHead({
  eyebrow,
  title,
  hint,
  actions,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 22,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="sa-num"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "var(--sa-accent)",
            marginBottom: 7,
          }}
        >
          {eyebrow}
        </div>
        <h1
          className="font-display"
          style={{
            margin: 0,
            fontSize: "clamp(23px,2.6vw,31px)",
            fontWeight: 800,
            letterSpacing: "-.025em",
            color: "#fff",
          }}
        >
          {title}
        </h1>
        {hint && (
          <p style={{ margin: "7px 0 0", color: "var(--sa-dim)", fontSize: 14.5, maxWidth: 720 }}>
            {hint}
          </p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>{actions}</div>}
    </header>
  );
}

/* ─────────────────────────── Panel ─────────────────────────── */

export function Panel({
  title,
  action,
  tone,
  padding = 18,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  tone?: "crit";
  padding?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section className="sa-panel" data-tone={tone} style={style}>
      {title && (
        <div className="sa-panel-head">
          <h2 className="sa-panel-title">{title}</h2>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}

/* ─────────────────────────── Metrika kartochkasi ─────────────────────────── */

export function Stat({
  label,
  value,
  unit,
  delta,
  tint = "var(--sa-accent)",
  spark,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  /** Musbat — o'sish (yashil), manfiy — pasayish (qizil). */
  delta?: number;
  tint?: string;
  spark?: number[];
  icon?: string;
}) {
  return (
    <div className="sa-stat" style={{ "--sa-tint": tint } as CSSProperties}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--sa-faint)",
          }}
        >
          {label}
        </span>
        {icon && <Icon name={icon} size={17} color={tint} />}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          className="sa-num"
          style={{ fontSize: 27, fontWeight: 700, color: "#fff", lineHeight: 1 }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sa-dim)" }}>{unit}</span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 12,
          minHeight: 26,
        }}
      >
        {delta !== undefined ? (
          <span
            className="sa-num"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              fontSize: 12.5,
              fontWeight: 700,
              color: delta >= 0 ? "var(--sa-ok)" : "var(--sa-crit)",
            }}
          >
            <Icon name={delta >= 0 ? "trending_up" : "trending_down"} size={15} />
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        ) : (
          <span />
        )}
        {spark && <Sparkline data={spark} color={tint} />}
      </div>
    </div>
  );
}

/** Kichik trend chizig'i — o'qsiz, faqat shakl uchun. */
export function Sparkline({
  data,
  color = "var(--sa-accent)",
  width = 78,
  height = 24,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / span) * (height - 3) - 1.5}`);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}

/* ─────────────────────────── Yorliqlar ─────────────────────────── */

const TONES = {
  ok: { color: "var(--sa-ok)", bg: "rgba(46,230,168,.13)", border: "rgba(46,230,168,.35)" },
  warn: { color: "var(--sa-warn)", bg: "rgba(255,176,32,.13)", border: "rgba(255,176,32,.35)" },
  crit: { color: "var(--sa-crit)", bg: "rgba(255,77,94,.13)", border: "rgba(255,77,94,.38)" },
  info: { color: "var(--sa-accent-2)", bg: "rgba(0,224,255,.11)", border: "rgba(0,224,255,.3)" },
  root: { color: "#b9a6ff", bg: "rgba(124,92,255,.16)", border: "rgba(124,92,255,.4)" },
  mute: { color: "var(--sa-dim)", bg: "rgba(255,255,255,.05)", border: "var(--sa-line-2)" },
} as const;

export type Tone = keyof typeof TONES;

export function Chip({ tone = "mute", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span className="sa-chip" style={{ color: t.color, background: t.bg, borderColor: t.border }}>
      {children}
    </span>
  );
}

export function StatusDot({ tone = "ok", pulse }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span
      className="sa-dot"
      data-pulse={pulse}
      style={{ background: TONES[tone].color, color: TONES[tone].color }}
    />
  );
}

/* ─────────────────────────── Tugmalar ─────────────────────────── */

export function Btn({
  variant,
  icon,
  children,
  ...props
}: {
  variant?: "primary" | "crit" | "quiet";
  icon?: string;
  children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="sa-btn" data-variant={variant} type={props.type ?? "button"}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}

export function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="sa-switch"
      data-on={on}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
    />
  );
}

/* ─────────────────────────── O'lchov chizig'i ─────────────────────────── */

/** Nisbatni ko'rsatuvchi ingichka chiziq (yuklama, kvota, ulush). */
export function Meter({
  value,
  max = 100,
  color = "var(--sa-accent)",
  height = 6,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      style={{
        height,
        borderRadius: 99,
        background: "rgba(255,255,255,.07)",
        overflow: "hidden",
      }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 99,
          background: color,
          boxShadow: `0 0 10px ${color}`,
          transition: "width .4s ease",
        }}
      />
    </div>
  );
}

/* ─────────────────────────── Modal ─────────────────────────── */

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  width = 560,
  tone,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  width?: number;
  tone?: "crit";
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // `document` faqat klientda bor. Modal esa doim `open: false` bilan
  // render qilinadi va faqat foydalanuvchi bosgach ochiladi — shu sababli
  // server va birinchi klient renderi bir xil (`null`), hidratsiya buzilmaydi.
  if (!open || typeof document === "undefined") return null;

  // `document.body` ga chiqariladi: `.sa-content` animatsiyasi (`transform`)
  // aks holda `position: fixed` uchun containing block yaratib, oynani
  // viewport o'rniga kontent bloki ichiga qamab qo'yadi.
  return createPortal(
    <div className="sa-modal-scrim" onClick={onClose}>
      <div
        className="sa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "17px 20px",
            borderBottom: "1px solid var(--sa-line)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              className="font-display"
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: tone === "crit" ? "var(--sa-crit)" : "#fff",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "var(--sa-dim)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="sa-btn"
            data-variant="quiet"
            onClick={onClose}
            aria-label="Yopish"
            style={{ padding: 8 }}
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────── Bo'sh holat ─────────────────────────── */

export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 18px", color: "var(--sa-faint)" }}>
      <Icon name={icon} size={30} color="var(--sa-faint)" />
      <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 600 }}>{text}</p>
    </div>
  );
}

/* ─────────────────────────── Foydalanuvchi yacheykasi ─────────────────────────── */

export function Person({
  name,
  sub,
  tint = "var(--sa-accent)",
}: {
  name: string;
  sub?: string;
  tint?: string;
}) {
  const letters =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span
        className="sa-num"
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#fff",
          background: `linear-gradient(135deg, ${tint}, rgba(255,255,255,.06))`,
        }}
      >
        {letters}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 650,
            fontSize: 13.5,
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        {sub && (
          <div
            className="sa-num"
            style={{
              fontSize: 11.5,
              color: "var(--sa-faint)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
