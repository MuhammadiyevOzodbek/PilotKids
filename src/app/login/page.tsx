"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Robot3D } from "@/components/robot-3d";
import { signIn } from "@/lib/auth/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "15px 15px 15px 44px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 15,
  outline: "none",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await signIn.email({ email, password });
      if (error) {
        setError(
          error.status === 401
            ? "Email yoki parol noto'g'ri. Hisobingiz bo'lmasa, ro'yxatdan o'ting."
            : error.message || "Kirishda xatolik yuz berdi",
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

  async function handleGoogle() {
    setError(null);
    const { error } = await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (error) setError("Google bilan kirish hozircha sozlanmagan");
  }

  return (
    <div className="auth-split">
      <div
        className="auth-aside"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "radial-gradient(120% 120% at 20% 0%,#16224a,#0B1220)",
          color: "#EAF0FB",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          className="orb"
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(47,107,243,.4),transparent 70%)",
            bottom: -80,
            right: -40,
            filter: "blur(16px)",
            animation: "orbFloat 13s ease-in-out infinite",
          }}
        />
        <Link
          href="/"
          className="tap"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 11,
            cursor: "pointer",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="smart_toy" size={22} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Sora'", fontWeight: 800, fontSize: 20 }}>PilotKids</span>
        </Link>
        <div style={{ position: "relative" }}>
          <Robot3D
            kind="hero"
            className="auth-aside-hide"
            style={{ height: 260, animation: "floatY 6s ease-in-out infinite" }}
          />
          <h2
            className="auth-aside-hide"
            style={{
              fontFamily: "'Sora'",
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
            style={{ color: "#AEBBD4", fontSize: 16, lineHeight: 1.6, maxWidth: 360, margin: 0 }}
          >
            Robo va sizning loyihalaringiz kutmoqda. Qurishda davom etamizmi?
          </p>
        </div>
        <div
          className="auth-aside-hide"
          style={{ position: "relative", color: "#6f82a3", fontSize: 13 }}
        >
          © 2026 PilotKids · Bolalar uchun xavfsiz ta&apos;lim
        </div>
      </div>
      <div
        className="auth-main"
        style={{ display: "grid", placeItems: "center", background: "var(--bg)" }}
      >
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 400 }}>
          <ThemeToggle style={{ float: "right" }} />
          <h1
            style={{
              fontFamily: "'Sora'",
              fontWeight: 800,
              fontSize: "clamp(26px,5vw,32px)",
              letterSpacing: "-.02em",
              margin: "6px 0 8px",
              color: "var(--text)",
            }}
          >
            Xush kelibsiz
          </h1>
          <p style={{ color: "var(--text-2)", margin: "0 0 32px", fontSize: 15.5 }}>
            Qurishda davom etish uchun kiring
          </p>

          <label
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-2)",
              marginBottom: 8,
            }}
          >
            Email
          </label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <Icon
              name="mail"
              size={20}
              color="var(--text-3)"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              className="field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siz@misol.uz"
              style={inputStyle}
            />
          </div>

          <label
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-2)",
              marginBottom: 8,
            }}
          >
            Parol
          </label>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Icon
              name="lock"
              size={20}
              color="var(--text-3)"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              className="field"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <div style={{ textAlign: "right", marginBottom: 22 }}>
            <Link href="/signup" className="tap" style={{ fontSize: 14, fontWeight: 600 }}>
              Parolni unutdingizmi?
            </Link>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(229,72,77,.1)",
                border: "1px solid rgba(229,72,77,.3)",
                color: "#E5484D",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              padding: 16,
              borderRadius: 14,
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontFamily: "'Sora'",
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 14px 30px -12px var(--ring)",
              textAlign: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Kirilmoqda…" : "Kirish"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              margin: "24px 0",
              color: "var(--text-3)",
              fontSize: 13,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            yoki
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            style={{
              width: "100%",
              padding: 15,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Icon name="g_translate" size={19} color="var(--primary)" />
            Google bilan davom etish
          </button>

          <p style={{ textAlign: "center", color: "var(--text-2)", marginTop: 28, fontSize: 14.5 }}>
            Bu yerda yangimisiz?{" "}
            <Link href="/signup" className="tap-inline" style={{ fontWeight: 700 }}>
              Ro&apos;yxatdan o&apos;ting
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
