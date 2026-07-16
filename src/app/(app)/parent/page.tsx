import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getUserStats, getWeekActivity, firstName } from "@/lib/queries";

export default async function ParentPage() {
  const user = await requireUser();
  const stats = await getUserStats(user.id);
  const week = await getWeekActivity(user.id);
  const totalMin = week.reduce((s, w) => s + w.minutes, 0);
  const parentStats = [
    {
      icon: "menu_book",
      color: "#6366F1",
      soft: "rgba(99,102,241,.12)",
      value: String(stats.enrolledCount),
      label: "Faol kurs",
    },
    {
      icon: "local_fire_department",
      color: "#EA6A0E",
      soft: "rgba(234,106,14,.13)",
      value: String(stats.streak),
      label: "Kunlik streak",
    },
    {
      icon: "schedule",
      color: "#0EA5E9",
      soft: "rgba(14,165,233,.12)",
      value: (totalMin / 60).toFixed(1) + "s",
      label: "Bu hafta",
    },
    {
      icon: "task_alt",
      color: "#0FA46E",
      soft: "var(--success-soft)",
      value: String(stats.doneLessons),
      label: "Tugatilgan dars",
    },
  ];
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderRadius: 99,
          background: "var(--success-soft)",
          color: "var(--success)",
          fontWeight: 700,
          fontSize: 12.5,
          letterSpacing: ".06em",
          marginBottom: 14,
        }}
      >
        <Icon name="shield_person" size={18} />
        OTA-ONA REJIMI
      </div>
      <h1
        style={{
          fontFamily: "'Sora'",
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: "-.02em",
          margin: "0 0 6px",
          color: "var(--text)",
        }}
      >
        {firstName(user.name)} progressi
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 16, margin: "0 0 28px" }}>
        Farzandingiz o&apos;quv faoliyatini kuzating
      </p>
      <div className="grid-4" style={{ gap: 16, marginBottom: 24 }}>
        {parentStats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 22,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: s.soft,
                marginBottom: 12,
              }}
            >
              <Icon name={s.icon} size={23} color={s.color} />
            </div>
            <div
              style={{
                fontFamily: "'Sora'",
                fontWeight: 800,
                fontSize: 24,
                color: "var(--text)",
              }}
            >
              {s.value}
            </div>
            <div style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="split" style={{ "--split": "1.5fr 1fr", gap: 24 } as React.CSSProperties}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: 26,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3
            style={{
              fontFamily: "'Sora'",
              fontWeight: 700,
              fontSize: 18,
              margin: "0 0 24px",
              color: "var(--text)",
            }}
          >
            Haftalik faollik
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 12,
              height: 180,
            }}
          >
            {week.map((w) => (
              <div
                key={w.d}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 34,
                    height: `${w.h}%`,
                    borderRadius: 10,
                    background: "linear-gradient(180deg,var(--primary),#5b8cff)",
                    minHeight: 8,
                  }}
                />
                <span style={{ color: "var(--text-3)", fontSize: 12.5, fontWeight: 700 }}>
                  {w.d}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 22,
              padding: 24,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h3
              style={{
                fontFamily: "'Sora'",
                fontWeight: 700,
                fontSize: 16,
                margin: "0 0 14px",
                color: "var(--text)",
              }}
            >
              So&apos;nggi yutuq
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  background: "rgba(139,92,246,.12)",
                  display: "grid",
                  placeItems: "center",
                  color: "#8B5CF6",
                }}
              >
                <Icon name="psychology" size={28} color="#8B5CF6" />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                  Quiz Master
                </div>
                <div style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 600 }}>
                  2 kun oldin
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg,#12203f,#0B1220)",
              borderRadius: 22,
              padding: 24,
              color: "#EAF0FB",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Icon name="timer" size={22} color="#38d39a" />
              <h3 style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 16, margin: 0 }}>
                Ekran vaqti
              </h3>
            </div>
            <p style={{ color: "#AEBBD4", fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
              Kunlik chegara: 1 soat 30 daqiqa
            </p>
            <button
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: "rgba(255,255,255,.1)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Chegarani sozlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
