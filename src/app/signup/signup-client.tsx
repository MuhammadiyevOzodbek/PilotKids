"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Field, FormError, SubmitButton } from "@/components/auth/field";
import { GoogleButton, TelegramButton } from "@/components/auth/social-buttons";
import { MethodTabs } from "@/components/auth/method-tabs";
import {
  DevCodeHint,
  ResendRow,
  RESEND_SECONDS,
  codeInputStyle,
  useCountdown,
} from "@/components/auth/otp-forms";
import { authClient, signUp } from "@/lib/auth/client";
import { completePhoneSignup } from "@/lib/actions/onboarding";
import { signupSchema, phoneSignupSchema, otpSchema, firstError } from "@/lib/validation";

type Method = "phone" | "email";

interface Props {
  methods: { google: boolean; telegram: boolean; phone: boolean };
  telegramBot: string;
  /** SMS provayderi sozlanmagan dev rejimi — kod terminalga chiqadi, buni aytamiz. */
  devOtpHint: boolean;
}

/**
 * Ota-ona roziligi katagi.
 *
 * `<label onClick>` emas, haqiqiy `<input type="checkbox">` — shunda klaviatura
 * (Tab + Space) va ekran o'quvchi ishlaydi. Katak ko'rinmas qilinadi, ustiga
 * o'z belgimiz chiziladi.
 */
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
        // Ko'rinmas, lekin fokuslanadigan: `display:none` bo'lsa Tab yetmaydi.
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
        Men <b style={{ color: "var(--text)" }}>ota-ona roziligi</b> shartlariga roziman va bola
        ma&apos;lumotlari xavfsizligini tushunaman.
      </span>
    </label>
  );
}

