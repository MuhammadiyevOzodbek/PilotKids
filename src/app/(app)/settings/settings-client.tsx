"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { useTheme } from "@/lib/theme";
import { signOut } from "@/lib/auth/client";
import { setNotificationsEnabled } from "@/lib/actions/settings";

export function SettingsClient({ initialNotif }: { initialNotif: boolean }) {
  const [notif, setNotif] = useState(initialNotif);
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const router = useRouter();

  function toggleNotif() {
    const next = !notif;
    setNotif(next);
    void setNotificationsEnabled(next); // DB'ga saqlaymiz (optimistik)
  }

  async function handleLogout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <h1
        style={{
          fontFamily: "'Sora'",
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: "-.02em",
          margin: "0 0 26px",
          color: "var(--text)",
        }}
      >
        Sozlamalar
      </h1>
      <div
        style={{
          fontWeight: 700,
          color: "var(--text-3)",
          fontSize: 12.5,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Afzalliklar
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
          marginBottom: 26,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--surface-3)",
              display: "grid",
              placeItems: "center",
              color: "var(--text-2)",
            }}
          >
            <Icon name="language" size={22} color="var(--text-2)" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Til</div>
            <div style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 600 }}>
              Interfeys tili
            </div>
          </div>
          <span
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "var(--surface-3)",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            O&apos;zbekcha
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--surface-3)",
              display: "grid",
              placeItems: "center",
              color: "var(--text-2)",
            }}
          >
            <Icon name="notifications" size={22} color="var(--text-2)" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
              Bildirishnomalar
            </div>
            <div style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 600 }}>
              Dars va yutuq eslatmalari
            </div>
          </div>
          <button
            onClick={toggleNotif}
            style={{
              width: 52,
              height: 30,
              borderRadius: 99,
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background .2s",
              background: notif ? "var(--success)" : "var(--surface-3)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: notif ? 25 : 3,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#fff",
                transition: "left .2s",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
              }}
            />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px" }}>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--surface-3)",
              display: "grid",
              placeItems: "center",
              color: "var(--text-2)",
            }}
          >
            <Icon name="dark_mode" size={22} color="var(--text-2)" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Tungi rejim</div>
            <div style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 600 }}>
              Qorong&apos;u mavzu
            </div>
          </div>
          <button
            onClick={() => toggle()}
            style={{
              width: 52,
              height: 30,
              borderRadius: 99,
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background .2s",
              background: theme === "dark" ? "var(--primary)" : "var(--surface-3)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: theme === "dark" ? 25 : 3,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#fff",
                transition: "left .2s",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
              }}
            />
          </button>
        </div>
      </div>
      <div
        style={{
          fontWeight: 700,
          color: "var(--text-3)",
          fontSize: 12.5,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Hisob
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
          marginBottom: 26,
        }}
      >
        <button
          className="hover-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            width: "100%",
            padding: "18px 22px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            borderBottom: "1px solid var(--border)",
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--surface-3)",
              display: "grid",
              placeItems: "center",
              color: "var(--text-2)",
            }}
          >
            <Icon name="manage_accounts" size={22} color="var(--text-2)" />
          </span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
            Profilni tahrirlash
          </span>
          <Icon name="chevron_right" size={22} color="var(--text-3)" />
        </button>
        <button
          className="hover-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            width: "100%",
            padding: "18px 22px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--surface-3)",
              display: "grid",
              placeItems: "center",
              color: "var(--text-2)",
            }}
          >
            <Icon name="verified_user" size={22} color="var(--text-2)" />
          </span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
            Maxfiylik va xavfsizlik
          </span>
          <Icon name="chevron_right" size={22} color="var(--text-3)" />
        </button>
      </div>
      <button
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(229,72,77,.3)",
          background: "rgba(229,72,77,.08)",
          color: "#E5484D",
          fontFamily: "'Sora'",
          fontWeight: 700,
          fontSize: 15.5,
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        <Icon name="logout" size={21} color="#E5484D" />
        Chiqish
      </button>
    </div>
  );
}
