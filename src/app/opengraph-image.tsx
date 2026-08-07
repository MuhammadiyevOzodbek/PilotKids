import { ImageResponse } from "next/og";
import { siteName } from "@/lib/site";

/**
 * Ijtimoiy tarmoq oldindan ko'rish rasmi (Telegram, WhatsApp, Facebook, X).
 *
 * Rasm build/so'rov paytida generatsiya qilinadi — tashqi shrift yoki rasm
 * yuklanmaydi, shu bois hech qachon yiqilmaydi. `twitter-image.tsx` shu
 * fayldan qayta ishlatiladi.
 */
export const alt = `${siteName} — 7–18 yoshli bolalar uchun robototexnika va STEM platformasi`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "linear-gradient(135deg, #16224a 0%, #0B1220 60%)",
        color: "#EAF0FB",
        fontFamily: "sans-serif",
      }}
    >
      {/* Dekorativ yorug'lik dog'i */}
      <div
        style={{
          position: "absolute",
          top: -180,
          right: -120,
          width: 620,
          height: 620,
          borderRadius: 9999,
          background: "radial-gradient(circle, rgba(47,107,243,0.45), rgba(47,107,243,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -220,
          left: -140,
          width: 560,
          height: 560,
          borderRadius: 9999,
          background: "radial-gradient(circle, rgba(15,164,110,0.35), rgba(15,164,110,0) 70%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Ikonka shrifti bo'lmaydi — robotni sodda SVG bilan chizamiz */}
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
            <rect x="30.5" y="10" width="3" height="7" rx="1.5" fill="#fff" />
            <circle cx="32" cy="9.5" r="3.2" fill="#fff" />
            <rect x="9" y="30" width="5" height="11" rx="2.5" fill="#fff" />
            <rect x="50" y="30" width="5" height="11" rx="2.5" fill="#fff" />
            <rect x="15" y="17" width="34" height="30" rx="9" fill="#fff" />
            <circle cx="25" cy="29" r="3.6" fill="#2F6BF3" />
            <circle cx="39" cy="29" r="3.6" fill="#2F6BF3" />
            <rect x="24" y="36.5" width="16" height="5" rx="2.5" fill="#2F6BF3" />
          </svg>
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>{siteName}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "#8fb2ff",
          }}
        >
          QUR · O&apos;RGAN · KASHF ET
        </div>
        <div
          style={{
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            marginTop: 20,
            maxWidth: 940,
          }}
        >
          Kelajak muhandislari shu yerdan boshlaydi
        </div>
        <div style={{ fontSize: 32, color: "#AEBBD4", marginTop: 24 }}>
          7–18 yosh · Robototexnika, kod va STEM · Bepul
        </div>
      </div>

      <div style={{ display: "flex", gap: 44, fontSize: 28, color: "#8496b5" }}>
        <div style={{ display: "flex" }}>120+ interaktiv dars</div>
        <div style={{ display: "flex" }}>14k yosh quruvchi</div>
        <div style={{ display: "flex" }}>4.9 ota-ona bahosi</div>
      </div>
    </div>,
    size,
  );
}
