"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { setDailyLimit } from "@/lib/actions/parent";

const OPTIONS = [30, 45, 60, 90, 120, 180];

function label(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} soat ${m} daqiqa`;
  if (h) return `${h} soat`;
  return `${m} daqiqa`;
}

/** Kunlik ekran vaqti chegarasini sozlash. */
export function ScreenTime({ current, usedToday }: { current: number; usedToday: number }) {
  const [limit, setLimit] = useState(current);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(current);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const percent = Math.min(100, Math.round((usedToday / limit) * 100));
  const over = usedToday > limit;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await setDailyLimit(choice, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLimit(res.minutes);
      setPassword("");
      setOpen(false);
    });
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#12203f,#0B1220)",
        borderRadius: 22,
        padding: 24,
        color: "#EAF0FB",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Icon name="timer" size={22} color="#38d39a" />
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, margin: 0 }}>
          Ekran vaqti
        </h3>
      </div>

      <p style={{ color: "#AEBBD4", fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>
        Kunlik chegara: <strong style={{ color: "#EAF0FB" }}>{label(limit)}</strong>
      </p>

      {/* Bugungi foydalanish */}
      <div
        style={{
          height: 7,
          borderRadius: 99,
          background: "rgba(255,255,255,.14)",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 99,
            background: over ? "#E5484D" : "#38d39a",
            transition: "width .4s ease",
          }}
        />
      </div>
      <p
        style={{
          color: over ? "#ff9b9d" : "#8fa3c4",
          fontSize: 12.5,
          margin: "0 0 16px",
          fontWeight: 600,
        }}
      >
        Bugun: {label(usedToday)} {over ? "· chegaradan oshdi" : `· ${percent}%`}
      </p>

      {open ? (
        <form onSubmit={save}>
          <div
            role="radiogroup"
            aria-label="Kunlik ekran vaqti chegarasi"
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
          >
            {OPTIONS.map((o) => {
              const selected = o === choice;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChoice(o)}
                  disabled={isPending}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 10,
                    border: `1px solid ${selected ? "#38d39a" : "rgba(255,255,255,.18)"}`,
                    background: selected ? "rgba(56,211,154,.18)" : "rgba(255,255,255,.06)",
                    color: "#EAF0FB",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: isPending ? "wait" : "pointer",
                  }}
                >
                  {selected ? "✓ " : ""}
                  {label(o)}
                </button>
              );
            })}
          </div>

          {/* Ota-ona nazorati sozlamasi — parol tasdig'i talab qilinadi. */}
          <label style={{ display: "block", marginBottom: 12 }}>
            <span
              style={{
                display: "block",
                color: "#AEBBD4",
                fontSize: 12.5,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Tasdiqlash uchun hisob parolini kiriting
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(255,255,255,.06)",
                color: "#EAF0FB",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 12,
                border: "none",
                background: "#38d39a",
                color: "#08281c",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              {isPending ? "Tekshirilmoqda…" : "Saqlash"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setError(null);
                setChoice(limit);
              }}
              style={{
                padding: "11px 18px",
                borderRadius: 12,
                border: "none",
                background: "rgba(255,255,255,.08)",
                color: "#AEBBD4",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Bekor
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "none",
            background: "rgba(255,255,255,.1)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Chegarani sozlash
        </button>
      )}

      {error && (
        <p
          role="alert"
          style={{ color: "#ff9b9d", fontSize: 12.5, fontWeight: 600, margin: "10px 0 0" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
