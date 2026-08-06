import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Robot3D } from "@/components/robot-3d";
import { AuthShell } from "@/components/auth/auth-shell";
import { requireUserRaw } from "@/lib/auth/session";
import { WelcomeClient } from "./welcome-client";

export const metadata: Metadata = {
  title: "Xush kelibsiz",
  robots: { index: false },
};

export default async function WelcomePage() {
  const user = await requireUserRaw();
  // Allaqachon to'ldirgan bo'lsa bu sahifada ushlab turmaymiz.
  if (user.onboarded) redirect("/dashboard");

  // Telefon orqali kirganda nom "Yangi o'quvchi" bo'ladi — uni bo'sh
  // ko'rsatamiz, bola o'z ismini yozsin.
  const initialName = user.name === "Yangi o'quvchi" ? "" : user.name;

  return (
    <AuthShell
      aside={
        <div style={{ position: "relative" }}>
          <Robot3D
            kind="hero"
            className="auth-aside-hide"
            style={{ height: 240, animation: "floatY 6s ease-in-out infinite" }}
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
            Robo sizni kutmoqda!
          </h2>
          <p
            className="auth-aside-hide"
            style={{ color: "#AEBBD4", fontSize: 16.5, lineHeight: 1.6, maxWidth: 360, margin: 0 }}
          >
            Bir necha soniya — va birinchi robotingizni qurishni boshlaymiz.
          </p>
        </div>
      }
    >
      <WelcomeClient initialName={initialName} />
    </AuthShell>
  );
}
