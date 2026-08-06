import Link from "next/link";
import { Icon } from "@/components/icon";
import { Card } from "@/components/admin/ui";
import {
  getAdminStats,
  getSignupTrend,
  getTopCourses,
  getCertificateCount,
} from "@/lib/admin/queries";
import { formatXp } from "@/lib/queries";
import { SignupChart } from "./signup-chart";

// Layout'dagi `title.template` o'z segmentidagi sahifaga qo'llanmaydi —
// shuning uchun "Admin" qismini shu yerda o'zimiz yozamiz.
export const metadata = { title: "Umumiy ko'rsatkichlar · Admin" };

export default async function AdminHomePage() {
  const [stats, trend, topCourses, certificates] = await Promise.all([
    getAdminStats(),
    getSignupTrend(),
    getTopCourses(5),
    getCertificateCount(),
  ]);

  const tiles = [
    {
      icon: "group",
      label: "Foydalanuvchilar",
      value: String(stats.users),
      note:
        stats.newUsersThisWeek > 0
          ? `+${stats.newUsersThisWeek} shu hafta`
          : "Shu hafta yangi yo'q",
      color: "var(--primary)",
      soft: "var(--primary-soft)",
      href: "/admin/users",
    },
    {
      icon: "school",
      label: "Kurslar",
      value: String(stats.courses),
      note: `${stats.lessons} ta dars`,
      color: "var(--fun-violet)",
      soft: "var(--fun-violet-soft)",
      href: "/admin/courses",
    },
    {
      icon: "quiz",
      label: "Test savollari",
      value: String(stats.questions),
      note: "Barcha kurslar bo'yicha",
      color: "var(--fun-amber)",
      soft: "var(--fun-amber-soft)",
      href: "/admin/quiz",
    },
    {
      icon: "workspace_premium",
      label: "Sertifikatlar",
      value: String(certificates),
      note: "Topshirilgan",
      color: "var(--success)",
      soft: "var(--success-soft)",
      href: null,
    },
  ];

  const secondary = [
    { icon: "how_to_reg", label: "Kursga yozilishlar", value: String(stats.enrollments) },
    { icon: "task_alt", label: "Tugatilgan darslar", value: String(stats.completedLessons) },
    { icon: "bolt", label: "Umumiy XP", value: formatXp(stats.totalXp) },
  ];

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <h1
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(24px,3vw,30px)",
          letterSpacing: "-.02em",
          margin: "0 0 6px",
          color: "var(--text)",
        }}
      >
        Umumiy ko&apos;rsatkichlar
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 15.5, margin: "0 0 26px" }}>
        Platformaning joriy holati bir qarashda.
      </p>

      {/* Asosiy kartochkalar */}
      <div className="grid-4" style={{ gap: 16, marginBottom: 22 }}>
        {tiles.map((t) => {
          const body = (
            <>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: t.soft,
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 14,
                }}
              >
                <Icon name={t.icon} size={24} color={t.color} />
              </div>
              <div
                className="font-display"
                style={{ fontWeight: 800, fontSize: 28, color: "var(--text)", lineHeight: 1 }}
              >
                {t.value}
              </div>
              <div
                style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, margin: "7px 0 3px" }}
              >
                {t.label}
              </div>
              <div style={{ color: "var(--text-3)", fontSize: 13.5, fontWeight: 600 }}>
                {t.note}
              </div>
            </>
          );

          const style: React.CSSProperties = {
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 20,
            boxShadow: "var(--shadow-sm)",
            display: "block",
          };

          return t.href ? (
            <Link key={t.label} href={t.href} className="hover-lift-sm" style={style}>
              {body}
            </Link>
          ) : (
            <div key={t.label} style={style}>
              {body}
            </div>
          );
        })}
      </div>

      {/* Grafik + eng ommabop kurslar */}
      <div
        className="split"
        style={{ "--split": "1.5fr 1fr", gap: 20, marginBottom: 22 } as React.CSSProperties}
      >
        <Card title="Ro'yxatdan o'tishlar (14 kun)">
          <SignupChart data={trend} />
        </Card>

        <Card title="Eng ommabop kurslar" padding={0}>
          {topCourses.length === 0 ? (
            <p style={{ padding: 22, color: "var(--text-3)", margin: 0, fontSize: 14.5 }}>
              Hali kurs qo&apos;shilmagan.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {topCourses.map((c, i) => (
                <li
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "13px 22px",
                    borderBottom: i < topCourses.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: c.soft,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={c.icon} size={20} color={c.color} />
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: 700,
                      fontSize: 14.5,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.title}
                  </span>
                  <span
                    style={{
                      color: "var(--text-2)",
                      fontSize: 14,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.students} ta
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Qo'shimcha ko'rsatkichlar */}
      <div className="grid-3" style={{ gap: 16 }}>
        {secondary.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "var(--surface-3)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={s.icon} size={21} color="var(--text-2)" />
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                className="font-display"
                style={{ fontWeight: 800, fontSize: 21, color: "var(--text)", lineHeight: 1.1 }}
              >
                {s.value}
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 14, fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
