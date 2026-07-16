import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getMainCourse, getCourseLessons } from "@/lib/queries";

export default async function CourseDetailsPage() {
  const user = await requireUser();
  const course = await getMainCourse();
  const lessons = course ? await getCourseLessons(user.id, course.id) : [];
  const done = lessons.filter((l) => l.status === "done").length;
  const progress = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <Link
        href="/courses"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          border: "none",
          background: "transparent",
          color: "var(--text-2)",
          fontWeight: 600,
          fontSize: 14.5,
          cursor: "pointer",
          marginBottom: 18,
          textDecoration: "none",
        }}
      >
        <Icon name="arrow_back" size={20} />
        Kurslar
      </Link>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 26 }}>
        <div>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 26,
              background: "linear-gradient(120deg,#12203f,#0B1220)",
              color: "#EAF0FB",
              padding: 38,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "radial-gradient(circle,rgba(99,102,241,.5),transparent 70%)",
                top: -70,
                right: -30,
                filter: "blur(12px)",
              }}
            />
            <div style={{ position: "relative", display: "flex", gap: 10, marginBottom: 18 }}>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 99,
                  background: "rgba(99,102,241,.25)",
                  color: "#c3caff",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: ".05em",
                }}
              >
                ROBOTOTEXNIKA
              </span>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 99,
                  background: "rgba(255,255,255,.1)",
                  color: "#c3cee2",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                BOSHLANG&apos;ICH
              </span>
            </div>
            <h1
              style={{
                position: "relative",
                fontFamily: "'Sora'",
                fontWeight: 800,
                fontSize: 34,
                letterSpacing: "-.02em",
                margin: "0 0 12px",
              }}
            >
              Birinchi robotingizni yig&apos;ing
            </h1>
            <p
              style={{
                position: "relative",
                color: "#AEBBD4",
                fontSize: 15.5,
                lineHeight: 1.6,
                margin: "0 0 24px",
                maxWidth: 520,
              }}
            >
              Robot to&apos;plamini ochishdan tortib to&apos;siqdan qochuvchi botni ishga
              tushirishgacha — bosqichma-bosqich, o&apos;ynab o&apos;rganamiz.
            </p>
            <div style={{ position: "relative", display: "flex", gap: 26 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#c3cee2",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <Icon name="play_lesson" size={19} />6 dars
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#c3cee2",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <Icon name="schedule" size={19} />
                ~1 soat
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#c3cee2",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <Icon name="stars" size={19} />
                +240 XP
              </div>
            </div>
          </div>
          <h2
            style={{
              fontFamily: "'Sora'",
              fontWeight: 700,
              fontSize: 20,
              margin: "30px 0 16px",
              color: "var(--text)",
            }}
          >
            Darslar
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lessons.map((l) => {
              const stateIcon =
                l.status === "done"
                  ? "check_circle"
                  : l.status === "current"
                    ? "play_circle"
                    : "lock";
              const stateColor =
                l.status === "done"
                  ? "var(--success)"
                  : l.status === "current"
                    ? "var(--primary)"
                    : "var(--text-3)";
              return (
                <Link
                  key={l.id}
                  href="/lesson"
                  className="hover-x"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 18px",
                    borderRadius: 16,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                    cursor: "pointer",
                    transition: "transform .2s ease",
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "'Sora'",
                      fontWeight: 700,
                      background: "var(--surface-3)",
                      color: "var(--text-2)",
                    }}
                  >
                    {l.sortOrder}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--text)" }}>
                      {l.title}
                    </div>
                    <div
                      style={{
                        color: "var(--text-3)",
                        fontSize: 13,
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {l.meta}
                    </div>
                  </div>
                  <Icon name={stateIcon} size={24} color={stateColor} />
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <div
            style={{
              position: "sticky",
              top: 96,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 22,
              padding: 24,
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>
                Sizning progress
              </span>
              <span style={{ fontWeight: 800, fontFamily: "'Sora'", color: "var(--primary)" }}>
                {progress}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "var(--surface-3)",
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: 99,
                  background: "var(--primary)",
                }}
              />
            </div>
            <Link
              href="/lesson"
              style={{
                display: "block",
                width: "100%",
                padding: 15,
                borderRadius: 14,
                border: "none",
                background: "var(--primary)",
                color: "#fff",
                fontFamily: "'Sora'",
                fontWeight: 700,
                fontSize: 15.5,
                cursor: "pointer",
                boxShadow: "0 12px 26px -12px var(--ring)",
                marginBottom: 12,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Kursni davom ettirish
            </Link>
            <button
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Icon name="bookmark_add" size={19} />
              Saqlash
            </button>
            <div style={{ height: 1, background: "var(--border)", margin: "22px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: "var(--surface-3)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--text-2)",
                  }}
                >
                  <Icon name="inventory_2" size={20} color="var(--text-2)" />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                    Kerakli to&apos;plam
                  </div>
                  <div style={{ color: "var(--text-3)", fontSize: 12.5, fontWeight: 600 }}>
                    Arduino Starter Kit
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: "var(--surface-3)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--text-2)",
                  }}
                >
                  <Icon name="groups" size={20} color="var(--text-2)" />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                    4 200 o&apos;quvchi
                  </div>
                  <div style={{ color: "var(--text-3)", fontSize: 12.5, fontWeight: 600 }}>
                    bu kursda
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
