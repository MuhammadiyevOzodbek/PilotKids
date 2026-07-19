import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import {
  getCourseBySlug,
  getCourseLessons,
  getUserCourses,
  getCourseStudentCount,
} from "@/lib/queries";
import { EnrollButton } from "./enroll-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return {
    title: course ? `${course.title} — PilotKids` : "Kurs topilmadi — PilotKids",
    description: course?.description ?? undefined,
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();

  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const [lessons, myCourses, students] = await Promise.all([
    getCourseLessons(user.id, course.id),
    getUserCourses(user.id),
    getCourseStudentCount(course.id),
  ]);

  const enrollment = myCourses.find((c) => c.id === course.id);
  const enrolled = Boolean(enrollment);
  const done = lessons.filter((l) => l.status === "done").length;
  const progress = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const totalXp = lessons.length * 40;
  // Davom ettirish — birinchi tugallanmagan dars.
  const nextLesson = lessons.find((l) => l.status !== "done") ?? null;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <Link
        href="/courses"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          color: "var(--text-2)",
          fontWeight: 600,
          fontSize: 14.5,
          marginBottom: 18,
          textDecoration: "none",
        }}
      >
        <Icon name="arrow_back" size={20} />
        Kurslar
      </Link>

      <div className="split" style={{ "--split": "1.6fr 1fr", gap: 26 } as React.CSSProperties}>
        <div>
          {/* Hero — barcha ma'lumot DB'dan */}
          <div
            className="detail-hero"
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 26,
              background: "linear-gradient(120deg,#12203f,#0B1220)",
              color: "#EAF0FB",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: `radial-gradient(circle,${course.color}80,transparent 70%)`,
                top: -70,
                right: -30,
                filter: "blur(12px)",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {course.categoryTitle && (
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
                  {course.categoryTitle.toUpperCase()}
                </span>
              )}
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
                {course.level}
              </span>
            </div>
            <h1
              style={{
                position: "relative",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 34,
                letterSpacing: "-.02em",
                margin: "0 0 12px",
              }}
            >
              {course.title}
            </h1>
            {course.description && (
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
                {course.description}
              </p>
            )}
            <div style={{ position: "relative", display: "flex", gap: 26, flexWrap: "wrap" }}>
              {[
                { icon: "play_lesson", label: `${lessons.length} dars` },
                { icon: "schedule", label: course.hours },
                { icon: "stars", label: `+${totalXp} XP` },
              ].map((s) => (
                <div
                  key={s.icon}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#c3cee2",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <Icon name={s.icon} size={19} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 20,
              margin: "30px 0 16px",
              color: "var(--text)",
            }}
          >
            Darslar
          </h2>

          {lessons.length === 0 ? (
            <p
              style={{
                color: "var(--text-2)",
                fontSize: 15,
                padding: "28px 20px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                textAlign: "center",
              }}
            >
              Bu kurs darslari tayyorlanmoqda. Tez orada qo&apos;shiladi!
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {lessons.map((l) => {
                const locked = !enrolled || l.status === "locked";
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

                const inner = (
                  <>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--font-display)",
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
                  </>
                );

                const boxStyle: React.CSSProperties = {
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 18px",
                  borderRadius: 16,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform .2s ease",
                  textDecoration: "none",
                  opacity: locked ? 0.62 : 1,
                };

                return locked ? (
                  <div key={l.id} style={{ ...boxStyle, cursor: "not-allowed" }} aria-disabled>
                    {inner}
                  </div>
                ) : (
                  <Link key={l.id} href={`/lesson/${l.id}`} className="hover-x" style={boxStyle}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Yon panel */}
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
            {enrolled && (
              <>
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
                  <span
                    style={{
                      fontWeight: 800,
                      fontFamily: "var(--font-display)",
                      color: "var(--primary)",
                    }}
                  >
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
                      transition: "width .4s ease",
                    }}
                  />
                </div>
              </>
            )}

            <EnrollButton
              courseId={course.id}
              enrolled={enrolled}
              continueHref={nextLesson ? `/lesson/${nextLesson.id}` : null}
            />

            <div style={{ height: 1, background: "var(--border)", margin: "22px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SideStat icon="school" title={`${done} / ${lessons.length} dars`} sub="tugallandi" />
              <SideStat
                icon="groups"
                title={`${students.toLocaleString("ru-RU").replace(/,/g, " ")} o'quvchi`}
                sub="bu kursda"
              />
              <SideStat icon="signal_cellular_alt" title={course.level} sub="daraja" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideStat({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 11,
          background: "var(--surface-3)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name={icon} size={20} color="var(--text-2)" />
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{title}</div>
        <div style={{ color: "var(--text-3)", fontSize: 12.5, fontWeight: 600 }}>{sub}</div>
      </div>
    </div>
  );
}
