import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Laboratoriya tanlovidagi kartochka.
 *
 * Uchala tur (onlayn, offline, 3D) bitta shakldan foydalanadi. Ajratilishiga
 * sabab: ular bir-biridan faqat rang, matn va nishonlar bilan farq qiladi —
 * tarhni har biri uchun qayta yozish uchtasini bir-biridan sekin-asta
 * uzoqlashtirardi.
 */
export function LabChoiceCard({
  href,
  icon,
  title,
  description,
  badge,
  doneCount = 0,
  accent,
  accentText,
  accentSoft,
  cta,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  /** Asosiy nishon: «Interaktiv simulyator», «5 ta loyiha», «Tez orada». */
  badge: string;
  /** Tugallangan loyihalar — 0 bo'lsa nishon umuman chizilmaydi. */
  doneCount?: number;
  accent: string;
  accentText: string;
  accentSoft: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
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
          background: accentSoft,
          display: "grid",
          placeItems: "center",
          marginBottom: 18,
        }}
      >
        <Icon name={icon} size={31} color={accent} />
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
        {title}
      </h2>

      <p style={{ color: "var(--text-2)", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 20px" }}>
        {description}
      </p>

      {/* Matn uzunligi har xil — tugmalar baribir bir qatorda tursin. */}
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
            background: accentSoft,
            color: accent,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
        {doneCount > 0 && (
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
            {doneCount} ta tugallangan
          </span>
        )}
      </div>

      {/* Haqiqiy tugma emas — butun kartochka havola, ichida yana tugma
          bo'lsa ichma-ich interaktiv element hosil bo'lardi. */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "13px 22px",
          borderRadius: 14,
          background: accent,
          color: accentText,
          fontWeight: 700,
          fontSize: 15.5,
        }}
      >
        {cta}
        <Icon name="arrow_forward" size={20} />
      </span>
    </Link>
  );
}
