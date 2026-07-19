"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { updateProfile } from "@/lib/actions/profile";

/** Ism va yoshni tahrirlash formasi (sozlamalar ichida ochiladi). */
export function ProfileEditor({
  initialName,
  initialAge,
  email,
}: {
  initialName: string;
  initialAge: number | null;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState(initialAge ? String(initialAge) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateProfile({ name, age: Number(age) });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    padding: "18px 22px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderBottom: "1px solid var(--border)",
    textAlign: "left",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <>
      <button
        type="button"
        className="hover-row"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={rowStyle}
      >
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "var(--surface-3)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="manage_accounts" size={22} color="var(--text-2)" />
        </span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
          Profilni tahrirlash
        </span>
        <Icon name={open ? "expand_less" : "chevron_right"} size={22} color="var(--text-3)" />
      </button>

      {open && (
        <form
          onSubmit={submit}
          style={{
            padding: "20px 22px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-2)",
                marginBottom: 6,
              }}
            >
              Ism
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-2)",
                marginBottom: 6,
              }}
            >
              Yosh
            </span>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={5}
              max={18}
              required
              style={inputStyle}
            />
          </label>

          <div>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-2)",
                marginBottom: 6,
              }}
            >
              Email
            </span>
            <div
              style={{
                ...inputStyle,
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="lock" size={16} color="var(--text-3)" />
              {email}
            </div>
            <p style={{ color: "var(--text-3)", fontSize: 12.5, margin: "6px 0 0" }}>
              Email manzilni o&apos;zgartirib bo&apos;lmaydi.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              style={{ color: "#E5484D", fontSize: 13.5, fontWeight: 600, margin: 0 }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: "11px 20px",
                borderRadius: 12,
                border: "none",
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14.5,
                cursor: isPending ? "wait" : "pointer",
                opacity: isPending ? 0.75 : 1,
              }}
            >
              {isPending ? "Saqlanmoqda…" : "Saqlash"}
            </button>
            {saved && (
              <span
                role="status"
                style={{
                  color: "var(--success)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icon name="check" size={16} color="var(--success)" />
                Saqlandi
              </span>
            )}
          </div>
        </form>
      )}
    </>
  );
}
