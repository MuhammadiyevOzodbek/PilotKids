"use client";

import { useId, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "@/components/icon";

/**
 * Yorliq + input juftligi.
 *
 * `useId()` bilan har bir input o'z yorlig'iga `htmlFor` orqali bog'lanadi —
 * ekran o'quvchi maydon nima uchunligini aytadi va yorliqni bosganda fokus
 * inputga tushadi (bola uchun nishon kattalashadi).
 */
export function Field({
  label,
  icon,
  hint,
  error,
  style,
  inputStyle,
  ...props
}: {
  label: string;
  icon?: string;
  hint?: string;
  error?: string;
  /** Tashqi o'ram uchun (masalan `marginBottom`). */
  style?: CSSProperties;
  /** Input elementining o'ziga qo'shimcha stil (masalan kod maydoni). */
  inputStyle?: CSSProperties;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "style">) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div style={{ marginBottom: 18, ...style }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontWeight: 700,
          fontSize: 14.5,
          color: "var(--text-2)",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <Icon
            name={icon}
            size={20}
            color="var(--text-3)"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          />
        )}
        <input
          id={id}
          className="field"
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ")
            .trim()}
          style={{
            width: "100%",
            padding: icon ? "15px 15px 15px 44px" : "15px",
            borderRadius: 14,
            border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 16,
            outline: "none",
            ...inputStyle,
          }}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={hintId} style={{ color: "var(--text-3)", fontSize: 13, margin: "6px 0 0" }}>
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          style={{ color: "var(--danger)", fontSize: 13.5, fontWeight: 600, margin: "6px 0 0" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Forma xatosi — `role="alert"` bilan ekran o'quvchi darhol e'lon qiladi. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 12,
        background: "var(--danger-soft)",
        border: "1px solid var(--danger)",
        color: "var(--danger)",
        fontSize: 14.5,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

/** Asosiy yuboruv tugmasi. */
export function SubmitButton({
  loading,
  children,
  variant = "primary",
}: {
  loading?: boolean;
  children: ReactNode;
  variant?: "primary" | "success";
}) {
  const bg = variant === "success" ? "var(--success)" : "var(--primary)";
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        display: "block",
        width: "100%",
        padding: 16,
        borderRadius: 16,
        border: "none",
        background: bg,
        color: "#fff",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 16.5,
        cursor: loading ? "wait" : "pointer",
        boxShadow: `0 14px 30px -12px ${variant === "success" ? "rgba(15,164,110,.5)" : "var(--ring)"}`,
        textAlign: "center",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}
