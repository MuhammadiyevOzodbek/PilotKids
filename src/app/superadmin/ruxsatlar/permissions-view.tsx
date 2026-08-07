"use client";

import { Fragment } from "react";
import { Icon } from "@/components/icon";
import { Chip, PageHead, Panel } from "@/components/superadmin/ui";
import {
  ADMIN_LEVEL_LABEL,
  ADMIN_LEVEL_TONE,
  type AdminLevel,
  type Capability,
} from "@/lib/superadmin/types";

const LEVELS: AdminLevel[] = ["root", "admin"];

type Grant = "full" | "read" | "none";

const CELL: Record<Grant, { icon: string; color: string; label: string }> = {
  full: { icon: "check_circle", color: "var(--sa-ok)", label: "To'liq" },
  read: { icon: "visibility", color: "var(--sa-warn)", label: "Faqat ko'rish" },
  none: { icon: "remove", color: "var(--sa-faint)", label: "Yo'q" },
};

/**
 * Ruxsatlar matritsasi.
 *
 * Bu ekranning o'zi bosh admin va oddiy admin farqini eng aniq ko'rsatadi:
 * oddiy admin faqat o'ziga berilgan huquqlar doirasida ishlaydi, bosh admin
 * esa o'sha doirani chizadi.
 */
export function PermissionsView({ capabilities }: { capabilities: Capability[] }) {
  const groups = Array.from(new Set(capabilities.map((c) => c.group)));

  return (
    <>
      <PageHead
        eyebrow="Access control"
        title="Ruxsatlar matritsasi"
        hint="Bu jadval DB'dagi rol va server guardlar asosida ishlayotgan haqiqiy policy'ni ko'rsatadi."
      />

      <div
        className="sa-grid"
        style={{ "--sa-min": "230px", marginBottom: 16 } as React.CSSProperties}
      >
        {LEVELS.map((l) => {
          const counts = capabilities.reduce(
            (acc, c) => {
              acc[c.grid[l]] += 1;
              return acc;
            },
            { full: 0, read: 0, none: 0 } as Record<Grant, number>,
          );
          return (
            <div
              key={l}
              className="sa-stat"
              style={
                {
                  "--sa-tint": l === "root" ? "var(--sa-crit)" : "var(--sa-accent)",
                } as React.CSSProperties
              }
            >
              <div style={{ marginBottom: 12 }}>
                <Chip tone={ADMIN_LEVEL_TONE[l]}>{ADMIN_LEVEL_LABEL[l]}</Chip>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                {(["full", "read", "none"] as Grant[]).map((g) => (
                  <span key={g}>
                    <span
                      className="sa-num"
                      style={{
                        display: "block",
                        fontSize: 20,
                        fontWeight: 700,
                        color: CELL[g].color,
                      }}
                    >
                      {counts[g]}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--sa-faint)" }}>
                      {CELL[g].label}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Panel
        title="Imkoniyatlar"
        padding={0}
        action={
          <div style={{ display: "flex", gap: 13, flexWrap: "wrap" }}>
            {(["full", "read", "none"] as Grant[]).map((g) => (
              <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name={CELL[g].icon} size={15} color={CELL[g].color} />
                <span style={{ fontSize: 12, color: "var(--sa-faint)" }}>{CELL[g].label}</span>
              </span>
            ))}
          </div>
        }
      >
        <div className="sa-scroll-x">
          <table className="sa-table">
            <thead>
              <tr>
                <th style={{ minWidth: 300 }}>Imkoniyat</th>
                {LEVELS.map((l) => (
                  <th key={l} style={{ textAlign: "center", minWidth: 110 }}>
                    {ADMIN_LEVEL_LABEL[l]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group}>
                  <tr>
                    <td
                      colSpan={LEVELS.length + 1}
                      style={{
                        background: "rgba(255,255,255,.028)",
                        padding: "8px 16px",
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        color: "var(--sa-accent)",
                      }}
                    >
                      {group}
                    </td>
                  </tr>
                  {capabilities
                    .filter((c) => c.group === group)
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 650, fontSize: 13.5, color: "#fff" }}>
                            {c.label}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--sa-faint)", marginTop: 2 }}>
                            {c.hint}
                          </div>
                        </td>
                        {LEVELS.map((l) => {
                          const g = c.grid[l];
                          return (
                            <td key={l} style={{ textAlign: "center" }}>
                              <span
                                aria-label={`${c.label} · ${ADMIN_LEVEL_LABEL[l]} · ${CELL[g].label}`}
                                title={CELL[g].label}
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 9,
                                  display: "grid",
                                  placeItems: "center",
                                  border: "1px solid var(--sa-line)",
                                  background:
                                    l === "root" ? "rgba(255,77,94,.1)" : "rgba(255,255,255,.03)",
                                }}
                              >
                                <Icon name={CELL[g].icon} size={17} color={CELL[g].color} />
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p
        style={{
          margin: "14px 0 0",
          fontSize: 12.5,
          color: "var(--sa-faint)",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <Icon name="lock" size={15} />
        Bosh admin ustuni qulflangan: o&apos;zingizni tizimdan chiqarib qo&apos;yishning oldi
        olinadi.
      </p>
    </>
  );
}
