"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Field, FormError, SubmitButton } from "@/components/auth/field";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { signOut } from "@/lib/auth/client";

/** Ota-ona roziligi katagi (signup'dagi bilan bir xil xatti-harakat). */
function ConsentBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 14,
        borderRadius: 16,
        background: "var(--primary-soft)",
        border: `1px solid ${checked ? "var(--success)" : "var(--border)"}`,
        cursor: "pointer",
        marginBottom: 22,
        transition: "border-color .2s",
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 24, height: 24, margin: 0 }}
      />
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          border: `2px solid ${checked ? "var(--success)" : "var(--text-3)"}`,
          background: checked ? "var(--success)" : "transparent",
          transition: "all .2s",
        }}
      >
        <Icon name="check" size={17} color="#fff" style={{ opacity: checked ? 1 : 0 }} />
      </span>
      <span style={{ fontSize: 14.5, color: "var(--text-2)", lineHeight: 1.5 }}>
        Ota-onam <b style={{ color: "var(--text)" }}>PilotKids&apos;dan foydalanishimga rozi</b> va
        ma&apos;lumotlar xavfsizligi shartlari bilan tanishdi.
      </span>
    </label>
  );
}

/**
 * Onboarding formasi.
 *
 * Google / Telegram / telefon orqali kirgan foydalanuvchida yosh va ota-ona
 * roziligi yo'q — ularsiz ilova sahifalari ochilmaydi, shuning uchun bu qadam
 * o'tkazib yuborilmaydi. Yagona chiqish yo'li — hisobdan chiqish.
 */
export function WelcomeClient({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({ name, age: Number(age), consent });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 420 }}>
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: "var(--primary-soft)",
          display: "grid",
          placeItems: "center",
          marginBottom: 18,
        }}
      >
        <Icon name="waving_hand" size={32} color="var(--primary)" />
      </div>

      <h1
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(27px,5vw,33px)",
          letterSpacing: "-.02em",
          margin: "0 0 8px",
          color: "var(--text)",
        }}
      >
        Yana bitta qadam!
      </h1>
      <p style={{ color: "var(--text-2)", margin: "0 0 26px", fontSize: 16, lineHeight: 1.6 }}>
        Sizga mos darslarni tanlashimiz uchun yoshingizni bilishimiz kerak.
      </p>

      <FormError>{error}</FormError>

      <Field
        label="Ismingiz"
        icon="person"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Amir"
      />

      <Field
        label="Yoshingiz"
        icon="cake"
        type="number"
        inputMode="numeric"
        min={5}
        max={18}
        required
        value={age}
        onChange={(e) => setAge(e.target.value)}
        placeholder="13"
        hint="PilotKids 5–18 yoshdagi o'quvchilar uchun"
      />

      <ConsentBox checked={consent} onChange={setConsent} />

      <SubmitButton loading={isPending}>{isPending ? "Saqlanmoqda…" : "Boshlash 🚀"}</SubmitButton>

      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push("/");
          router.refresh();
        }}
        className="tap"
        style={{
          display: "block",
          width: "100%",
          marginTop: 16,
          padding: 12,
          border: "none",
          background: "transparent",
          color: "var(--text-3)",
          fontWeight: 600,
          fontSize: 14.5,
          cursor: "pointer",
        }}
      >
        Boshqa hisob bilan kirish
      </button>
    </form>
  );
}
