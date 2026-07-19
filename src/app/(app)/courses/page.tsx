import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getCategories, getAllCourses, getUserCourses } from "@/lib/queries";

export const metadata = { title: "Kurslar — PilotKids" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoriya?: string }>;
}) {
  const user = await requireUser();
  const { kategoriya } = await searchParams;

  const [categories, allCourses, myCourses] = await Promise.all([
    getCategories(),
    getAllCourses(),
    getUserCourses(user.id),
  ]);

  const enrolledIds = new Set(myCourses.map((c) => c.id));
  const active = categories.find((c) => c.slug === kategoriya) ?? null;
  const courses = active ? allCourses.filter((c) => c.categorySlug === active.slug) : allCourses;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
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

      {/* Kategoriyalar — bosilganda filtrlaydi */}
      <div className="grid-4" style={{ gap: 18, marginBottom: 40 }}>
        {categories.map((c) => {
          const isActive = active?.slug === c.slug;
          return (
            <Link
              key={c.id}
              href={isActive ? "/courses" : `/courses?kategoriya=${c.slug}`}
              className="hover-lift"
              aria-pressed={isActive}
              style={{
                background: "var(--surface)",
                border: `1px solid ${isActive ? c.color : "var(--border)"}`,
                borderRadius: 20,
                padding: 24,
                boxShadow: isActive ? `0 10px 26px -14px ${c.color}` : "var(--shadow-sm)",
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
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 17,
                  margin: "0 0 4px",
                  color: "var(--text)",
                }}
              >
                {c.title}
              </h3>
              <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: 0, fontWeight: 600 }}>
                {isActive ? "Filtr yoqilgan · bekor qilish" : c.courseCount}
              </p>
            </Link>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          margin: "0 0 18px",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 22,
            margin: 0,
            color: "var(--text)",
          }}
        >
          {active ? active.title : "Barcha kurslar"}
        </h2>
        {active && (
          <Link
            href="/courses"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            <Icon name="close" size={17} color="var(--primary)" />
            Filtrni tozalash
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <p
          style={{
            color: "var(--text-2)",
            fontSize: 15,
            padding: "32px 20px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            textAlign: "center",
          }}
        >
          Bu yo&apos;nalishda hozircha kurs yo&apos;q. Boshqa kategoriyani tanlab ko&apos;ring.
        </p>
      ) : (
        <div className="grid-4" style={{ gap: 20 }}>
          {courses.map((c) => {
            const enrolled = enrolledIds.has(c.id);
            const progress = myCourses.find((m) => m.id === c.id)?.progressPercent ?? 0;
            return (
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
                  {enrolled && (
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        padding: "5px 10px",
                        borderRadius: 99,
                        background: "var(--success)",
                        color: "#fff",
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      Yozilgan
                    </span>
                  )}
                </div>
                <div style={{ padding: 18 }}>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
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
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    {c.totalLessons} dars · {c.hours}
                  </p>
                  {enrolled && (
                    <div
                      style={{
                        height: 6,
                        borderRadius: 99,
                        background: "var(--surface-3)",
                        marginTop: 12,
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
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
