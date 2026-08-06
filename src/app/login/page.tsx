import { Suspense } from "react";
import type { Metadata } from "next";
import { Robot3D } from "@/components/robot-3d";
import { AuthShell } from "@/components/auth/auth-shell";
import { authMethods, isDev, otpEnabled, telegramBotUsername } from "@/lib/env";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Kirish",
  description: "PilotKids hisobingizga kiring — telefon, parol, Google yoki Telegram orqali.",
};

export default function LoginPage() {
  return (
    <AuthShell
      aside={
        <div style={{ position: "relative" }}>
          <Robot3D
            kind="hero"
            className="auth-aside-hide"
            style={{ height: 260, animation: "floatY 6s ease-in-out infinite" }}
          />
          <h2
            className="auth-aside-hide font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(24px,2.6vw,32px)",
              letterSpacing: "-.02em",
              margin: "8px 0 12px",
              maxWidth: 380,
            }}
          >
            Yana ko&apos;rishganimizdan xursandmiz
          </h2>
          <p
            className="auth-aside-hide"
            style={{ color: "#AEBBD4", fontSize: 16.5, lineHeight: 1.6, maxWidth: 360, margin: 0 }}
          >
            Robo va sizning loyihalaringiz kutmoqda. Qurishda davom etamizmi?
          </p>
        </div>
      }
    >
      {/* `useSearchParams` Suspense chegarasini talab qiladi. */}
      <Suspense fallback={null}>
        <LoginClient
          methods={{
            google: authMethods.google,
            telegram: authMethods.telegram,
            phone: otpEnabled.phone,
          }}
          telegramBot={telegramBotUsername}
          // Provayder yo'q dev rejimi — kod terminalga chiqishini aytamiz.
          devOtpHint={isDev && !authMethods.sms}
        />
      </Suspense>
    </AuthShell>
  );
}
