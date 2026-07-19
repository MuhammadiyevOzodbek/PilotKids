"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { submitQuizAnswer } from "@/lib/actions/learning";

type Question = { id: string; prompt: string; options: string[] };
type Answered = Record<string, { selectedIndex: number; correct: boolean }>;

/** Serverdan kelgan javob natijasi. */
type Result = { selected: number; correct: boolean; correctIndex: number; xpGained: number };

export function QuizClient({
  questions,
  answered,
  courseTitle,
}: {
  questions: Question[];
  answered: Answered;
  courseTitle: string;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const q = questions[index]!;
  const total = questions.length;
  // Oldingi sessiyada javob berilgan bo'lsa ham natijani ko'rsatamiz.
  const prior = answered[q.id];
  const result =
    results[q.id] ??
    (prior
      ? { selected: prior.selectedIndex, correct: prior.correct, correctIndex: -1, xpGained: 0 }
      : null);
  const done = result !== null;
  const isLast = index === total - 1;

  const solved = questions.filter((x) => results[x.id] ?? answered[x.id]).length;
  const correctCount = questions.filter((x) => (results[x.id] ?? answered[x.id])?.correct).length;

  function choose(i: number) {
    if (done || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await submitQuizAnswer(q.id, i);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResults((prev) => ({
        ...prev,
        [q.id]: {
          selected: i,
          correct: res.correct,
          correctIndex: res.correctIndex,
          xpGained: res.xpGained,
        },
      }));
    });
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div style={{ flex: 1, height: 10, borderRadius: 99, background: "var(--surface-3)" }}>
          <div
            style={{
              width: `${((index + 1) / total) * 100}%`,
              height: "100%",
              borderRadius: 99,
              background: "linear-gradient(90deg,var(--primary),#5b8cff)",
              transition: "width .3s ease",
            }}
          />
        </div>
        <span style={{ fontWeight: 700, color: "var(--text-2)", fontSize: 14 }}>
          {index + 1} / {total}
        </span>
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
          <Icon name="check_circle" size={18} color="var(--success)" />
          {correctCount}/{solved}
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
          {index + 1}-SAVOL · {courseTitle.toUpperCase()}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 25,
            lineHeight: 1.35,
            margin: "0 0 28px",
            color: "var(--text)",
          }}
        >
          {q.prompt}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {q.options.map((o, i) => {
            let bc = "var(--border)";
            let bg = "var(--surface)";
            let tc = "var(--text)";
            let mark = "";
            let mcol = "";
            if (done && result) {
              // To'g'ri javob indeksi serverdan javob kelgandan KEYIN ma'lum bo'ladi.
              if (result.correctIndex >= 0 && i === result.correctIndex) {
                bc = "var(--success)";
                bg = "var(--success-soft)";
                tc = "var(--success)";
                mark = "check_circle";
                mcol = "var(--success)";
              } else if (i === result.selected) {
                const good = result.correct;
                bc = good ? "var(--success)" : "#E5484D";
                bg = good ? "var(--success-soft)" : "rgba(229,72,77,.1)";
                tc = good ? "var(--success)" : "#E5484D";
                mark = good ? "check_circle" : "cancel";
                mcol = tc;
              } else {
                tc = "var(--text-3)";
              }
            }
            const letter = String.fromCharCode(65 + i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                disabled={done || isPending}
                aria-label={`${letter}: ${o}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 16,
                  border: `2px solid ${bc}`,
                  background: bg,
                  color: tc,
                  cursor: done ? "default" : isPending ? "wait" : "pointer",
                  fontWeight: 600,
                  fontSize: "15.5px",
                  transition: "all .18s ease",
                  textAlign: "left",
                  width: "100%",
                  opacity: isPending && !done ? 0.7 : 1,
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
                    background: mark ? "transparent" : "var(--surface-3)",
                    color: tc,
                    border: `2px solid ${done && mark ? bc : "transparent"}`,
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

        {error && (
          <p
            role="alert"
            style={{ color: "#E5484D", fontSize: 14, fontWeight: 600, margin: "18px 0 0" }}
          >
            {error}
          </p>
        )}

        {done && result && (
          <div
            style={{
              marginTop: 22,
              padding: "14px 18px",
              borderRadius: 14,
              background: result.correct ? "var(--success-soft)" : "var(--surface-2)",
              color: result.correct ? "var(--success)" : "var(--text-2)",
              fontWeight: 600,
              fontSize: 14.5,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name={result.correct ? "celebration" : "school"} size={20} />
            {result.correct
              ? `To'g'ri javob!${result.xpGained > 0 ? ` +${result.xpGained} XP` : ""}`
              : "Bu safar to'g'ri kelmadi — to'g'ri javob yuqorida belgilangan."}
          </div>
        )}
      </div>

      {/* Navigatsiya */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="tap"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            border: "none",
            background: "transparent",
            color: index === 0 ? "var(--text-3)" : "var(--text-2)",
            fontWeight: 600,
            fontSize: 15,
            cursor: index === 0 ? "default" : "pointer",
            padding: "10px 4px",
          }}
        >
          <Icon name="arrow_back" size={20} />
          Oldingi
        </button>

        {isLast ? (
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "15px 28px",
              borderRadius: 14,
              background: "var(--success)",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "15.5px",
              textDecoration: "none",
              boxShadow: "0 12px 26px -12px rgba(15,164,110,.6)",
            }}
          >
            Testni yakunlash
            <Icon name="check_circle" size={20} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "15px 28px",
              borderRadius: 14,
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "15.5px",
              cursor: "pointer",
              boxShadow: "0 12px 26px -12px var(--ring)",
            }}
          >
            Keyingi savol
            <Icon name="arrow_forward" size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
