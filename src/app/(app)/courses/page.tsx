import Link from "next/link";
import { Icon } from "@/components/icon";
import { getCategories, getFeaturedCourses } from "@/lib/queries";

export default async function CoursesPage() {
  const categories = await getCategories();
  const featured = await getFeaturedCourses();
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
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
        Kashf eting
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 16, margin: "0 0 26px" }}>
        Qiziqishingizga mos yo&apos;nalishni tanlang
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 18,
          marginBottom: 40,
        }}
      >
        {categories.map((c) => (
          <Link
            key={c.id}
            href="/courses/details"
            className="hover-lift"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
              transition: "transform .25s ease,box-shadow .25s ease",
              textDecoration: "none",
              display: "block",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: c.soft,
                marginBottom: 16,
              }}
            >
              <Icon name={c.icon} size={30} color={c.color} />
            </div>
            <h3
              style={{
                fontFamily: "'Sora'",
                fontWeight: 700,
                fontSize: 17,
                margin: "0 0 4px",
                color: "var(--text)",
              }}
            >
              {c.title}
            </h3>
            <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: 0, fontWeight: 600 }}>
              {c.courseCount}
            </p>
          </Link>
        ))}
      </div>
      <h2
        style={{
          fontFamily: "'Sora'",
          fontWeight: 700,
          fontSize: 22,
          margin: "0 0 18px",
          color: "var(--text)",
        }}
      >
        Mashhur kurslar
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
        {featured.map((c) => (
          <Link
            key={c.id}
            href="/courses/details"
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
              <p style={{ color: "var(--text-3)", fontSize: 13, margin: 0, fontWeight: 600 }}>
                {c.totalLessons} dars · {c.hours}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
