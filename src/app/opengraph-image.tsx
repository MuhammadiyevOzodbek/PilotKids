import { ImageResponse } from "next/og";

export const alt = "PilotKids — Robototexnika Akademiyasi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1120",
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(6,182,212,0.2), transparent 45%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 28,
            background: "linear-gradient(135deg, #38bdf8 0%, #06b6d4 50%, #2563eb 100%)",
            fontSize: 60,
            fontWeight: 800,
          }}
        >
          P
        </div>
        <div style={{ fontSize: 56, fontWeight: 800 }}>PilotKids</div>
      </div>
      <div style={{ fontSize: 68, fontWeight: 800, textAlign: "center", maxWidth: 900 }}>
        Kelajak muhandislari shu yerda boshlanadi
      </div>
      <div style={{ fontSize: 32, color: "#94a3b8", marginTop: 24 }}>
        Robototexnika Akademiyasi · 8–18 yosh
      </div>
    </div>,
    { ...size },
  );
}
