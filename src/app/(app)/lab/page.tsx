import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getLabProjectsWithProgress } from "@/lib/queries";
import { LAB_KINDS, type LabKindSlug } from "./lab-kinds";

export const metadata = { title: "Laboratoriya — PilotKids" };

/**
 * Laboratoriya tanlovi.
 *
 * O'quvchi avval qayerda ishlashini tanlaydi — brauzerdami yoki haqiqiy
 * qurilma bilanmi. Tanlagach o'sha turdagi loyihalar sahifasiga o'tadi.
 */
export default async function LabPage() {
  const user = await requireUser();
  const projects = await getLabProjectsWithProgress(user.id);

  // Bitta so'rov yetarli — sonlarni shu yerda ajratamiz.
  const countOf = (slug: LabKindSlug) =>
    projects.filter((p) => p.kind === LAB_KINDS[slug].dbKind).length;
  const doneOf = (slug: LabKindSlug) =>
    projects.filter((p) => p.kind === LAB_KINDS[slug].dbKind && p.status === "done").length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderRadius: 99,
          background: "var(--primary-soft)",
          color: "var(--primary)",
          fontWeight: 700,
          fontSize: "12.5px",
          letterSpacing: ".06em",
          marginBottom: 14,
        }}
      >
        <Icon name="science" size={18} />
        LABORATORIYA
      </div>

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
        Qayerda ishlaymiz?
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 16, margin: "0 0 32px" }}>
        Laboratoriya turini tanlang — keyin uni istalgan vaqtda almashtirishingiz mumkin
      </p>

      <div className="grid-2" style={{ gap: 22 }}>
        {(Object.keys(LAB_KINDS) as LabKindSlug[]).map((slug) => {
          const k = LAB_KINDS[slug];
          const total = countOf(slug);
          const done = doneOf(slug);

          return (
            <Link
              key={slug}
              href={`/lab/${slug}`}
              className="hover-lift"
              style={{
                display: "flex",
                flexDirection: "column",
                padding: 28,
                borderRadius: 24,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
                transition: "transform .25s ease,box-shadow .25s ease",
                color: "inherit",
              }}
            >
              <span
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 18,
                  background: k.accentSoft,
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 18,
                }}
              >
                <Icon name={k.icon} size={31} color={k.accent} />
              </span>

              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: "-.015em",
                  margin: "0 0 8px",
                  color: "var(--text)",
                }}
              >
                {k.title}
              </h2>

              <p
                style={{
                  color: "var(--text-2)",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  margin: "0 0 20px",
                }}
              >
                {k.long}
              </p>

              <div style={{ flex: 1 }} />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    padding: "5px 12px",
                    borderRadius: 99,
                    background: k.accentSoft,
                    color: k.accent,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {/* Onlayn laboratoriya — bu simulyator, loyihalar ro'yxati emas. */}
                  {"badge" in k ? k.badge : `${total} ta loyiha`}
                </span>
                {done > 0 && (
                  <span
                    style={{
                      padding: "5px 12px",
                      borderRadius: 99,
                      background: "var(--success-soft)",
                      color: "var(--success)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {done} ta tugallangan
                  </span>
                )}
              </div>

              {/* Haqiqiy tugma emas — butun kartochka havola, ichida yana
                  tugma bo'lsa ichma-ich interaktiv element hosil bo'lardi. */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "13px 22px",
                  borderRadius: 14,
                  background: k.accent,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15.5,
                }}
              >
                Kirish
                <Icon name="arrow_forward" size={20} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
