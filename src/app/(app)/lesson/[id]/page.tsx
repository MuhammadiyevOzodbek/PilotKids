import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import {
  getLessonById,
  getCourseLessons,
  getNextLesson,
  getLessonNote,
  getUserCourses,
} from "@/lib/queries";
import { CompleteButton, LessonNote } from "./lesson-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = await getLessonById(id);
  return { title: lesson ? `${lesson.title} — PilotKids` : "Dars — PilotKids" };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const lesson = await getLessonById(id);
  if (!lesson) notFound();

  // Avtorizatsiya: faqat yozilgan kurs darsini ochish mumkin.
  const myCourses = await getUserCourses(user.id);
  if (!myCourses.some((c) => c.id === lesson.courseId)) {
    redirect(`/courses/${lesson.courseSlug}`);
  }

  const [lessons, next, note] = await Promise.all([
    getCourseLessons(user.id, lesson.courseId),
    getNextLesson(lesson.courseId, lesson.sortOrder),
    getLessonNote(user.id, lesson.id),
  ]);

  const status = lessons.find((l) => l.id === lesson.id)?.status ?? "locked";
  const isDone = status === "done";
  const doneCount = lessons.filter((l) => l.status === "done").length;
  const coursePercent = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <Link
        href={`/courses/${lesson.courseSlug}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          color: "var(--text-2)",
          fontWeight: 600,
          fontSize: "14.5px",
          marginBottom: 18,
          textDecoration: "none",
        }}
      >
        <Icon name="arrow_back" size={20} />
        {lesson.courseTitle}
      </Link>

      <div className="split" style={{ "--split": "1.7fr 1fr", gap: 26 } as React.CSSProperties}>
        <div>
          {/* Video maydoni */}
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
            {lesson.videoUrl ? (
              <video
                controls
                preload="metadata"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              >
                <source src={lesson.videoUrl} />
                Brauzeringiz video formatini qo&apos;llab-quvvatlamaydi.
              </video>
            ) : (
              <div style={{ textAlign: "center", padding: 24, position: "relative" }}>
                <span
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.1)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 14px",
                  }}
                >
                  <Icon name="movie" size={34} color="#AEBBD4" />
                </span>
                <p style={{ color: "#AEBBD4", fontSize: 14.5, fontWeight: 600, margin: 0 }}>
                  Video tayyorlanmoqda — quyidagi matnli darsdan foydalaning
                </p>
              </div>
            )}
          </div>

          {/* Sarlavha va meta */}
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
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "-.02em",
                margin: 0,
                color: "var(--text)",
                flex: 1,
                minWidth: 200,
              }}
            >
              {lesson.title}
            </h1>
            <Pill icon="bolt" color="var(--primary)" bg="var(--primary-soft)">
              +{lesson.xpReward} XP
            </Pill>
            <Pill icon="schedule" color="var(--text-2)" bg="var(--surface-3)">
              {lesson.durationMin} daqiqa
            </Pill>
            {isDone && (
              <Pill icon="check_circle" color="var(--success)" bg="var(--success-soft)">
                Bajarildi
              </Pill>
            )}
          </div>

          {/* Dars matni — DB'dan */}
          {lesson.content ? (
            lesson.content.split("\n\n").map((para, i) => (
              <p
                key={i}
                style={{
                  color: "var(--text-2)",
                  fontSize: "15.5px",
                  lineHeight: 1.75,
                  margin: "14px 0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {para}
              </p>
            ))
          ) : (
            <p style={{ color: "var(--text-3)", fontSize: 15, margin: "14px 0 24px" }}>
              Bu dars uchun matn hali qo&apos;shilmagan.
            </p>
          )}

          <div style={{ marginTop: 24 }}>
            <CompleteButton
              lessonId={lesson.id}
              isDone={isDone}
              xpReward={lesson.xpReward}
              nextLessonId={next?.id ?? null}
            />
          </div>
        </div>

        {/* Yon panel */}
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
            {/* Kurs progressi */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}>
                Kurs progressi
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                  color: "var(--primary)",
                  fontSize: 14.5,
                }}
              >
                {coursePercent}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "var(--surface-3)",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: `${coursePercent}%`,
                  height: "100%",
                  borderRadius: 99,
                  background: "var(--primary)",
                  transition: "width .4s ease",
                }}
              />
            </div>

            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                margin: "0 0 14px",
                color: "var(--text)",
              }}
            >
              Keyingisi
            </h3>

            {next ? (
              <Link
                href={`/lesson/${next.id}`}
                className="hover-row3"
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 15,
                  background: "var(--surface-2)",
                  marginBottom: 12,
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 12,
                    background: "var(--primary-soft)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon
                    name={
                      next.type === "quiz"
                        ? "quiz"
                        : next.type === "lab"
                          ? "science"
                          : "play_lesson"
                    }
                    size={23}
                    color="var(--primary)"
                  />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--text)" }}>
                    {next.title}
                  </div>
                  <div style={{ color: "var(--text-3)", fontSize: "12.5px", fontWeight: 600 }}>
                    {next.sortOrder}-dars · {next.durationMin} daq
                  </div>
                </div>
              </Link>
            ) : (
              <p
                style={{
                  color: "var(--text-3)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  margin: "0 0 12px",
                }}
              >
                Bu kursning oxirgi darsi 🎉
              </p>
            )}

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
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 12,
                  background: "rgba(139,92,246,.12)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="quiz" size={23} color="#8B5CF6" />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--text)" }}>
                  Bilimingizni sinang
                </div>
                <div style={{ color: "var(--text-3)", fontSize: "12.5px", fontWeight: 600 }}>
                  Har to&apos;g&apos;ri javob · +10 XP
                </div>
              </div>
            </Link>

            <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                margin: "0 0 12px",
                color: "var(--text)",
              }}
            >
              Eslatmalaringiz
            </h3>
            <LessonNote lessonId={lesson.id} initial={note} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({
  icon,
  color,
  bg,
  children,
}: {
  icon: string;
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 13px",
        borderRadius: 99,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      <Icon name={icon} size={17} color={color} />
      {children}
    </span>
  );
}
