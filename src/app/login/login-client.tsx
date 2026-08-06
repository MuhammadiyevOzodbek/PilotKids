"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Field, FormError, SubmitButton } from "@/components/auth/field";
import { GoogleButton, TelegramButton } from "@/components/auth/social-buttons";
import { MethodTabs } from "@/components/auth/method-tabs";
import { PhoneLoginForm } from "@/components/auth/otp-forms";
import { signIn } from "@/lib/auth/client";
import { phoneSchema, firstError } from "@/lib/validation";

type Method = "password" | "phone";

interface Props {
  methods: {
    google: boolean;
    telegram: boolean;
    phone: boolean;
  };
  telegramBot: string;
  /** SMS provayderi sozlanmagan dev rejimi — kod terminalga chiqadi. */
  devOtpHint: boolean;
}

export function LoginClient({ methods, telegramBot, devOtpHint }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  /**
   * `proxy.ts` himoyalangan sahifaga yo'naltirganda `?next=` qo'yadi.
   * Ochiq yo'naltirishga yo'l qo'ymaslik uchun faqat ichki yo'l qabul qilinadi
   * (`//evil.com` ham tashqi manzil — shuning uchun ikkinchi belgi tekshiriladi).
   */
  const rawNext = params.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [method, setMethod] = useState<Method>("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Bitta maydon — email ham, telefon ham.
   *
   * Ro'yxatdan telefon bilan o'tgan bolaning email manzili yo'q (uning o'rniga
   * ichki `…@phone.pilotkids.uz` turadi), shuning uchun ikkita alohida forma
   * o'rniga kiritilgan qiymatning o'ziga qarab endpoint tanlanadi.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const value = identifier.trim();
      const parsedPhone = phoneSchema.safeParse(value);
      const asPhone = methods.phone && (parsedPhone.success || value.startsWith("+"));

      if (asPhone && !parsedPhone.success) {
        setError(firstError(parsedPhone.error));
        return;
      }

      const { error: err } = asPhone
        ? await signIn.phoneNumber({ phoneNumber: parsedPhone.data!, password })
        : await signIn.email({ email: value, password });

      if (err) {
        setError(
          err.status === 401
            ? asPhone
              ? "Raqam yoki parol noto'g'ri. SMS kod bilan ham kirsangiz bo'ladi."
              : "Email yoki parol noto'g'ri. Hisobingiz bo'lmasa, ro'yxatdan o'ting."
            : err.message || "Kirishda xatolik yuz berdi",
        );
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Serverga ulanib bo'lmadi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <ThemeToggle style={{ float: "right" }} />
      <h1
        className="font-display"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          fontWeight: 800,
          fontSize: "clamp(28px,5vw,34px)",
          letterSpacing: "-.02em",
          margin: "6px 0 8px",
          color: "var(--text)",
        }}
      >
        Xush kelibsiz!
        <Icon name="waving_hand" size={30} color="var(--fun-amber)" />
      </h1>
      <p style={{ color: "var(--text-2)", margin: "0 0 24px", fontSize: 16 }}>
        Qurishda davom etish uchun kiring
      </p>

      {/* Tez kirish — bir bosishda, yonma-yon. Ataylab formadan YUQORIDA:
          bola uchun eng oson yo'l birinchi ko'rinsin.

          `flex: 1 1 150px` — ikkalasi teng bo'linadi, joy 150px'dan torayganda
          o'zi ustma-ust tushadi. Media query kerak emas. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div style={{ flex: "1 1 150px", minWidth: 0 }}>
          <GoogleButton label="Google" onError={setError} configured={methods.google} />
        </div>
        <div style={{ flex: "1 1 150px", minWidth: 0 }}>
          <TelegramButton
            botUsername={telegramBot}
            label="Telegram"
            onError={setError}
            configured={methods.telegram}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          margin: "0 0 22px",
          color: "var(--text-3)",
          fontSize: 14,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        yoki
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <MethodTabs
        label="Kirish usuli"
        value={method}
        onChange={(m) => {
          setMethod(m);
          setError(null);
        }}
        options={[
          { value: "password" as const, icon: "password", label: "Parol" },
          ...(methods.phone
            ? [{ value: "phone" as const, icon: "smartphone", label: "Telefon" }]
            : []),
        ]}
      />

      {method === "phone" && <PhoneLoginForm next={next} devHint={devOtpHint} />}

      {method === "password" && (
        <form onSubmit={handleSubmit}>
          <FormError>{error}</FormError>
          <Field
            label={methods.phone ? "Email yoki telefon" : "Email"}
            icon={methods.phone ? "person" : "mail"}
            type="text"
            inputMode={methods.phone ? "email" : undefined}
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={methods.phone ? "siz@misol.uz yoki +998…" : "siz@misol.uz"}
          />
          <Field
            label="Parol"
            icon="lock"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ marginBottom: 10 }}
          />

          {/* Parolni unutgan bolani boshi berk ko'chaga emas, ishlaydigan
              muqobil usulga yo'naltiramiz. */}
          <div style={{ marginBottom: 20 }}>
            {methods.phone ? (
              <button
                type="button"
                onClick={() => {
                  setMethod("phone");
                  setError(null);
                }}
                className="tap"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "6px 0",
                }}
              >
                Parolni unutdingizmi? SMS kod bilan kiring →
              </button>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-3)" }}>
                Parolni unutdingizmi? Ota-onangizga murojaat qiling.
              </span>
            )}
          </div>

          <SubmitButton loading={loading}>{loading ? "Kirilmoqda…" : "Kirish"}</SubmitButton>
        </form>
      )}

      <p style={{ textAlign: "center", color: "var(--text-2)", marginTop: 28, fontSize: 15 }}>
        Bu yerda yangimisiz?{" "}
        <Link href="/signup" className="tap-inline" style={{ fontWeight: 700 }}>
          Ro&apos;yxatdan o&apos;ting
        </Link>
      </p>
    </div>
  );
}
