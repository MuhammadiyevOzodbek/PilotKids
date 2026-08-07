import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getLabProjectsWithProgress } from "@/lib/queries";
import { LAB_KINDS, isLabKindSlug } from "../lab-kinds";
import { LabSection } from "../lab-section";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isLabKindSlug(kind)) return { title: "Laboratoriya — PilotKids" };
  return { title: `${LAB_KINDS[kind].title} — PilotKids` };
}

/** Tanlangan turdagi laboratoriya loyihalari. */
export default async function LabKindPage({ params }: { params: Promise<{ kind: string }> }) {
  // Avval kirish tekshiriladi, keyin manzil — tizimga kirmagan odamga qaysi
  // manzillar mavjudligi 404/redirect farqi orqali ham bilinmasin.
  const user = await requireUser();

  const { kind } = await params;
  if (!isLabKindSlug(kind)) notFound();

  const config = LAB_KINDS[kind];
  const all = await getLabProjectsWithProgress(user.id);
  const projects = all.filter((p) => p.kind === config.dbKind);

  // Ikkinchi turga tez o'tish uchun.
  const other = kind === "onlayn" ? "offline" : "onlayn";

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <Link
        href="/lab"
        className="tap"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-2)",
          fontWeight: 700,
          fontSize: 14.5,
          marginBottom: 18,
        }}
      >
        <Icon name="arrow_back" size={19} />
        Laboratoriya tanloviga qaytish
      </Link>

      <LabSection
        icon={config.icon}
        title={config.title}
        hint={config.hint}
        accent={config.accent}
        accentSoft={config.accentSoft}
        emptyText={config.empty}
        projects={projects}
      />

      {/* Boshqa turga o'tish */}
      <Link
        href={`/lab/${other}`}
        className="hover-lift-sm"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "16px 20px",
          borderRadius: 18,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "inherit",
        }}
      >
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: LAB_KINDS[other].accentSoft,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={LAB_KINDS[other].icon} size={21} color={LAB_KINDS[other].accent} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 15.5, color: "var(--text)" }}>
            {LAB_KINDS[other].title}
          </span>
          <span style={{ display: "block", fontSize: 13.5, color: "var(--text-2)" }}>
            {LAB_KINDS[other].hint}
          </span>
        </span>
        <Icon name="arrow_forward" size={20} color="var(--text-3)" />
      </Link>
    </div>
  );
}
