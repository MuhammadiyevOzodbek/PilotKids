"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "@/lib/auth/client";

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: 15.5,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  minHeight: 54,
};

/** Kalitlar hali qo'yilmagan tugma ko'rinishi. */
const disabledStyle: React.CSSProperties = {
  cursor: "not-allowed",
  opacity: 0.6,
  background: "var(--surface-2)",
};

/**
 * "Tez orada" satri tugma ICHIDA turadi.
 *
 * Tugmalar yonma-yon bo'lgani uchun izohni ostiga chiqarsak, ikkita ustun
 * turli balandlikda bo'lib qolardi — shuning uchun matnni tugma ichiga
 * ikkinchi qator qilib qo'yamiz.
 */
function ButtonLabel({ label, soon }: { label: string; soon: boolean }) {
  if (!soon) return <>{label}</>;
  return (
    <span style={{ display: "grid", lineHeight: 1.2, textAlign: "left" }}>
      {label}
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-3)" }}>tez orada</span>
    </span>
  );
}

/** Google'ning rasmiy "G" logotipi — ikonka shrifti brend belgisini bermaydi. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** Telegram logotipi. */
function TelegramMark() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        fill="#fff"
        d="M5.5 11.8l11-4.24c.51-.19.96.12.79.9l-1.87 8.83c-.14.66-.54.82-1.09.51l-3.01-2.22-1.45 1.4c-.16.16-.3.3-.61.3l.21-3.08 5.6-5.06c.24-.21-.05-.33-.38-.12l-6.92 4.36-2.98-.93c-.65-.2-.66-.65.14-.96z"
      />
    </svg>
  );
}

/**
 * Kalitlari hali qo'yilmagan tugma.
 *
 * Yashirib qo'yish o'rniga o'chirilgan holatda ko'rsatamiz: sayt egasi nima
 * yetishmayotganini darhol ko'radi, bola esa ishlamaydigan tugmani bosib
 * hech narsa bo'lmasligiga duch kelmaydi.
 */
function NotConfiguredButton({ mark, label }: { mark: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      title={`${label} — tez orada ochiladi`}
      style={{ ...buttonStyle, ...disabledStyle }}
    >
      {mark}
      <ButtonLabel label={label} soon />
    </button>
  );
}

export function GoogleButton({
  label,
  onError,
  configured = true,
  callbackURL = "/dashboard",
}: {
  label: string;
  onError: (m: string) => void;
  configured?: boolean;
  callbackURL?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    const { error } = await signIn.social({ provider: "google", callbackURL });
    if (error) {
      onError("Google bilan kirishda xatolik. Boshqa usulni sinab ko'ring.");
      setLoading(false);
    }
    // Muvaffaqiyatli bo'lsa brauzer Google'ga o'tadi — loading shu holicha qoladi.
  }

  if (!configured) {
    return <NotConfiguredButton mark={<GoogleMark />} label={label} />;
  }

  return (
    <button type="button" onClick={handle} disabled={loading} style={buttonStyle}>
      <GoogleMark />
      {loading ? "Ochilmoqda…" : label}
    </button>
  );
}

/**
 * Telegram Login Widget.
 *
 * Telegram o'z skriptini yuklab, ichida iframe tugma chizadi. Uni bizning
 * dizaynimizga bo'yab bo'lmaydi, shuning uchun widget'ni ko'rinmas qilib
 * ustiga o'z tugmamizni qo'yamiz: bosilganda widget'dagi tugma bosiladi.
 */
export function TelegramButton({
  botUsername,
  label,
  onError,
  configured = true,
  callbackURL = "/dashboard",
}: {
  botUsername: string;
  label: string;
  onError: (m: string) => void;
  configured?: boolean;
  callbackURL?: string;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Bot sozlanmagan bo'lsa Telegram skriptini umuman yuklamaymiz.
    if (!configured) return;
    const holder = holderRef.current;
    if (!holder || holder.childElementCount > 0) return;

    const authURL = new URL("/api/auth/telegram", window.location.origin);
    authURL.searchParams.set("callbackURL", callbackURL);

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "16");
    script.setAttribute("data-auth-url", authURL.toString());
    script.setAttribute("data-request-access", "write");
    holder.appendChild(script);

    return () => {
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    };
  }, [botUsername, configured, callbackURL]);

  function handleTelegramOpen() {
    if (loading) return;
    setLoading(true);
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    cancelTimerRef.current = setTimeout(() => {
      setLoading(false);
      onError("Telegram orqali kirish bekor qilindi yoki vaqt tugadi.");
    }, 90_000);
  }

  if (!configured) {
    return <NotConfiguredButton mark={<TelegramMark />} label={label} />;
  }

  return (
    <div style={{ position: "relative" }} onPointerDownCapture={handleTelegramOpen}>
      {/* Haqiqiy widget — ko'rinmas, lekin bosiladigan holatda turadi */}
      <div
        ref={holderRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          zIndex: 2,
        }}
      />
      <button
        type="button"
        disabled={loading}
        style={{
          ...buttonStyle,
          // Bosishni ostidagi widget qabul qiladi — bu tugma faqat ko'rinish.
          pointerEvents: "none",
          borderColor: loading ? "var(--border)" : "#2AABEE",
        }}
      >
        <TelegramMark />
        {loading ? "Kirilmoqda…" : label}
      </button>
    </div>
  );
}
