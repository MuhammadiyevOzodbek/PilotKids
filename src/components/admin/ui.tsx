"use client";

import { useEffect, useId, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";

/* ─────────────────────────── Kartochka ─────────────────────────── */

export function Card({
  title,
  action,
  children,
  padding = 22,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  padding?: number;
}) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      {title && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          <h2
            className="font-display"
            style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}
          >
            {title}
          </h2>
          {action}
        </header>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}

/* ─────────────────────────── Tugmalar ─────────────────────────── */

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  ...props
}: {
  variant?: "primary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
  icon?: string;
  children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const palette: Record<string, CSSProperties> = {
    primary: {
      background: "var(--primary)",
      color: "var(--on-primary)",
      border: "1px solid transparent",
    },
    success: {
      background: "var(--success)",
      color: "var(--on-primary)",
      border: "1px solid transparent",
    },
    danger: {
      background: "var(--danger-soft)",
      color: "var(--danger)",
      border: "1px solid var(--danger)",
    },
    ghost: {
      background: "var(--surface-2)",
      color: "var(--text-2)",
      border: "1px solid var(--border)",
    },
  };

  return (
    <button
      className="tap"
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: size === "sm" ? "8px 13px" : "11px 18px",
        borderRadius: 12,
        fontWeight: 700,
        fontSize: size === "sm" ? 14 : 15,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        ...palette[variant],
        ...props.style,
      }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 17 : 19} />}
      {children}
    </button>
  );
}

/* ─────────────────────────── Forma maydonlari ─────────────────────────── */

const controlStyle: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 15,
  outline: "none",
  fontFamily: "inherit",
};

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--text-2)",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

export function Input({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} className="field" {...props} style={{ ...controlStyle, ...props.style }} />
      {hint && <p style={{ color: "var(--text-3)", fontSize: 13, margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        className="field"
        rows={4}
        {...props}
        style={{ ...controlStyle, resize: "vertical", ...props.style }}
      />
      {hint && <p style={{ color: "var(--text-3)", fontSize: 13, margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  options,
  ...props
}: {
  label: string;
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className="field" {...props} style={{ ...controlStyle, ...props.style }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Checkbox({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontSize: 14.5,
        fontWeight: 600,
        color: "var(--text-2)",
      }}
    >
      <input id={id} type="checkbox" {...props} style={{ width: 20, height: 20, margin: 0 }} />
      {label}
    </label>
  );
}

/* ─────────────────────────── Xabarlar ─────────────────────────── */

export function Alert({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  if (!children) return null;
  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      style={{
        padding: "11px 14px",
        borderRadius: 12,
        fontSize: 14.5,
        fontWeight: 600,
        background: isError ? "var(--danger-soft)" : "var(--success-soft)",
        border: `1px solid ${isError ? "var(--danger)" : "var(--success)"}`,
        color: isError ? "var(--danger)" : "var(--success)",
      }}
    >
      {children}
    </div>
  );
}

/** Rang bilan ajratilgan kichik yorliq (rol, daraja, holat). */
export function Tag({
  children,
  color = "var(--text-2)",
  bg = "var(--surface-3)",
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 99,
        background: bg,
        color,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────── Modal ─────────────────────────── */

export function Modal({
  open,
  title,
  onClose,
  children,
  width = 560,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  // Ochiq turganda fon skroll qilinmasin va Escape yopsin.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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

  /*
   * MUHIM: modal `document.body` ga portal orqali chiqariladi.
   *
   * Admin sahifalari o'z kontentini `animation: fadeUp ... both` bilan
   * o'ralgan `div` ichida ko'rsatadi. `fadeUp` oxirgi kadri
   * `transform: translateY(0)` — `fill-mode: both` tufayli bu transform
   * animatsiya tugagach ham qolib ketadi. Transform esa o'zidan pastdagi
   * `position: fixed` elementlar uchun YANGI containing block yaratadi:
   * modal viewport'ga emas, o'sha `div` ga nisbatan joylashardi. Natijada
   * oyna ekrandan chiqib ketar, sarlavhasi ko'rinmas va fon to'liq
   * qoraymasdi. Portal bu bog'liqlikni butunlay uzadi.
   */
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4,8,18,.55)",
          backdropFilter: "blur(2px)",
          animation: "fadeIn .18s ease both",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: width,
          maxHeight: "88svh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          boxShadow: "var(--shadow-lg)",
          animation: "pop .2s ease both",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <h2
            className="font-display"
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="tap"
            style={{
              display: "grid",
              placeItems: "center",
              width: 38,
              height: 38,
              borderRadius: 11,
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────── Bo'sh holat ─────────────────────────── */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ textAlign: "center", padding: "44px 20px" }}>
      <div
        style={{
          width: 62,
          height: 62,
          borderRadius: 18,
          background: "var(--surface-3)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 14px",
        }}
      >
        <Icon name={icon} size={30} color="var(--text-3)" />
      </div>
      <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", margin: "0 0 6px" }}>
        {title}
      </p>
      {hint && <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 18px" }}>{hint}</p>}
      {action}
    </div>
  );
}
