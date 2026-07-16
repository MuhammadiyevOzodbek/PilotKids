import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getMainCourse, getCourseLessons } from "@/lib/queries";

export default async function LessonPage() {
  const user = await requireUser();
  const course = await getMainCourse();
  const lessons = course ? await getCourseLessons(user.id, course.id) : [];
  const current = lessons.find((l) => l.status === "current") ?? lessons[1] ?? lessons[0];
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <Link
        href="/courses/details"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          border: "none",
          background: "transparent",
          color: "var(--text-2)",
          fontWeight: 600,
          fontSize: "14.5px",
          cursor: "pointer",
          marginBottom: 18,
          textDecoration: "none",
        }}
      >
        <Icon name="arrow_back" size={20} />
        {course?.title ?? "Robototexnika 101"}
      </Link>
      <div className="split" style={{ "--split": "1.7fr 1fr", gap: 26 } as React.CSSProperties}>
        <div>
          <div
            style={{
              position: "relative",
              borderRadius: 22,
              overflow: "hidden",
              aspectRatio: "16/9",
              background: "linear-gradient(135deg,#16224a,#0B1220)",
              display: "grid",
              placeItems: "center",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(45deg,rgba(255,255,255,.02) 0 12px,transparent 12px 24px)",
              }}
            />
            <button
              style={{
                position: "relative",
                width: 78,
                height: 78,
                borderRadius: "50%",
                border: "none",
                background: "#fff",
                color: "#0B1220",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 14px 34px -10px rgba(0,0,0,.5)",
              }}
            >
              <Icon name="play_arrow" size={40} />
            </button>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "linear-gradient(transparent,rgba(0,0,0,.55))",
              }}
            >
              <Icon name="play_arrow" size={22} color="#fff" />
              <div
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 99,
                  background: "rgba(255,255,255,.25)",
                }}
              >
                <div
                  style={{
                    width: "34%",
                    height: "100%",
                    borderRadius: 99,
                    background: "var(--primary)",
                  }}
                />
              </div>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>2:44 / 8:00</span>
              <Icon name="fullscreen" size={22} color="#fff" />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "22px 0 8px",
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                fontFamily: "'Sora'",
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "-.02em",
                margin: 0,
                color: "var(--text)",
                flex: 1,
                minWidth: 200,
              }}
            >
              {current?.title ?? "Motorlarni ulash"}
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 99,
                background: "var(--primary-soft)",
                color: "var(--primary)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Icon name="bolt" size={17} />
              +40 XP
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 99,
                background: "var(--surface-3)",
                color: "var(--text-2)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Icon name="sticky_note_2" size={17} />8 eslatma
            </span>
          </div>
          <p
            style={{
              color: "var(--text-2)",
              fontSize: "15.5px",
              lineHeight: 1.7,
              margin: "14px 0 24px",
            }}
          >
            Bu darsda DC motorni Arduino platasiga to&apos;g&apos;ri ulashni o&apos;rganamiz. Motor
            haydovchisi (motor driver) nima uchun kerakligini ko&apos;ramiz va birinchi aylantirish
            kodini yozamiz. Simlarni ranglar bo&apos;yicha ulashga e&apos;tibor bering — bu keyingi
            darslar uchun muhim.
          </p>
          <Link
            href="/quiz"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "15px 26px",
              borderRadius: 14,
              border: "none",
              background: "var(--success)",
              color: "#fff",
              fontFamily: "'Sora'",
              fontWeight: 700,
              fontSize: "15.5px",
              cursor: "pointer",
              boxShadow: "0 12px 28px -12px rgba(15,164,110,.6)",
              textDecoration: "none",
            }}
          >
            <Icon name="check_circle" size={21} />
            Bajarildi deb belgilash
          </Link>
        </div>
        <div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 22,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h3
              style={{
                fontFamily: "'Sora'",
                fontWeight: 700,
                fontSize: 16,
                margin: "0 0 16px",
                color: "var(--text)",
              }}
            >
              Keyingisi
            </h3>
            <Link
              href="/quiz"
              className="hover-row3"
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: 14,
                borderRadius: 15,
                background: "var(--surface-2)",
                cursor: "pointer",
                marginBottom: 12,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--primary-soft)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="quiz" size={23} color="var(--primary)" />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--text)" }}>
                  Tezkor test
                </div>
                <div style={{ color: "var(--text-3)", fontSize: "12.5px", fontWeight: 600 }}>
                  3 savol · +30 XP
                </div>
              </div>
            </Link>
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: 14,
                borderRadius: 15,
                background: "var(--surface-2)",
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(139,92,246,.12)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="sensors" size={23} color="#8B5CF6" />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--text)" }}>
                  Sensorlarni sozlash
                </div>
                <div style={{ color: "var(--text-3)", fontSize: "12.5px", fontWeight: 600 }}>
                  3-dars · 10 daq
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
            <h3
              style={{
                fontFamily: "'Sora'",
                fontWeight: 700,
                fontSize: 16,
                margin: "0 0 12px",
                color: "var(--text)",
              }}
            >
              Eslatmalaringiz
            </h3>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "var(--surface-2)",
                color: "var(--text-2)",
                fontSize: "13.5px",
                lineHeight: 1.6,
                borderLeft: "3px solid var(--primary)",
              }}
            >
              Qora sim — GND, qizil sim — motor +. Driver IN1/IN2 yo&apos;nalishni belgilaydi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
