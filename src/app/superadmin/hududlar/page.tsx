import { Icon } from "@/components/icon";
import { Empty, Meter, PageHead, Panel, Stat } from "@/components/superadmin/ui";
import { getRegions } from "@/lib/superadmin/queries";

export const metadata = { title: "Hududlar" };

/**
 * Hududlar kesimi — o'sish qayerda kuchli, qayerda so'ngan.
 * Server komponenti: bu ekranda interaktivlik shart emas.
 */
export default async function SuperAdminRegionsPage() {
  const regions = await getRegions();
  const total = regions.reduce((s, r) => s + r.users, 0);
  const best = regions.reduce((a, b) => (b.growth > a.growth ? b : a), regions[0]);
  const worst = regions.reduce((a, b) => (b.growth < a.growth ? b : a), regions[0]);

  return (
    <>
      <PageHead
        eyebrow="Geography"
        title="Hududlar"
        hint="O'zbekiston bo'ylab o'quvchilar taqsimoti va o'sish sur'ati."
      />

      <div
        className="sa-grid"
        style={{ "--sa-min": "210px", marginBottom: 16 } as React.CSSProperties}
      >
        <Stat
          label="Jami o'quvchi"
          value={total.toLocaleString("ru-RU").replace(/,/g, " ")}
          icon="groups"
        />
        <Stat label="Qamrab olingan hudud" value={String(regions.length)} unit="ta" icon="public" />
        <Stat
          label="Eng tez o'sayotgan"
          value={best?.name.split(" ")[0] ?? "—"}
          unit={best ? `+${best.growth}%` : undefined}
          icon="trending_up"
          tint="var(--sa-ok)"
        />
        <Stat
          label="Diqqat talab qiladi"
          value={worst?.name.split(" ")[0] ?? "—"}
          unit={worst ? `${worst.growth}%` : undefined}
          icon="trending_down"
          tint="var(--sa-crit)"
        />
      </div>

      <Panel title="Hududlar kesimi" padding={0}>
        <div className="sa-scroll-x">
          <table className="sa-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Hudud</th>
                <th style={{ textAlign: "right" }}>O&apos;quvchilar</th>
                <th style={{ minWidth: 200 }}>Ulush</th>
                <th style={{ textAlign: "right" }}>O&apos;sish</th>
              </tr>
            </thead>
            <tbody>
              {regions.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <Empty icon="public" text="Hudud bo'yicha real ma'lumot hali yo'q" />
                  </td>
                </tr>
              ) : (
                regions.map((r, i) => (
                  <tr key={r.id}>
                    <td className="sa-num" style={{ color: "var(--sa-faint)" }}>
                      {i + 1}
                    </td>
                    <td style={{ fontWeight: 650, color: "#fff" }}>{r.name}</td>
                    <td className="sa-num" style={{ textAlign: "right" }}>
                      {r.users.toLocaleString("ru-RU").replace(/,/g, " ")}
                    </td>
                    <td>
                      <Meter
                        value={r.share}
                        color={r.growth >= 0 ? "var(--sa-accent)" : "var(--sa-crit)"}
                      />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        className="sa-num"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontWeight: 700,
                          fontSize: 13,
                          color: r.growth >= 0 ? "var(--sa-ok)" : "var(--sa-crit)",
                        }}
                      >
                        <Icon name={r.growth >= 0 ? "trending_up" : "trending_down"} size={15} />
                        {r.growth >= 0 ? "+" : ""}
                        {r.growth}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
