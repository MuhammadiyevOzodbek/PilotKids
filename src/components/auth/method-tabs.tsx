"use client";

import { Icon } from "@/components/icon";

/**
 * Kirish/ro'yxatdan o'tish usulini tanlash tugmalari.
 *
 * `role="tablist"` + `aria-selected` — klaviatura va ekran o'quvchi uchun bu
 * oddiy tugmalar to'plami emas, balki tanlov ekanini bildiradi.
 */
export function MethodTabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; icon: string; label: string }[];
  label: string;
}) {
  // Bitta variant qolganda tanlov ko'rsatish mantiqsiz — umuman chizmaymiz.
  if (options.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label={label}
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 16,
        background: "var(--surface-3)",
        marginBottom: 24,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="tap"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "11px 8px",
              borderRadius: 12,
              border: "none",
              background: active ? "var(--surface)" : "transparent",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              color: active ? "var(--primary)" : "var(--text-2)",
              fontWeight: 700,
              fontSize: 14.5,
              cursor: "pointer",
              transition: "all .18s ease",
            }}
          >
            <Icon name={o.icon} size={19} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
