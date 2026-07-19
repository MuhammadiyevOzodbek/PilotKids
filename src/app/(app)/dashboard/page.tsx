import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import {
  getUserStats,
  getUserCourses,
  getAllCourses,
  getCurrentLesson,
  formatXp,
  firstName,
} from "@/lib/queries";

export const metadata = { title: "Boshqaruv paneli — PilotKids" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, courses, current] = await Promise.all([
    getUserStats(user.id),
    getUserCourses(user.id),
    getCurrentLesson(user.id),
  ]);
  const homeStats = [
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
      label: "Ketma-ket kun",
    },
    {
      icon: "military_tech",
      color: "#0FA46E",
      soft: "var(--success-soft)",
      value: String(stats.badgeCount),
      label: "Nishonlar",
    },
  ];
  // Yozilgan kurslar bo'lmasa — barcha kurslarni taklif qilamiz.
  const featured =
    courses.length > 0
      ? courses
      : (await getAllCourses()).map((c) => ({ ...c, progressPercent: 0 }));
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
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
            Xush kelibsiz, {firstName(user.name)} 👋
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 16, margin: 0 }}>
            Bugun nimani quramiz? {stats.level}-darajadasiz — davom eting.
          </p>
        </div>
      </div>

      {/* CONTINUE + STATS */}
      <div
        className="split"
        style={{ "--split": "1.7fr 1fr", gap: 22, marginBottom: 22 } as React.CSSProperties}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            background: "linear-gradient(120deg,#12203f,#0B1220)",
            color: "#EAF0FB",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 220,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(47,107,243,.4),transparent 70%)",
              top: -60,
              right: -40,
              filter: "blur(10px)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px",
                borderRadius: 99,
                background: "rgba(255,255,255,.1)",
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: ".05em",
                color: "#8fb2ff",
              }}
            >
              {current ? "DAVOM ETTIRISH" : "BOSHLASH"}
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 26,
                margin: "16px 0 6px",
              }}
            >
              {current ? current.title : "Birinchi kursingizni tanlang"}
            </h2>
            <p style={{ color: "#AEBBD4", fontSize: 14.5, margin: 0 }}>
              {current
                ? `${current.sortOrder}-dars · ${current.durationMin} daqiqa · ${current.courseTitle}`
                : "Robototexnika, Scratch, micro:bit va Python — qaysi biri qiziq?"}
            </p>
          </div>
          <div style={{ position: "relative", marginTop: 20 }}>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "rgba(255,255,255,.14)",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: `${current?.progressPercent ?? 0}%`,
                  height: "100%",
                  borderRadius: 99,
                  background: "linear-gradient(90deg,#2F6BF3,#5b8cff)",
                  transition: "width .4s ease",
                }}
              />
            </div>
            <Link
              href={current ? `/lesson/${current.id}` : "/courses"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "13px 24px",
                borderRadius: 13,
                border: "none",
                background: "#fff",
                color: "#0B1220",
                fontFamily: "'Sora'",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <Icon name="play_arrow" size={20} />
              {current ? "Davom etish" : "Kurslarni ko'rish"}
            </Link>
          </div>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          {homeStats.map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "20px 22px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: s.soft,
                }}
              >
                <Icon name={s.icon} size={24} color={s.color} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Sora'",
                    fontWeight: 800,
                    fontSize: 24,
                    color: "var(--text)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    marginTop: 3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURED */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "34px 0 18px",
        }}
      >
        <h2
          style={{
            fontFamily: "'Sora'",
            fontWeight: 700,
            fontSize: 22,
            margin: 0,
            color: "var(--text)",
          }}
        >
          Tanlangan kurslar
        </h2>
        <Link
          href="/courses"
          className="tap"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            color: "var(--primary)",
            fontWeight: 700,
            fontSize: 14.5,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Barchasi
          <Icon name="arrow_forward" size={18} />
        </Link>
      </div>
      <div className="grid-4" style={{ gap: 20 }}>
        {featured.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.slug}`}
            className="hover-lift"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
              transition: "transform .25s ease,box-shadow .25s ease",
              textDecoration: "none",
              display: "block",
            }}
          >
            <div
              style={{
                height: 120,
                background: c.soft,
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}
            >
              <Icon name={c.icon} size={52} color={c.color} />
              <span
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  padding: "5px 10px",
                  borderRadius: 99,
                  background: "var(--surface)",
                  color: "var(--text-2)",
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                {c.level}
              </span>
            </div>
            <div style={{ padding: 18 }}>
              <h3
                style={{
                  fontFamily: "'Sora'",
                  fontWeight: 700,
                  fontSize: 16.5,
                  margin: "0 0 6px",
                  color: "var(--text)",
                }}
              >
                {c.title}
              </h3>
              <p
                style={{
                  color: "var(--text-3)",
                  fontSize: 13,
                  margin: "0 0 14px",
                  fontWeight: 600,
                }}
              >
                {c.totalLessons} dars · {c.hours}
              </p>
              <div style={{ height: 6, borderRadius: 99, background: "var(--surface-3)" }}>
                <div
                  style={{
                    width: `${c.progressPercent ?? 0}%`,
                    height: "100%",
                    borderRadius: 99,
                    background: c.color,
                  }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
