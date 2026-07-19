import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getLabProjectsWithProgress } from "@/lib/queries";
import { LabCardActions } from "./lab-card-actions";

export const metadata = { title: "Laboratoriya — PilotKids" };

export default async function LabPage() {
  const user = await requireUser();
  const projects = await getLabProjectsWithProgress(user.id);
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
      {projects.length === 0 && (
        <p
          style={{
            color: "var(--text-2)",
            fontSize: 15,
            padding: "40px 24px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            textAlign: "center",
          }}
        >
          Loyihalar tayyorlanmoqda. Tez orada bu yerda amaliy ishlar paydo bo&apos;ladi!
        </p>
      )}
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
                  marginBottom: 16,
                }}
              >
                <Icon name="memory" size={16} />
                {p.parts}
              </div>
              <LabCardActions projectId={p.id} status={p.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
