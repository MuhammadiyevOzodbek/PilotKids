import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Tag } from "@/components/admin/ui";
import { getAdminCourse, getAdminLessons } from "@/lib/admin/queries";
import { formatDuration, parseVideoUrl } from "@/lib/video";
import { LessonsManager } from "./lessons-manager";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getAdminCourse(id);
  return { title: course ? `${course.title} — darslar` : "Kurs topilmadi" };
}

export default async function AdminCourseLessonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getAdminCourse(id);
  if (!course) notFound();

  const lessons = await getAdminLessons(id);

  // E'lon sarlavhasidagi ko'rsatkichlar — darslar ro'yxatidan hisoblanadi,
  // alohida so'rov qilmasdan.
  const totalMinutes = lessons.reduce((s, l) => s + l.durationMin, 0);
  const totalXp = lessons.reduce((s, l) => s + l.xpReward, 0);
  const withVideo = lessons.filter((l) => parseVideoUrl(l.videoUrl)).length;
  const missingVideo = lessons.filter((l) => l.type === "video" && !parseVideoUrl(l.videoUrl));

  const stats = [
    { icon: "play_circle", label: "Darslar", value: String(lessons.length) },
    { icon: "schedule", label: "Davomiyligi", value: formatDuration(totalMinutes) },
    { icon: "bolt", label: "Jami XP", value: String(totalXp) },
    { icon: "videocam", label: "Videoli dars", value: `${withVideo}/${lessons.length}` },
  ];

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <Link
        href="/admin/courses"
        className="tap"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-2)",
          fontWeight: 700,
          fontSize: 14.5,
          marginBottom: 16,
        }}
      >
        <Icon name="arrow_back" size={19} />
        Kurslarga qaytish
      </Link>

      {/* ───────────── E'lon ───────────── */}
      <article
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
          marginBottom: 20,
        }}
      >
        {/* Muqova — kurs rangidan yasalgan banner */}
        <div
          style={{
            position: "relative",
            padding: "34px 28px",
            background: `linear-gradient(135deg, ${course.soft}, var(--surface-2))`,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {course.featured && (
            <span style={{ position: "absolute", top: 18, right: 20 }}>
              <Tag color="var(--fun-amber)" bg="var(--fun-amber-soft)">
                <Icon name="star" size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Tanlangan kurs
              </Tag>
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <span
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                background: "var(--surface)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Icon name={course.icon} size={38} color={course.color} />
            </span>

            <div style={{ flex: 1, minWidth: 220 }}>
              <h1
                className="font-display"
                style={{
                  fontWeight: 800,
                  fontSize: "clamp(23px,3vw,31px)",
                  letterSpacing: "-.025em",
                  margin: 0,
                  color: "var(--text)",
                }}
              >
                {course.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Tavsif + ko'rsatkichlar */}
        <div style={{ padding: "22px 28px" }}>
          {course.description ? (
            <p
              style={{
                color: "var(--text-2)",
                fontSize: 15.5,
                lineHeight: 1.65,
                margin: "0 0 20px",
                maxWidth: 760,
              }}
            >
              {course.description}
            </p>
          ) : (
            <p
              style={{
                color: "var(--text-3)",
                fontSize: 14.5,
                fontStyle: "italic",
                margin: "0 0 20px",
              }}
            >
              Tavsif yozilmagan — o&apos;quvchi kursni tanlashda shu matnni o&apos;qiydi.
            </p>
          )}

          <div className="grid-4" style={{ gap: 12, marginBottom: 20 }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "13px 15px",
                  borderRadius: 14,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon name={s.icon} size={20} color="var(--text-3)" />
                <div style={{ minWidth: 0 }}>
                  <div
                    className="font-display"
                    style={{ fontWeight: 800, fontSize: 17, color: "var(--text)", lineHeight: 1.2 }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-3)", fontWeight: 600 }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href={`/courses/${course.slug}`}
            className="tap"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "11px 18px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-2)",
              fontWeight: 700,
              fontSize: 14.5,
            }}
          >
            <Icon name="visibility" size={19} />
            O&apos;quvchi ko&apos;zi bilan ko&apos;rish
          </Link>
        </div>
      </article>

      {/* Video yetishmayotgan darslar bo'lsa — ogohlantirish */}
      {missingVideo.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            flexWrap: "wrap",
            padding: "13px 16px",
            marginBottom: 18,
            borderRadius: 14,
            background: "var(--fun-amber-soft)",
            border: "1px solid var(--fun-amber)",
          }}
        >
          <Icon name="videocam_off" size={20} color="var(--fun-amber)" />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-2)", flex: 1 }}>
            {missingVideo.length} ta video darsda hali video havolasi yo&apos;q — o&apos;quvchi
            faqat matnni ko&apos;radi.
          </span>
        </div>
      )}

      <LessonsManager
        courseId={id}
        lessons={lessons}
        courseColor={course.color}
        courseSoft={course.soft}
      />
    </div>
  );
}
