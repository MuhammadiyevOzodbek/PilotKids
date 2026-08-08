import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getLabProjectsWithProgress } from "@/lib/queries";
import { LabChoiceCard } from "./lab-choice-card";
import { LAB_3D, LAB_KINDS, type LabKindSlug } from "./lab-kinds";

export const metadata = { title: "Laboratoriya" };

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
    // Uchta kartochka uchun ustun kengroq — 1000 px da matn juda siqilardi.
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
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

      <div className="grid-3" style={{ gap: 22 }}>
        {(Object.keys(LAB_KINDS) as LabKindSlug[]).map((slug) => {
          const k = LAB_KINDS[slug];
          return (
            <LabChoiceCard
              key={slug}
              href={`/lab/${slug}`}
              icon={k.icon}
              title={k.title}
              description={k.long}
              /* Onlayn laboratoriya — bu simulyator, loyihalar ro'yxati emas. */
              badge={"badge" in k ? k.badge : `${countOf(slug)} ta loyiha`}
              doneCount={doneOf(slug)}
              accent={k.accent}
              accentText={k.accentText}
              accentSoft={k.accentSoft}
              cta="Kirish"
            />
          );
        })}

        {/* 3D bo'limi hali tayyor emas, shuning uchun tugma ham «Kirish» emas:
            u ochiladigan sahifada nima tayyorlanayotgani tushuntiriladi. */}
        <LabChoiceCard
          href={`/lab/${LAB_3D.slug}`}
          icon={LAB_3D.icon}
          title={LAB_3D.title}
          description={LAB_3D.long}
          badge={LAB_3D.badge}
          accent={LAB_3D.accent}
          accentText={LAB_3D.accentText}
          accentSoft={LAB_3D.accentSoft}
          cta="Batafsil"
        />
      </div>
    </div>
  );
}
