import Link from "next/link";
import { Icon } from "@/components/icon";
import { Robot3D } from "@/components/robot-3d";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import {
  partners,
  valueCards,
  howSteps,
  testimonials,
  team,
  footerCols,
  featured as featuredFallback,
  categories as categoriesFallback,
} from "@/lib/data";
import { getFeaturedCourses, getCategories } from "@/lib/queries";

// Build vaqtida DB'ga so'rov yubormaslik uchun sahifa so'rov paytida render qilinadi.
export const dynamic = "force-dynamic";

/** Footer ustunlaridagi matnli link → haqiqiy manzil.
 *  Xaritada bo'lmagan yozuv umuman ko'rsatilmaydi (bosiladigan, lekin
 *  hech qayerga olib bormaydigan element bo'lmasligi uchun). */
const footerHrefs: Record<string, string> = {
  Kurslar: "/courses",
  Laboratoriya: "/lab",
  Sertifikatlar: "/certificates",
  "AI Tutor": "/tutor",
  Narxlar: "/#narxlar",
  "Ota-ona paneli": "/parent",
  Xavfsizlik: "/maxfiylik#bolalar",
  "Ekran vaqti": "/parent",
  "Ko'p bola": "/parent",
  "Biz haqimizda": "/#jamoa",
  Jamoa: "/#jamoa",
};

type LandingCourse = {
  id: string;
  slug?: string;
  icon: string;
  color: string;
  soft: string;
  title: string;
  level: string;
  totalLessons: number;
  hours: string;
};
type LandingCategory = {
  id: string;
  icon: string;
  color: string;
  soft: string;
  title: string;
  courseCount: string;
};

