import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";

/**
 * Login / signup / welcome sahifalarining umumiy qobig'i:
 * chapda navy panel (mobilda ixcham banner), o'ngda forma.
 */
export function AuthShell({
  aside,
  children,
  orbColor = "rgba(47,107,243,.4)",
}: {
  aside: ReactNode;
  children: ReactNode;
  orbColor?: string;
}) {
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
            background: `radial-gradient(circle,${orbColor},transparent 70%)`,
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
          <span className="font-display" style={{ fontWeight: 800, fontSize: 20 }}>
            PilotKids
          </span>
        </Link>

        {aside}

        <div
          className="auth-aside-hide"
          style={{ position: "relative", color: "#8496b5", fontSize: 14 }}
        >
          © {new Date().getFullYear()} PilotKids · Bolalar uchun xavfsiz ta&apos;lim
        </div>
      </div>

      {/* Forma sahifaning asosiy qismi — `<main>` bo'lsin, shunda skrinrider
          "asosiy kontent"ga to'g'ridan-to'g'ri o'tishi mumkin. */}
      <main
        id="content"
        className="auth-main"
        style={{ display: "grid", placeItems: "center", background: "var(--bg)" }}
      >
        {children}
      </main>
    </div>
  );
}
