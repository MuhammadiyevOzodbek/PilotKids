import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getUserCertificates } from "@/lib/queries";

export default async function CertificatesPage() {
  const user = await requireUser();
  const certs = await getUserCertificates(user.id);
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
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
        Sertifikatlar
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 16, margin: "0 0 30px" }}>
        {certs.filter((c) => c.state === "done").length} ta olindi · davom eting
      </p>
      <div className="grid-2" style={{ gap: 24 }}>
        {certs.map((c) => {
          const done = c.state === "done";
          const prog = c.state === "progress";
          const lock = c.state === "locked";
          const dim = lock ? ".6" : "1";
          const medalIcon = lock ? "lock" : "workspace_premium";
          const badge = done ? "TUGALLANGAN" : prog ? "DAVOM ETMOQDA" : "QULFLANGAN";
          const badgeBg = done
            ? "var(--success-soft)"
            : prog
              ? "var(--primary-soft)"
              : "var(--surface-3)";
          const badgeCol = done ? "var(--success)" : prog ? "var(--primary)" : "var(--text-3)";
          const btnIcon = done ? "download" : prog ? "play_arrow" : "lock";
          const btnLabel = done ? "Yuklab olish" : prog ? "Davom etish" : "Qulflangan";
          return (
            <div
              key={c.id}
              style={{
                position: "relative",
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-sm)",
                opacity: dim,
              }}
            >
              <div style={{ height: 8, background: c.color }} />
              <div style={{ padding: 26, display: "flex", gap: 20, alignItems: "center" }}>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    flexShrink: 0,
                    borderRadius: 20,
                    display: "grid",
                    placeItems: "center",
                    background: c.soft,
                    position: "relative",
                  }}
                >
                  <Icon name={medalIcon} size={44} color={c.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="micro-label"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 99,
                      background: badgeBg,
                      color: badgeCol,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: ".05em",
                      marginBottom: 8,
                    }}
                  >
                    {badge}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Sora'",
                      fontWeight: 700,
                      fontSize: 19,
                      margin: "0 0 4px",
                      color: "var(--text)",
                    }}
                  >
                    {c.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--text-3)",
                      fontSize: 13.5,
                      fontWeight: 600,
                      margin: "0 0 14px",
                    }}
                  >
                    {c.issuedLabel}
                  </p>
                  <button
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "11px 18px",
                      borderRadius: 12,
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: lock ? "not-allowed" : "pointer",
                      border: "none",
                      ...(done
                        ? { background: "var(--success)", color: "#fff" }
                        : prog
                          ? { background: "var(--primary)", color: "#fff" }
                          : { background: "var(--surface-3)", color: "var(--text-3)" }),
                    }}
                  >
                    <Icon name={btnIcon} size={18} />
                    {btnLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
