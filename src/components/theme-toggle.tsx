"use client";

import type { CSSProperties } from "react";
import { useTheme } from "@/lib/theme";
import { Icon } from "@/components/icon";

/** Tema almashtirish tugmasi. `variant` orqali navy (hero) yoki surface ko'rinishi. */
export function ThemeToggle({
  variant = "surface",
  style,
}: {
  variant?: "surface" | "navy";
  style?: CSSProperties;
}) {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const icon = theme === "light" ? "dark_mode" : "light_mode";

  const base: CSSProperties =
    variant === "navy"
      ? {
          border: "1px solid rgba(255,255,255,.14)",
          background: "rgba(255,255,255,.06)",
          color: "#EAF0FB",
        }
      : {
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
        };

  return (
    <button
      onClick={toggle}
      aria-label="Temani almashtirish"
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        ...base,
        ...style,
      }}
    >
      <Icon name={icon} size={21} />
    </button>
  );
}
