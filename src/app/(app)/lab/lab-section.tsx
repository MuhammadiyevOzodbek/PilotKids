import { Icon } from "@/components/icon";
import { LabCardActions } from "./lab-card-actions";

/**
 * Laboratoriyaning bitta bo'limi (onlayn yoki offline).
 *
 * Ikkala bo'lim bir xil kartochka ko'rinishidan foydalanadi — farq faqat
 * sarlavha, ikonka va bo'sh holat matnida.
 */

export interface LabProjectItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  soft: string;
  diff: string;
  diffCol: string;
  diffBg: string;
  parts: string;
  status: string | null;
}

export function LabSection({
  icon,
  title,
  hint,
  accent,
  accentSoft,
  emptyText,
  projects,
}: {
  icon: string;
  title: string;
  hint: string;
  accent: string;
  accentSoft: string;
  emptyText: string;
  projects: LabProjectItem[];
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      {/* Bo'lim sarlavhasi */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: accentSoft,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={23} color={accent} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 21,
              letterSpacing: "-.015em",
              margin: "0 0 2px",
              color: "var(--text)",
            }}
          >
            {title}
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: 0 }}>{hint}</p>
        </div>
        <span
          style={{
            marginLeft: "auto",
            padding: "5px 12px",
            borderRadius: 99,
            background: accentSoft,
            color: accent,
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {projects.length} ta loyiha
        </span>
      </div>

      {projects.length === 0 ? (
        <p
          style={{
            color: "var(--text-2)",
            fontSize: 15,
            padding: "34px 24px",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: 18,
            textAlign: "center",
            margin: 0,
          }}
        >
          {emptyText}
        </p>
      ) : (
        <div className="grid-3" style={{ gap: 22 }}>
          {projects.map((p) => (
            <article
              key={p.id}
              className="hover-lift"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 22,
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
                transition: "transform .25s ease,box-shadow .25s ease",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  height: 130,
                  background: p.soft,
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                }}
              >
                <Icon name={p.icon} size={56} color={p.color} />
                <span
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    padding: "5px 11px",
                    borderRadius: 99,
                    background: p.diffBg,
                    color: p.diffCol,
                    fontSize: "11.5px",
                    fontWeight: 700,
                  }}
                >
                  {p.diff}
                </span>
                {p.status && (
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      padding: "5px 11px",
                      borderRadius: 99,
                      background: p.status === "done" ? "var(--success)" : "var(--primary)",
                      color: "#fff",
                      fontSize: "11.5px",
                      fontWeight: 700,
                    }}
                  >
                    {p.status === "done" ? "Tugallandi" : "Boshlandi"}
                  </span>
                )}
              </div>

              <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "17.5px",
                    margin: "0 0 6px",
                    color: "var(--text)",
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    color: "var(--text-2)",
                    fontSize: "13.5px",
                    lineHeight: 1.55,
                    margin: "0 0 14px",
                  }}
                >
                  {p.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    color: "var(--text-3)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  <Icon name="memory" size={16} />
                  {p.parts}
                </div>

                <div style={{ marginTop: "auto" }}>
                  <LabCardActions projectId={p.id} status={p.status} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