export default async function Home() {
  // DB uzilsa ham sahifa yiqilmasin — statik kontentga qaytamiz (build/runtime bardoshli).
  let featured: LandingCourse[];
  let categories: LandingCategory[];
  try {
    [featured, categories] = await Promise.all([getFeaturedCourses(), getCategories()]);
  } catch (err) {
    console.error("Landing DB xatosi, fallback ishlatildi:", err);
    featured = featuredFallback.map((c, i) => ({
      id: `course-${i}`,
      icon: c.icon,
      color: c.color,
      soft: c.soft,
      title: c.title,
      level: c.level,
      totalLessons: c.lessons,
      hours: c.hours,
    }));
    categories = categoriesFallback.map((c, i) => ({
      id: `cat-${i}`,
      icon: c.icon,
      color: c.color,
      soft: c.soft,
      title: c.title,
      courseCount: c.count,
    }));
  }
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* HERO (navy, always dark) */}
      <section
        style={{
          position: "relative",
          background: "radial-gradient(120% 120% at 80% -10%,#16224a 0%,#0B1220 55%)",
          color: "#EAF0FB",
          overflow: "hidden",
        }}
      >
        <div
          className="orb"
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(47,107,243,.5),transparent 70%)",
            top: -120,
            right: "6%",
            filter: "blur(20px)",
            animation: "orbFloat 12s ease-in-out infinite",
          }}
        />
        <div
          className="orb"
          style={{
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(15,164,110,.32),transparent 70%)",
            bottom: -100,
            left: "0%",
            filter: "blur(20px)",
            animation: "orbFloat 15s ease-in-out infinite reverse",
          }}
        />

        {/* top nav */}
        <nav
          className="nav-bar"
          style={{
            position: "relative",
            zIndex: 5,
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 8px 20px -6px rgba(47,107,243,.6)",
              }}
            >
              <Icon name="smart_toy" size={22} color="#fff" />
            </div>
            <span
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "-.02em",
              }}
            >
              PilotKids
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              className="nav-links"
              style={{
                display: "flex",
                gap: 28,
                marginRight: 14,
                color: "#AEBBD4",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {/* Ilova sahifalari auth talab qiladi — mehmon `proxy.ts` orqali /login'ga tushadi */}
              <Link
                href="/courses"
                className="hover-white"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                Kurslar
              </Link>
              <Link
                href="/lab"
                className="hover-white"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                Laboratoriya
              </Link>
              <Link
                href="/parent"
                className="hover-white"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                Ota-onalar
              </Link>
              <Link
                href="/#narxlar"
                className="hover-white"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                Narxlar
              </Link>
            </div>
            <div className="nav-cta" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ThemeToggle variant="navy" />
              <Link
                href="/login"
                style={{
                  padding: "11px 20px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.16)",
                  background: "transparent",
                  color: "#EAF0FB",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                Kirish
              </Link>
            </div>
            <MobileNav />
          </div>
        </nav>

        {/* hero body */}
        <div
          className="hero-grid sec-x"
          style={{
            position: "relative",
            zIndex: 3,
            maxWidth: 1240,
            margin: "0 auto",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div className="hero-copy" style={{ animation: "fadeUp .7s ease both" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.12)",
                fontWeight: 700,
                fontSize: "clamp(12px,2.6vw,12.5px)",
                letterSpacing: ".14em",
                color: "#8fb2ff",
              }}
            >
              QUR · O&apos;RGAN · KASHF ET
            </div>
            <h1
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: "clamp(32px,6.2vw,60px)",
                lineHeight: 1.04,
                letterSpacing: "-.03em",
                margin: "22px 0 0",
                textWrap: "balance",
              }}
            >
              Kelajak muhandislari shu yerdan boshlaydi
            </h1>
            <p
              style={{
                fontSize: "clamp(16px,2vw,19px)",
                lineHeight: 1.6,
                color: "#AEBBD4",
                maxWidth: 520,
                margin: "22px 0 34px",
              }}
            >
              7–18 yoshli bolalar uchun robototexnika, kod va STEM — o&apos;ynab, qurib va sinab
              o&apos;rganish platformasi.
            </p>
            <div className="hero-cta" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link
                href="/signup"
                className="hover-up"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "16px 28px",
                  borderRadius: 15,
                  border: "none",
                  background: "var(--success)",
                  color: "#fff",
                  fontFamily: "'Sora'",
                  fontWeight: 700,
                  fontSize: 16.5,
                  cursor: "pointer",
                  boxShadow: "0 16px 34px -12px rgba(15,164,110,.7)",
                  textDecoration: "none",
                }}
              >
                Boshlash
                <Icon name="arrow_forward" size={20} />
              </Link>
              <Link
                href="/login"
                style={{
                  padding: "16px 26px",
                  borderRadius: 15,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(255,255,255,.05)",
                  color: "#EAF0FB",
                  fontFamily: "'Sora'",
                  fontWeight: 600,
                  fontSize: 16.5,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                Demoni ko&apos;rish
              </Link>
            </div>
            <div
              className="hero-stats"
              style={{ display: "flex", flexWrap: "wrap", gap: 30, marginTop: 44 }}
            >
              <div>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 26 }}>
                  120+
                </div>
                <div style={{ color: "#8496b5", fontSize: 13.5, fontWeight: 600 }}>
                  interaktiv dars
                </div>
              </div>
              <div>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 26 }}>
                  14k
                </div>
                <div style={{ color: "#8496b5", fontSize: 13.5, fontWeight: 600 }}>
                  yosh quruvchi
                </div>
              </div>
              <div>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 26 }}>
                  4.9★
                </div>
                <div style={{ color: "#8496b5", fontSize: 13.5, fontWeight: 600 }}>
                  ota-ona bahosi
                </div>
              </div>
            </div>
          </div>
          <div className="hero-visual" style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: "8% 4%",
                borderRadius: 40,
                background:
                  "radial-gradient(circle at 50% 40%,rgba(47,107,243,.22),transparent 65%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "14% 10%",
                borderRadius: "50%",
                border: "1px dashed rgba(143,178,255,.22)",
              }}
            />
            <Robot3D
              kind="hero"
              style={{
                position: "absolute",
                inset: 0,
                animation: "floatY 6s ease-in-out infinite",
              }}
            />
            <div
              className="hero-float"
              style={{
                position: "absolute",
                top: "9%",
                left: "9%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "12px 16px",
                borderRadius: 16,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 16px 40px -16px rgba(0,0,0,.5)",
                animation: "floatY 5s ease-in-out infinite",
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: "rgba(15,164,110,.22)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="bolt" size={22} color="#38d39a" />
              </span>
              <div>
                <div
                  className="font-display"
                  style={{ fontWeight: 800, fontSize: 16, color: "#EAF0FB" }}
                >
                  +40 XP
                </div>
                <div style={{ fontSize: 11.5, color: "#8fb2ff", fontWeight: 600 }}>
                  Dars tugadi!
                </div>
              </div>
            </div>
            <div
              className="hero-float"
              style={{
                position: "absolute",
                bottom: "16%",
                right: "-1%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "12px 16px",
                borderRadius: 16,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 16px 40px -16px rgba(0,0,0,.5)",
                animation: "floatY 7s ease-in-out infinite reverse",
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: "rgba(47,107,243,.25)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="smart_toy" size={22} color="#8fb2ff" />
              </span>
              <div>
                <div
                  className="font-display"
                  style={{ fontWeight: 800, fontSize: 16, color: "#EAF0FB" }}
                >
                  Robot tayyor
                </div>
                <div style={{ fontSize: 11.5, color: "#8fb2ff", fontWeight: 600 }}>
                  Motorlar ulandi
                </div>
              </div>
            </div>
            <div
              className="hero-float"
              style={{
                position: "absolute",
                top: "44%",
                right: "6%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                borderRadius: 99,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                backdropFilter: "blur(10px)",
                animation: "floatY 6s ease-in-out infinite",
              }}
            >
              <Icon name="local_fire_department" size={18} color="#EAB308" />
              <span
                className="font-display"
                style={{ fontWeight: 700, fontSize: 14, color: "#EAF0FB" }}
              >
                28 kun
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section
        className="sec-x"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingTop: 44,
        }}
      >
        <p
          style={{
            textAlign: "center",
            color: "var(--text-3)",
            fontWeight: 700,
            fontSize: 12.5,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            margin: "0 0 26px",
          }}
        >
          Maktab va to&apos;garaklar ishonadi
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px 40px",
          }}
        >
          {partners.map((p) => (
            <div
              key={p.name}
              className="hover-op"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: 0.72,
              }}
            >
              <Icon name={p.icon} size={26} color="var(--text-2)" />
              <span
                className="font-display"
                style={{
                  fontWeight: 700,
                  fontSize: 19,
                  color: "var(--text-2)",
                  letterSpacing: "-.01em",
                }}
              >
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* VALUE SECTIONS */}
      <section
        className="sec-x"
        style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 80, paddingBottom: 40 }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 640,
            margin: "0 auto 56px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "var(--primary)",
              letterSpacing: ".1em",
              fontSize: 13,
              textTransform: "uppercase",
            }}
          >
            Nega PilotKids
          </div>
          <h2
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(26px,4.4vw,38px)",
              letterSpacing: "-.02em",
              margin: "12px 0 0",
              color: "var(--text)",
            }}
          >
            Ekrandan tashqarida quriladigan mahorat
          </h2>
        </div>
        <div className="grid-3" style={{ gap: 24 }}>
          {valueCards.map((v) => (
            <div
              key={v.title}
              className="hover-lift"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 24,
                padding: 32,
                boxShadow: "var(--shadow)",
                transition: "transform .25s ease,box-shadow .25s ease",
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  background: v.soft,
                }}
              >
                <Icon name={v.icon} size={30} color={v.color} />
              </div>
              <h3
                className="font-display"
                style={{
                  fontWeight: 700,
                  fontSize: 22,
                  margin: "22px 0 10px",
                  color: "var(--text)",
                }}
              >
                {v.title}
              </h3>
              <p
                style={{
                  color: "var(--text-2)",
                  lineHeight: 1.6,
                  fontSize: 15.5,
                  margin: 0,
                }}
              >
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES STRIP */}
      <section
        className="sec-x"
        style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 44, paddingBottom: 20 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--primary)",
                letterSpacing: ".1em",
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Yo&apos;nalishlar
            </div>
            <h2
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: "clamp(25px,4vw,34px)",
                letterSpacing: "-.02em",
                margin: "10px 0 0",
                color: "var(--text)",
              }}
            >
              Har bir qiziqishga bir yo&apos;l
            </h2>
          </div>
          <Link
            href="/signup"
            className="tap"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "none",
              background: "transparent",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Barchasini ko&apos;rish
            <Icon name="arrow_forward" size={19} />
          </Link>
        </div>
        <div className="grid-4" style={{ gap: 16 }}>
          {categories.map((c) => (
            <div
              key={c.id}
              className="hover-lift-sm"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "16px 18px",
                boxShadow: "var(--shadow-sm)",
                transition: "transform .2s ease",
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: c.soft,
                }}
              >
                <Icon name={c.icon} size={24} color={c.color} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  className="font-display"
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--text)",
                  }}
                >
                  {c.title}
                </div>
                <div
                  style={{
                    color: "var(--text-3)",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {c.courseCount}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="qanday-ishlaydi"
        className="sec-x"
        style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 80, paddingBottom: 40 }}
      >
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 52px" }}>
          <div
            style={{
              fontWeight: 700,
              color: "var(--primary)",
              letterSpacing: ".1em",
              fontSize: 13,
              textTransform: "uppercase",
            }}
          >
            Qanday ishlaydi
          </div>
          <h2
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(26px,4.2vw,36px)",
              letterSpacing: "-.02em",
              margin: "12px 0 0",
              color: "var(--text)",
            }}
          >
            To&apos;rt qadamda quruvchiga aylaning
          </h2>
        </div>
        <div className="grid-4" style={{ gap: 22 }}>
          {howSteps.map((h) => (
            <div
              key={h.n}
              style={{
                position: "relative",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 22,
                padding: 28,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <span
                className="font-display"
                style={{
                  position: "absolute",
                  top: 22,
                  right: 24,
                  fontWeight: 800,
                  fontSize: 34,
                  color: "var(--surface-3)",
                }}
              >
                {h.n}
              </span>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  display: "grid",
                  placeItems: "center",
                  background: h.soft,
                  marginBottom: 20,
                }}
              >
                <Icon name={h.icon} size={28} color={h.color} />
              </div>
              <h3
                className="font-display"
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  margin: "0 0 8px",
                  color: "var(--text)",
                }}
              >
                {h.title}
              </h3>
              <p
                style={{
                  color: "var(--text-2)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {h.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* POPULAR COURSES */}
      <section
        id="kurslar"
        className="sec-x"
        style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 40, paddingBottom: 40 }}
      >
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 44px" }}>
          <div
            style={{
              fontWeight: 700,
              color: "var(--primary)",
              letterSpacing: ".1em",
              fontSize: 13,
              textTransform: "uppercase",
            }}
          >
            Mashhur kurslar
          </div>
          <h2
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(26px,4.2vw,36px)",
              letterSpacing: "-.02em",
              margin: "12px 0 0",
              color: "var(--text)",
            }}
          >
            Nimadan boshlash mumkin
          </h2>
        </div>
        <div className="grid-4" style={{ gap: 20 }}>
          {featured.map((c) => (
            <Link
              key={c.id}
              href={c.slug ? `/courses/${c.slug}` : "/courses"}
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
                  className="font-display"
                  style={{
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
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* PARENT TRUST */}
      <section
        id="ota-onalar"
        className="sec-x"
        style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 60, paddingBottom: 60 }}
      >
        <div
          className="parent-grid"
          style={{
            gap: 40,
            alignItems: "center",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 28,
            boxShadow: "var(--shadow)",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 99,
                background: "var(--success-soft)",
                color: "var(--success)",
                fontWeight: 700,
                fontSize: 12.5,
                letterSpacing: ".06em",
                marginBottom: 18,
              }}
            >
              <Icon name="verified_user" size={18} />
              OTA-ONALAR UCHUN
            </div>
            <h2
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: "clamp(24px,3.8vw,32px)",
                letterSpacing: "-.02em",
                margin: "0 0 14px",
                color: "var(--text)",
              }}
            >
              Xavfsiz, nazorat ostida, tinch
            </h2>
            <p
              style={{
                color: "var(--text-2)",
                fontSize: 15.5,
                lineHeight: 1.7,
                margin: "0 0 26px",
              }}
            >
              Reklama yo&apos;q, chatda begonalar yo&apos;q. Siz progressni ko&apos;rasiz, ekran
              vaqtini belgilaysiz va farzandingiz nimani o&apos;rganayotganidan xabardor
              bo&apos;lasiz.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "Ota-ona paneli va haftalik hisobot",
                "Ekran-vaqti chegaralari",
                "Yoshga mos, xavfsiz muhit",
              ].map((t) => (
                <div key={t} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: 10,
                      background: "var(--success-soft)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon name="check" size={20} color="var(--success)" />
                  </span>
                  <span
                    style={{
                      color: "var(--text)",
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="stat-grid" style={{ gap: 16 }}>
            <div
              style={{
                background: "linear-gradient(135deg,#12203f,#0B1220)",
                borderRadius: 20,
                padding: 26,
                color: "#EAF0FB",
                gridColumn: "1 / -1",
              }}
            >
              <div
                className="font-display"
                style={{ fontWeight: 800, fontSize: "clamp(30px,5vw,40px)" }}
              >
                14 000+
              </div>
              <div
                style={{
                  color: "#AEBBD4",
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                ishonch bildirgan oila
              </div>
            </div>
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <div
                className="font-display"
                style={{
                  fontWeight: 800,
                  fontSize: 30,
                  color: "var(--primary)",
                }}
              >
                4.9★
              </div>
              <div
                style={{
                  color: "var(--text-2)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                o&apos;rtacha baho
              </div>
            </div>
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <div
                className="font-display"
                style={{
                  fontWeight: 800,
                  fontSize: 30,
                  color: "var(--success)",
                }}
              >
                120+
              </div>
              <div
                style={{
                  color: "var(--text-2)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                interaktiv dars
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className="sec-x"
        style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 40, paddingBottom: 20 }}
      >
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 44px" }}>
          <div
            style={{
              fontWeight: 700,
              color: "var(--primary)",
              letterSpacing: ".1em",
              fontSize: 13,
              textTransform: "uppercase",
            }}
          >
            Fikrlar
          </div>
          <h2
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(26px,4.2vw,36px)",
              letterSpacing: "-.02em",
              margin: "12px 0 0",
              color: "var(--text)",
            }}
          >
            Oilalar va o&apos;quvchilar sevadi
          </h2>
        </div>
        <div className="grid-3" style={{ gap: 22 }}>
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 22,
                padding: 30,
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" size={19} color="#EAB308" />
                ))}
              </div>
              <p
                style={{
                  color: "var(--text)",
                  fontSize: 15.5,
                  lineHeight: 1.65,
                  margin: "0 0 22px",
                  flex: 1,
                }}
              >
                “{t.text}”
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  className="font-display"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: t.color,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {t.init}
                </span>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14.5,
                      color: "var(--text)",
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      color: "var(--text-3)",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM */}
      <section
        id="jamoa"
        className="sec-x"
        style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 70, paddingBottom: 20 }}
      >
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
          <div
            style={{
              fontWeight: 700,
              color: "var(--primary)",
              letterSpacing: ".1em",
              fontSize: 13,
              textTransform: "uppercase",
            }}
          >
            Bizning jamoa
          </div>
          <h2
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(26px,4.2vw,36px)",
              letterSpacing: "-.02em",
              margin: "12px 0 14px",
              color: "var(--text)",
            }}
          >
            Ortimizda turgan odamlar
          </h2>
          <p
            style={{
              color: "var(--text-2)",
              fontSize: 16,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Muhandislar, pedagoglar va dizaynerlardan iborat kichik jamoa — bolalarga kelajak
            kasblarini o&apos;ynab o&apos;rgatishga bag&apos;ishlangan.
          </p>
        </div>
        <div className="grid-4" style={{ gap: 22 }}>
          {team.map((t) => (
            <div
              key={t.name}
              className="hover-lift"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 22,
                padding: "28px 24px",
                boxShadow: "var(--shadow-sm)",
                textAlign: "center",
                transition: "transform .25s ease,box-shadow .25s ease",
              }}
            >
              <span
                className="font-display"
                style={{
                  width: 76,
                  height: 76,
                  margin: "0 auto 16px",
                  borderRadius: "50%",
                  background: t.color,
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 26,
                }}
              >
                {t.init}
              </span>
              <h3
                className="font-display"
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  margin: "0 0 4px",
                  color: "var(--text)",
                }}
              >
                {t.name}
              </h3>
              <div
                style={{
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {t.role}
              </div>
              <p
                style={{
                  color: "var(--text-2)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  margin: "0 0 16px",
                }}
              >
                {t.bio}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <span
                  className="hover-primary"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "var(--surface-3)",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="public" size={18} color="var(--text-2)" />
                </span>
                <span
                  className="hover-primary"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "var(--surface-3)",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="mail" size={18} color="var(--text-2)" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="narxlar" className="sec-x" style={{ maxWidth: 1180, margin: "64px auto 40px" }}>
        <div
          className="cta-box"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 32,
            background: "linear-gradient(120deg,#12203f,#0B1220)",
            color: "#EAF0FB",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(15,164,110,.4),transparent 70%)",
              top: -90,
              left: "8%",
              filter: "blur(14px)",
            }}
          />
          {/* "Narxlar" havolasi shu bo'limga tushadi — hozircha platforma to'liq bepul */}
          <div
            style={{
              position: "relative",
              fontWeight: 700,
              color: "#7fe3bb",
              letterSpacing: ".1em",
              fontSize: 13,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Narxlar
          </div>
          <h2
            className="font-display"
            style={{
              position: "relative",
              fontWeight: 800,
              fontSize: "clamp(26px,4.6vw,40px)",
              letterSpacing: "-.02em",
              margin: "0 0 14px",
            }}
          >
            Hamma narsa bepul
          </h2>
          <p
            style={{
              position: "relative",
              color: "#AEBBD4",
              fontSize: "clamp(15px,2vw,18px)",
              margin: "0 auto 30px",
              maxWidth: 520,
            }}
          >
            Barcha kurslar, laboratoriya va AI tutor hozircha bepul — karta talab qilinmaydi. Bir
            necha daqiqada birinchi robotingizni yig&apos;ing.
          </p>
          <Link
            href="/signup"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "17px 34px",
              borderRadius: 15,
              border: "none",
              background: "var(--success)",
              color: "#fff",
              fontFamily: "'Sora'",
              fontWeight: 700,
              fontSize: 17,
              cursor: "pointer",
              boxShadow: "0 18px 40px -14px rgba(15,164,110,.8)",
              textDecoration: "none",
            }}
          >
            Get Started
            <Icon name="rocket_launch" size={21} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="footer"
        style={{
          background: "linear-gradient(180deg,#0B1220,#080d18)",
          color: "#AEBBD4",
          marginTop: 40,
        }}
      >
        <div
          className="footer-grid"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            gap: 40,
            paddingBottom: 44,
            borderBottom: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <div className="footer-brand" style={{ maxWidth: 300 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="smart_toy" size={22} color="#fff" />
              </div>
              <span
                className="font-display"
                style={{ fontWeight: 800, fontSize: 20, color: "#EAF0FB" }}
              >
                PilotKids
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 0 20px",
              }}
            >
              Kelajak muhandislari uchun robototexnika, kod va STEM platformasi. O&apos;ynab, qurib,
              o&apos;rganib.
            </p>
            {/* Ijtimoiy tarmoq ikonlari olib tashlandi: haqiqiy profil manzillari yo'q edi,
                bosiladigan, lekin hech qayerga olib bormaydigan element qoldirmaymiz. */}
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <div
                className="font-display"
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#EAF0FB",
                  marginBottom: 16,
                }}
              >
                {col.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {col.links
                  .filter((lk) => footerHrefs[lk])
                  .map((lk) => (
                    <Link
                      key={lk}
                      href={footerHrefs[lk]}
                      className="hover-white"
                      style={{
                        fontSize: 14,
                        color: "#AEBBD4",
                        textDecoration: "none",
                      }}
                    >
                      {lk}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            paddingTop: 24,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, color: "#6f82a3" }}>
            © 2026 PilotKids · Bolalar uchun xavfsiz ta&apos;lim
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            <Link
              href="/maxfiylik"
              className="nav-link"
              style={{ fontSize: 13, color: "#6f82a3", textDecoration: "none" }}
            >
              Maxfiylik
            </Link>
            <Link
              href="/shartlar"
              className="nav-link"
              style={{ fontSize: 13, color: "#6f82a3", textDecoration: "none" }}
            >
              Shartlar
            </Link>
            <Link
              href="/maxfiylik#cookie"
              className="nav-link"
              style={{ fontSize: 13, color: "#6f82a3", textDecoration: "none" }}
            >
              Cookie
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