export function SignupClient({ methods, telegramBot, devOtpHint }: Props) {
  const router = useRouter();

  // SMS sozlanmagan bo'lsa telefon oqimini umuman taklif qilmaymiz.
  const [method, setMethod] = useState<Method>(methods.phone ? "phone" : "email");

  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+998");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Telefon oqimining ikkinchi bosqichi: SMS kodi kutilyapti. */
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [deadline, setDeadline] = useState(0);
  const seconds = useCountdown(deadline);

  function switchMethod(m: Method) {
    setMethod(m);
    setError(null);
    setCodeSent(false);
    setCode("");
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Klient tomonda tekshiruv — server ham (auth hook'da) qayta tekshiradi.
    const parsed = signupSchema.safeParse({ name, email, age: Number(age), password, consent });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await signUp.email({
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
        age: parsed.data.age,
        parentConsent: true,
      });
      if (err) {
        setError(
          err.status === 422 || err.code === "USER_ALREADY_EXISTS"
            ? "Bu email allaqachon ro'yxatdan o'tgan. Kiring."
            : err.message || "Hisob yaratishda xatolik",
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Serverga ulanib bo'lmadi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Telefon oqimi, 1-bosqich: formani tekshirib SMS kod yuboramiz.
   *
   * Hisob hali yaratilmaydi — u kod tasdiqlanganda ochiladi. Shu sabab ism,
   * yosh va parol shu komponent state'ida saqlanib turadi va 2-bosqichda
   * `completePhoneSignup` orqali yoziladi.
   */
  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const parsed = phoneSignupSchema.safeParse({
      name,
      phone,
      age: Number(age),
      password,
      consent,
    });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }

    setLoading(true);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: parsed.data.phone });
    setLoading(false);

    if (err) {
      setError(err.message || "Kod yuborilmadi. Raqamni tekshirib, qayta urinib ko'ring.");
      return;
    }
    setCodeSent(true);
    setDeadline(Date.now() + RESEND_SECONDS * 1000);
    setCode("");
  }

  /** Telefon oqimi, 2-bosqich: kodni tasdiqlab, forma ma'lumotlarini saqlaymiz. */
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedCode = otpSchema.safeParse(code);
    if (!parsedCode.success) {
      setError(firstError(parsedCode.error));
      return;
    }
    const parsed = phoneSignupSchema.safeParse({
      name,
      phone,
      age: Number(age),
      password,
      consent,
    });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      setCodeSent(false);
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await authClient.phoneNumber.verify({
        phoneNumber: parsed.data.phone,
        code: parsedCode.data,
      });
      if (err) {
        setError("Kod noto'g'ri yoki muddati tugagan. Qaytadan urinib ko'ring.");
        return;
      }

      const res = await completePhoneSignup({
        name: parsed.data.name,
        age: parsed.data.age,
        consent: true,
        password: parsed.data.password,
      });
      if (!res.ok) {
        // Hisob ochilib bo'ldi — /welcome qolgan ma'lumotni so'raydi.
        setError(res.error);
        router.push("/welcome");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Serverga ulanib bo'lmadi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  const ageField = (
    <Field
      label="Yosh"
      type="number"
      inputMode="numeric"
      min={5}
      max={18}
      required
      value={age}
      onChange={(e) => setAge(e.target.value)}
      placeholder="13"
      style={{ marginBottom: 16 }}
    />
  );

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
          fontSize: "clamp(27px,5vw,32px)",
          letterSpacing: "-.02em",
          margin: "6px 0 8px",
          color: "var(--text)",
        }}
      >
        Hisob yarating
        <Icon name="rocket_launch" size={28} color="var(--fun-violet)" />
      </h1>
      <p style={{ color: "var(--text-2)", margin: "0 0 22px", fontSize: 16 }}>
        Bepul boshlang — karta talab qilinmaydi
      </p>

      {/* Tez ro'yxatdan o'tish — formani to'ldirmasdan bir bosishda.
          Yosh va ota-ona roziligi keyingi qadamda (/welcome) so'raladi. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
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
      <p
        style={{
          color: "var(--text-3)",
          fontSize: 13.5,
          textAlign: "center",
          margin: "0 0 20px",
          lineHeight: 1.5,
        }}
      >
        Yosh va ota-ona roziligini keyingi qadamda so&apos;raymiz.
      </p>

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
        yoki ro&apos;yxatdan o&apos;ting
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <MethodTabs
        label="Ro'yxatdan o'tish usuli"
        value={method}
        onChange={switchMethod}
        options={[
          ...(methods.phone
            ? [{ value: "phone" as const, icon: "smartphone", label: "Telefon" }]
            : []),
          { value: "email" as const, icon: "mail", label: "Email" },
        ]}
      />

      {method === "email" && (
        <form onSubmit={handleEmailSubmit}>
          <FormError>{error}</FormError>

          <Field
            label="To'liq ism"
            icon="person"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Amir Karimov"
            style={{ marginBottom: 16 }}
          />

          <div className="signup-row" style={{ gap: 12 }}>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siz@misol.uz"
              style={{ marginBottom: 16 }}
            />
            {ageField}
          </div>

          <Field
            label="Parol"
            icon="lock"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            hint="Kamida 8 belgi, ichida harf va raqam bo'lsin."
          />

          <ConsentBox checked={consent} onChange={setConsent} />

          <SubmitButton loading={loading} variant="success">
            {loading ? "Yaratilmoqda…" : "Hisob yaratish"}
          </SubmitButton>
        </form>
      )}

      {method === "phone" && !codeSent && (
        <form onSubmit={sendCode}>
          <FormError>{error}</FormError>

          <Field
            label="To'liq ism"
            icon="person"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Amir Karimov"
            style={{ marginBottom: 16 }}
          />

          <div className="signup-row" style={{ gap: 12 }}>
            <Field
              label="Telefon"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              style={{ marginBottom: 16 }}
            />
            {ageField}
          </div>

          <Field
            label="Parol"
            icon="lock"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            hint="Kamida 8 belgi, ichida harf va raqam bo'lsin."
          />

          <ConsentBox checked={consent} onChange={setConsent} />

          <SubmitButton loading={loading} variant="success">
            {loading ? "Yuborilmoqda…" : "SMS kod olish"}
          </SubmitButton>
        </form>
      )}

      {method === "phone" && codeSent && (
        <form onSubmit={verifyCode}>
          <FormError>{error}</FormError>
          <DevCodeHint show={devOtpHint} />
          <Field
            label="SMS'dagi kod"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            style={{ marginBottom: 20 }}
            inputStyle={codeInputStyle}
          />
          <SubmitButton loading={loading} variant="success">
            {loading ? "Tekshirilmoqda…" : "Hisob yaratish"}
          </SubmitButton>
          <ResendRow
            seconds={seconds}
            target={phone}
            onResend={() => sendCode()}
            onBack={() => {
              setCodeSent(false);
              setError(null);
            }}
          />
        </form>
      )}

      <p style={{ textAlign: "center", color: "var(--text-2)", marginTop: 22, fontSize: 15 }}>
        Hisobingiz bormi?{" "}
        <Link href="/login" className="tap-inline" style={{ fontWeight: 700 }}>
          Kirish
        </Link>
      </p>
    </div>
  );
}
