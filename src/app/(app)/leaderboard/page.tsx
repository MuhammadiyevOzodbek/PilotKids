import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getLeaderboard, getUserBadges } from "@/lib/queries";

export default async function LeaderboardPage() {
  const user = await requireUser();
  const board = await getLeaderboard(user.id);
  const badges = await getUserBadges(user.id);

  const top = board.slice(0, 3);
  const podium = [
    top[1] && {
      ...top[1],
      medal: "#B9C4D6",
      h: 150,
      ring: "#C0CBDD",
      init: top[1].init,
      name: top[1].name,
      xp: top[1].xp,
      rank: top[1].rank,
    },
    top[0] && { ...top[0], medal: "#EAB308", h: 190, ring: "#F1C40F" },
    top[2] && { ...top[2], medal: "#CD7F32", h: 120, ring: "#D08B4A" },
  ].filter(Boolean) as NonNullable<
    (typeof board)[number] & { medal: string; h: number; ring: string }
  >[];

  const ranking = board.slice(3, 8);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
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
        Reyting
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 16, margin: "0 0 30px" }}>
        Bu haftaning eng faol quruvchilari
      </p>

      {/* podium */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 20,
          marginBottom: 34,
        }}
      >
        {podium.map((p) => (
          <div key={p.id} style={{ flex: 1, maxWidth: 220, textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
              <span
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
                  color: "#fff",
                  fontFamily: "'Sora'",
                  fontWeight: 800,
                  fontSize: 22,
                  border: `4px solid ${p.ring}`,
                  boxShadow: "var(--shadow)",
                }}
              >
                {p.init}
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: p.medal,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "'Sora'",
                  fontWeight: 800,
                  fontSize: 13,
                  border: "3px solid var(--bg)",
                }}
              >
                {p.rank}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{p.name}</div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "var(--primary)",
                marginBottom: 12,
              }}
            >
              {p.xp} XP
            </div>
            <div
              style={{
                height: p.h,
                borderRadius: "18px 18px 0 0",
                background: "linear-gradient(180deg,var(--surface),var(--surface-3))",
                border: "1px solid var(--border)",
                borderBottom: "none",
                display: "grid",
                placeItems: "start center",
                paddingTop: 16,
              }}
            >
              <Icon name="emoji_events" size={34} color={p.medal} />
            </div>
          </div>
        ))}
      </div>

      {/* ranking list */}
      <div className="split" style={{ "--split": "1.5fr 1fr", gap: 24 } as React.CSSProperties}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: 12,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {ranking.map((r) => (
            <div
              key={r.id}
              className="hover-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 16px",
                borderRadius: 14,
              }}
            >
              <span
                style={{
                  width: 26,
                  fontWeight: 800,
                  fontFamily: "'Sora'",
                  color: "var(--text-3)",
                  textAlign: "center",
                }}
              >
                {r.rank}
              </span>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "var(--surface-3)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "'Sora'",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--text-2)",
                }}
              >
                {r.init}
              </span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                {r.name}
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-2)" }}>
                {r.xp} XP
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: 24,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <h3
              style={{
                fontFamily: "'Sora'",
                fontWeight: 700,
                fontSize: 17,
                margin: 0,
                color: "var(--text)",
              }}
            >
              Sizning nishonlar
            </h3>
            <span style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 600 }}>
              {badges.filter((b) => b.earned).length}/{badges.length}
            </span>
          </div>
          <div className="grid-4" style={{ gap: 12 }}>
            {badges.map((b) => {
              const earnedOpacity = b.earned ? "1" : ".4";
              return (
                <div key={b.id} style={{ textAlign: "center", opacity: earnedOpacity }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      margin: "0 auto 6px",
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: b.soft,
                    }}
                  >
                    <Icon name={b.icon} size={26} color={b.color} />
                  </div>
                  <div
                    className="micro-label"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "var(--text-3)",
                      lineHeight: 1.2,
                    }}
                  >
                    {b.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
