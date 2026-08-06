import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Tag } from "@/components/admin/ui";
import { getAdminCourse, getAdminLessons } from "@/lib/admin/queries";
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

      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: 22,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: course.soft,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={course.icon} size={30} color={course.color} />
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(21px,2.6vw,26px)",
              letterSpacing: "-.02em",
              margin: "0 0 8px",
              color: "var(--text)",
            }}
          >
            {course.title}
          </h1>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Tag>{course.level}</Tag>
            <Tag>{course.hours}</Tag>
            <Tag>/{course.slug}</Tag>
          </div>
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
          Saytda ko&apos;rish
        </Link>
      </header>

      <LessonsManager courseId={id} lessons={lessons} />
    </div>
  );
}
