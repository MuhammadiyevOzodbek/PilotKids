import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { AuthShell } from "@/components/auth/auth-shell";
import { authMethods, isDev, otpEnabled, telegramBotUsername } from "@/lib/env";
import { SignupClient } from "./signup-client";

export const metadata: Metadata = {
  title: "Ro'yxatdan o'tish",
  description:
    "PilotKids'da bepul hisob yarating — robototexnika, Arduino, elektronika va dasturlash darslari.",
  alternates: { canonical: "/signup" },
  // Forma sahifasi indeksga kirmaydi (sitemap'da ham yo'q), lekin havolalari
  // sudralaveradi.
  robots: { index: false, follow: true },
};

const PERKS = [
  "Yosh bo'yicha moslashtirilgan darslar",
  "Ota-ona nazorati va xavfsizlik",
  "Sertifikat bilan tugaydigan yo'llar",
];

export default function SignupPage() {
  return (
    <AuthShell
      orbColor="rgba(15,164,110,.34)"
      aside={
        <div style={{ position: "relative" }}>
          <h2
            className="auth-aside-hide font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(24px,2.8vw,34px)",
              letterSpacing: "-.02em",
              margin: "0 0 16px",
              maxWidth: 400,
            }}
          >
            Minglab yosh quruvchilarga qo&apos;shiling
          </h2>
          <div
            className="auth-aside-hide"
            style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}
          >
            {PERKS.map((text) => (
              <div key={text} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(15,164,110,.2)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="check" size={19} color="#38d39a" />
                </span>
                <span style={{ color: "#c3cee2", fontSize: 15.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SignupClient
        methods={{
          google: authMethods.google,
          telegram: authMethods.telegram,
          phone: otpEnabled.phone,
        }}
        telegramBot={telegramBotUsername}
        // Provayder yo'q dev rejimi — kod terminalga chiqishini aytamiz.
        devOtpHint={isDev && !authMethods.sms}
      />
    </AuthShell>
  );
}
