import { Icon } from "@/components/icon";
import { getLabProjects } from "@/lib/queries";

export default async function LabPage() {
  const projects = await getLabProjects();
  return (
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
          fontFamily: "'Sora'",
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: "-.02em",
          margin: "0 0 6px",
          color: "var(--text)",
        }}
      >
        Haqiqiy loyihalar quring
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 16, margin: "0 0 28px" }}>
        Darslardagi bilimni haqiqiy qurilmalarga aylantiring
      </p>
      <div className="grid-3" style={{ gap: 22 }}>
        {projects.map((p) => (
          <div
            key={p.id}
            className="hover-lift"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
              transition: "transform .25s ease,box-shadow .25s ease",
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
            </div>
            <div style={{ padding: 20 }}>
              <h3
                style={{
                  fontFamily: "'Sora'",
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
                }}
              >
                <Icon name="memory" size={16} />
                {p.parts}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
