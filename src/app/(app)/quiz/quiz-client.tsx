"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

export function QuizClient({
  prompt,
  options,
  correctIndex,
}: {
  prompt: string;
  options: string[];
  correctIndex: number;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const correct = correctIndex;
  const done = sel !== null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div style={{ flex: 1, height: 10, borderRadius: 99, background: "var(--surface-3)" }}>
          <div
            style={{
              width: "66%",
              height: "100%",
              borderRadius: 99,
              background: "linear-gradient(90deg,var(--primary),#5b8cff)",
            }}
          />
        </div>
        <span style={{ fontWeight: 700, color: "var(--text-2)", fontSize: 14 }}>2 / 3</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 13px",
            borderRadius: 99,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <Icon name="timer" size={18} color="var(--primary)" />
          0:24
        </span>
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: 36,
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 12px",
            borderRadius: 99,
            background: "var(--primary-soft)",
            color: "var(--primary)",
            fontWeight: 700,
            fontSize: "12.5px",
            marginBottom: 18,
          }}
        >
          2-SAVOL
        </div>
        <h2
          style={{
            fontFamily: "'Sora'",
            fontWeight: 700,
            fontSize: 25,
            lineHeight: 1.35,
            margin: "0 0 28px",
            color: "var(--text)",
          }}
        >
          {prompt}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {options.map((o, i) => {
            let bc = "var(--border)";
            let bg = "var(--surface)";
            let tc = "var(--text)";
            let mark = "";
            let mcol = "";
            if (done) {
              if (i === correct) {
                bc = "var(--success)";
                bg = "var(--success-soft)";
                tc = "var(--success)";
                mark = "check_circle";
                mcol = "var(--success)";
              } else if (i === sel) {
                bc = "#E5484D";
                bg = "rgba(229,72,77,.1)";
                tc = "#E5484D";
                mark = "cancel";
                mcol = "#E5484D";
              } else {
                tc = "var(--text-3)";
              }
            }
            const letter = String.fromCharCode(65 + i);
            return (
              <button
                key={i}
                onClick={() => {
                  if (sel === null) setSel(i);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 16,
                  border: `2px solid ${bc}`,
                  background: bg,
                  color: tc,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "15.5px",
                  transition: "all .18s ease",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 14,
                    background:
                      done && (i === correct || i === sel) ? "transparent" : "var(--surface-3)",
                    color: tc,
                    border: `2px solid ${done ? bc : "transparent"}`,
                  }}
                >
                  {letter}
                </span>
                <span style={{ flex: 1 }}>{o}</span>
                {mark && <Icon name={mark} size={24} color={mcol} />}
              </button>
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <Link
          href="/lesson"
          className="tap"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            border: "none",
            background: "transparent",
            color: "var(--text-2)",
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <Icon name="arrow_back" size={20} />
          Darsga qaytish
        </Link>
        <Link
          href="/lab"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "15px 28px",
            borderRadius: 14,
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            fontFamily: "'Sora'",
            fontWeight: 700,
            fontSize: "15.5px",
            cursor: "pointer",
            boxShadow: "0 12px 26px -12px var(--ring)",
            textDecoration: "none",
          }}
        >
          Keyingi savol
          <Icon name="arrow_forward" size={20} />
        </Link>
      </div>
    </div>
  );
}
