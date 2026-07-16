"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { signUp, signIn } from "@/lib/auth/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 15,
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 14,
  color: "var(--text-2)",
  marginBottom: 7,
};

export default function SignupPage() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Davom etish uchun ota-ona roziligini tasdiqlang");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp.email({
        email,
        password,
        name,
        age: age ? Number(age) : undefined,
      });
      if (error) {
        setError(
          error.status === 422 || error.code === "USER_ALREADY_EXISTS"
            ? "Bu email allaqachon ro'yxatdan o'tgan. Kiring."
            : error.message || "Hisob yaratishda xatolik",
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
    if (error) setError("Google bilan ro'yxatdan o'tish hozircha sozlanmagan");
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "radial-gradient(120% 120% at 20% 0%,#16224a,#0B1220)",
          color: "#EAF0FB",
          padding: 48,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(15,164,110,.34),transparent 70%)",
            bottom: -80,
            right: -40,
            filter: "blur(16px)",
            animation: "orbFloat 14s ease-in-out infinite",
          }}
        />
        <Link
          href="/"
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
          <h2
            style={{
              fontFamily: "'Sora'",
              fontWeight: 800,
              fontSize: 34,
              letterSpacing: "-.02em",
              margin: "0 0 16px",
              maxWidth: 400,
            }}
          >
            Minglab yosh quruvchilarga qo&apos;shiling
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
            {[
              "Yosh bo'yicha moslashtirilgan darslar",
              "Ota-ona nazorati va xavfsizlik",
              "Sertifikat bilan tugaydigan yo'llar",
            ].map((text) => (
              <div key={text} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(15,164,110,.2)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon name="check" size={19} color="#38d39a" />
                </span>
                <span style={{ color: "#c3cee2", fontSize: 15 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", color: "#6f82a3", fontSize: 13 }}>© 2026 PilotKids</div>
      </div>
      <div
        style={{
          display: "grid",
          placeItems: "center",
          padding: 40,
          background: "var(--bg)",
          overflow: "auto",
        }}
      >
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 410 }}>
          <ThemeToggle style={{ float: "right", width: 42, height: 42, borderRadius: 12 }} />
          <h1
            style={{
              fontFamily: "'Sora'",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "-.02em",
              margin: "6px 0 8px",
              color: "var(--text)",
            }}
          >
            Hisob yarating
          </h1>
          <p style={{ color: "var(--text-2)", margin: "0 0 26px", fontSize: 15 }}>
            Bepul boshlang — karta talab qilinmaydi
          </p>

          <label style={labelStyle}>To&apos;liq ism</label>
          <input
            className="field"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Amir Karimov"
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          <div
            style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, marginBottom: 16 }}
          >
            <div>
              <label style={labelStyle}>Email</label>
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
            <div>
              <label style={labelStyle}>Yosh</label>
              <input
                className="field"
                type="number"
                min={5}
                max={18}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="13"
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Parol</label>
          <input
            className="field"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ ...inputStyle, marginBottom: 18 }}
          />

          <label
            onClick={() => setConsent(!consent)}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 14,
              borderRadius: 14,
              background: "var(--primary-soft)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              marginBottom: 22,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                border: `2px solid ${consent ? "var(--success)" : "var(--text-3)"}`,
                background: consent ? "var(--success)" : "transparent",
                transition: "all .2s",
              }}
            >
              <Icon name="check" size={16} color="#fff" style={{ opacity: consent ? 1 : 0 }} />
            </span>
            <span style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>
              Men <b style={{ color: "var(--text)" }}>ota-ona roziligi</b> shartlariga roziman va
              bola ma&apos;lumotlari xavfsizligini tushunaman.
            </span>
          </label>

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
              background: "var(--success)",
              color: "#fff",
              fontFamily: "'Sora'",
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 14px 30px -12px rgba(15,164,110,.5)",
              textAlign: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Yaratilmoqda…" : "Hisob yaratish"}
          </button>

          <button
            type="button"
            onClick={handleGoogle}
            style={{
              width: "100%",
              padding: 14,
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
              marginTop: 14,
            }}
          >
            <Icon name="g_translate" size={19} color="var(--primary)" />
            Google bilan ro&apos;yxatdan o&apos;tish
          </button>

          <p style={{ textAlign: "center", color: "var(--text-2)", marginTop: 22, fontSize: 14.5 }}>
            Hisobingiz bormi?{" "}
            <Link href="/login" style={{ fontWeight: 700 }}>
              Kirish
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
