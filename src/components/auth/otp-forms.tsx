"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Field, FormError, SubmitButton } from "@/components/auth/field";
import { authClient } from "@/lib/auth/client";
import { otpSchema, phoneSchema, emailSchema, firstError } from "@/lib/validation";

/** Kodni qayta yuborish uchun kutish vaqti (soniya). */
export const RESEND_SECONDS = 60;

/**
 * "Qayta yuborish" tugmasi ochilishigacha qolgan soniyalar.
 *
 * Qolgan vaqt state'da emas, `deadline` dan render paytida hisoblanadi —
 * effect faqat soatni yurgizadi. Shu bois kod qayta yuborilganda (deadline
 * o'zgarganda) hisob darhol yangilanadi, qo'shimcha render kerak emas.
 */
export function useCountdown(deadline: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** "Kodni qayta yuborish" qatori — kod so'raydigan barcha formalar uchun bir xil. */
export function ResendRow({
  seconds,
  onResend,
  onBack,
  target,
}: {
  seconds: number;
  onResend: () => void;
  onBack: () => void;
  target: string;
}) {
  return (
    <div style={{ marginTop: 18, textAlign: "center", fontSize: 14.5, color: "var(--text-2)" }}>
      <p style={{ margin: "0 0 10px" }}>
        Kod <strong style={{ color: "var(--text)" }}>{target}</strong> ga yuborildi
      </p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onBack}
          className="tap"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-2)",
            fontWeight: 700,
            fontSize: 14.5,
            cursor: "pointer",
            padding: "8px 4px",
          }}
        >
          ← O&apos;zgartirish
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={seconds > 0}
          className="tap"
          style={{
            border: "none",
            background: "transparent",
            color: seconds > 0 ? "var(--text-3)" : "var(--primary)",
            fontWeight: 700,
            fontSize: 14.5,
            cursor: seconds > 0 ? "default" : "pointer",
            padding: "8px 4px",
          }}
        >
          {seconds > 0 ? `Qayta yuborish (${seconds}s)` : "Kodni qayta yuborish"}
        </button>
      </div>
    </div>
  );
}

/** Kod kiritish maydoni — katta, aniq, bolaga qulay (raqamlarni tekshirish oson). */
export const codeInputStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: ".4em",
  textAlign: "center",
  fontFamily: "var(--font-display)",
};

/**
 * SMS/SMTP provayderi sozlanmagan holat (lokal ishlab chiqish).
 *
 * Bunda kod hech qayerga yuborilmaydi — u `npm run dev` terminaliga chiqadi.
 * Buni aytmasak, kod kutib o'tirib "noto'g'ri kod" xatosiga duch kelinadi.
 */
export function DevCodeHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 12,
        background: "var(--fun-amber-soft)",
        border: "1px solid var(--fun-amber)",
        marginBottom: 16,
      }}
    >
      <Icon name="terminal" size={19} color="var(--fun-amber)" />
      <span style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
        <b style={{ color: "var(--text)" }}>Ishlab chiqish rejimi:</b> provayder sozlanmagani uchun
        kod yuborilmadi — u <code>npm run dev</code> terminal oynasida chiqadi.
      </span>
    </div>
  );
}

/* ─────────────────────────── Telefon (SMS) ─────────────────────────── */

export function PhoneLoginForm({ next, devHint = false }: { next: string; devHint?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const seconds = useCountdown(deadline);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }

    setLoading(true);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: parsed.data });
    setLoading(false);

    if (err) {
      setError(err.message || "Kod yuborilmadi. Raqamni tekshirib, qayta urinib ko'ring.");
      return;
    }
    setSent(true);
    setDeadline(Date.now() + RESEND_SECONDS * 1000);
    setCode("");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedCode = otpSchema.safeParse(code);
    if (!parsedCode.success) {
      setError(firstError(parsedCode.error));
      return;
    }
    const parsedPhone = phoneSchema.safeParse(phone);
    if (!parsedPhone.success) {
      setError(firstError(parsedPhone.error));
      return;
    }

    setLoading(true);
    const { error: err } = await authClient.phoneNumber.verify({
      phoneNumber: parsedPhone.data,
      code: parsedCode.data,
    });
    setLoading(false);

    if (err) {
      setError("Kod noto'g'ri yoki muddati tugagan. Qaytadan urinib ko'ring.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (!sent) {
    return (
      <form noValidate onSubmit={send}>
        <FormError>{error}</FormError>
        <Field
          label="Telefon raqami"
          icon="smartphone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998 90 123 45 67"
          hint="SMS orqali 6 xonali kod yuboramiz"
        />
        <SubmitButton loading={loading}>{loading ? "Yuborilmoqda…" : "Kod olish"}</SubmitButton>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={verify}>
      <FormError>{error}</FormError>
      <DevCodeHint show={devHint} />
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
      <SubmitButton loading={loading}>{loading ? "Tekshirilmoqda…" : "Kirish"}</SubmitButton>
      <ResendRow
        seconds={seconds}
        target={phone}
        onResend={() => send()}
        onBack={() => {
          setSent(false);
          setError(null);
        }}
      />
    </form>
  );
}

/* ─────────────────────────── Email (kod bilan) ─────────────────────────── */

export function EmailOtpForm({ next, devHint = false }: { next: string; devHint?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const seconds = useCountdown(deadline);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }

    setLoading(true);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email: parsed.data,
      type: "sign-in",
    });
    setLoading(false);

    if (err) {
      setError(err.message || "Kod yuborilmadi. Emailni tekshirib, qayta urinib ko'ring.");
      return;
    }
    setSent(true);
    setDeadline(Date.now() + RESEND_SECONDS * 1000);
    setCode("");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedCode = otpSchema.safeParse(code);
    if (!parsedCode.success) {
      setError(firstError(parsedCode.error));
      return;
    }
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setError(firstError(parsedEmail.error));
      return;
    }

    setLoading(true);
    const { error: err } = await authClient.signIn.emailOtp({
      email: parsedEmail.data,
      otp: parsedCode.data,
    });
    setLoading(false);

    if (err) {
      setError("Kod noto'g'ri yoki muddati tugagan. Qaytadan urinib ko'ring.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (!sent) {
    return (
      <form noValidate onSubmit={send}>
        <FormError>{error}</FormError>
        <Field
          label="Email manzil"
          icon="mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="siz@gmail.com"
          hint="Parolsiz kirish — pochtangizga 6 xonali kod keladi"
        />
        <SubmitButton loading={loading}>{loading ? "Yuborilmoqda…" : "Kod olish"}</SubmitButton>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={verify}>
      <FormError>{error}</FormError>
      <DevCodeHint show={devHint} />
      <Field
        label="Pochtadagi kod"
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
      <SubmitButton loading={loading}>{loading ? "Tekshirilmoqda…" : "Kirish"}</SubmitButton>
      <ResendRow
        seconds={seconds}
        target={email}
        onResend={() => send()}
        onBack={() => {
          setSent(false);
          setError(null);
        }}
      />
    </form>
  );
}

/** Kod kutilayotganini bildiruvchi ikonkali sarlavha (formadan tepada). */
export function OtpHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <Icon name={icon} size={22} color="var(--primary)" />
      <span style={{ fontWeight: 700, fontSize: 15.5, color: "var(--text)" }}>{title}</span>
    </div>
  );
}
