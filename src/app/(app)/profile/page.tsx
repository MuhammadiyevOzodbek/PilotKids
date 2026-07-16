import Link from "next/link";
import { Icon } from "@/components/icon";
import { profileMenu } from "@/lib/data";
import { requireUser } from "@/lib/auth/session";
import { getUserStats, initials, formatXp } from "@/lib/queries";

export default async function ProfilePage() {
  const user = await requireUser();
  const stats = await getUserStats(user.id);
  const profileStats = [
    {
      icon: "bolt",
      color: "#2F6BF3",
      soft: "var(--primary-soft)",
      value: formatXp(stats.xp),
      label: "Umumiy XP",
    },
    {
      icon: "local_fire_department",
      color: "#EA6A0E",
      soft: "rgba(234,106,14,.13)",
      value: String(stats.streak),
      label: "Kun",
    },
    {
      icon: "military_tech",
      color: "#0FA46E",
      soft: "var(--success-soft)",
      value: String(stats.badgeCount),
      label: "Nishon",
    },
  ];
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <div
        className="profile-hero"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 26,
          background: "linear-gradient(120deg,#16224a,#0B1220)",
          color: "#EAF0FB",
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(47,107,243,.4),transparent 70%)",
            top: -70,
            right: -30,
            filter: "blur(12px)",
          }}
        />
        <span
          style={{
            position: "relative",
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontFamily: "'Sora'",
            fontWeight: 800,
            fontSize: 34,
            border: "4px solid rgba(255,255,255,.15)",
          }}
        >
          {initials(user.name)}
        </span>
        <div style={{ position: "relative", flex: 1 }}>
          <h1
            style={{
              fontFamily: "'Sora'",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "-.02em",
              margin: "0 0 6px",
            }}
          >
            {user.name}
          </h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                background: "rgba(255,255,255,.1)",
                fontSize: 13,
                fontWeight: 700,
                color: "#c3cee2",
              }}
            >
              {user.age ?? 13} yosh
            </span>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                background: "rgba(47,208,141,.18)",
                fontSize: 13,
                fontWeight: 700,
                color: "#38d39a",
              }}
            >
              {stats.level}-daraja quruvchi
            </span>
          </div>
        </div>
        <Link
          href="/settings"
          style={{
            position: "relative",
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.18)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <Icon name="edit" size={19} />
          Tahrirlash
        </Link>
      </div>
      <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
        {profileStats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 22,
              boxShadow: "var(--shadow-sm)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 12px",
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: s.soft,
              }}
            >
              <Icon name={s.icon} size={24} color={s.color} />
            </div>
            <div
              style={{
                fontFamily: "'Sora'",
                fontWeight: 800,
                fontSize: 26,
                color: "var(--text)",
              }}
            >
              {s.value}
            </div>
            <div style={{ color: "var(--text-2)", fontSize: 13.5, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 12,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {profileMenu.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="hover-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              width: "100%",
              padding: 16,
              borderRadius: 14,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--surface-3)",
                display: "grid",
                placeItems: "center",
                color: "var(--text-2)",
              }}
            >
              <Icon name={m.icon} size={22} color="var(--text-2)" />
            </span>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15.5, color: "var(--text)" }}>
              {m.label}
            </span>
            <span style={{ color: "var(--text-3)", fontSize: 13.5, fontWeight: 600 }}>
              {m.meta}
            </span>
            <Icon name="chevron_right" size={22} color="var(--text-3)" />
          </Link>
        ))}
      </div>
    </div>
  );
}
