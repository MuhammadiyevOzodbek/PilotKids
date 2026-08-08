"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Code2, Cpu, TriangleAlert, X, Zap } from "lucide-react";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import type { Circuit, CircuitIssue, CodeError } from "@/lib/virtual-lab/types";

/**
 * Muammolar ro'yxati.
 *
 * Ilgari yuqorida faqat «1 xato» degan raqam turardi va uni bosib
 * bo'lmasdi — bola nima noto'g'ri ekanini bilolmasdi. Endi nishon
 * bosiladi va shu ro'yxat ochiladi: har bir muammoning sababi, nima
 * qilish kerakligi va qaysi komponentga tegishli ekani ko'rinadi.
 *
 * Uch manba birlashtiriladi:
 *   • sxema tekshiruvi (ulanish, polarite, qisqa tutashuv);
 *   • kod tahlili (sintaksis xatolari, qator raqami bilan);
 *   • simulyatsiyani to'xtatgan xatolar.
 */

export interface ProblemsPanelProps {
  circuit: Circuit;
  issues: CircuitIssue[];
  codeErrors: CodeError[];
  simErrors: string[];
  onClose: () => void;
  /** Muammoli komponentni sxemada ajratib ko'rsatish. */
  onSelectNodes: (ids: string[]) => void;
  /** Koddagi qatorga o'tish. */
  onGoToLine: (line: number) => void;
}

export function ProblemsPanel({
  circuit,
  issues,
  codeErrors,
  simErrors,
  onClose,
  onSelectNodes,
  onGoToLine,
}: ProblemsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Tashqariga bosilganda yoki Esc bosilganda yopiladi.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // `mousedown` emas, `click`: nishonning o'z bosilishi bilan to'qnashmasin.
    window.addEventListener("click", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const nameOf = (nodeId: string) => {
    const node = circuit.nodes.find((n) => n.id === nodeId);
    return node ? (getDefinition(node.type)?.name ?? node.type) : null;
  };

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const total = errors.length + warnings.length + codeErrors.length + simErrors.length;

  return (
    <div className="vlab-problems" ref={ref} role="dialog" aria-label="Muammolar ro'yxati">
      <div className="vlab-problems-head">
        <TriangleAlert size={15} />
        <strong>Muammolar</strong>
        <span className="vlab-count">{total}</span>
        <span className="vlab-spacer" />
        <button type="button" className="vlab-tool" onClick={onClose} aria-label="Yopish">
          <X size={15} />
        </button>
      </div>

      <div className="vlab-problems-body">
        {total === 0 && (
          <p className="vlab-empty" style={{ padding: "18px 12px" }}>
            Muammo yo&apos;q — sxema ham, kod ham toza.
          </p>
        )}

        {/* Simulyatsiyani to'xtatgan xato — eng muhimi, shuning uchun tepada. */}
        {simErrors.map((text, i) => (
          <div key={`sim-${i}`} className="vlab-problem" data-severity="error">
            <span className="vlab-problem-icon">
              <Cpu size={14} />
            </span>
            <span>
              <strong>{text}</strong>
              <span className="vlab-problem-hint">
                Simulyatsiya shu sabab to&apos;xtadi. Kodni tuzatib qayta ishga tushiring.
              </span>
            </span>
          </div>
        ))}

        {codeErrors.map((err, i) => (
          <button
            key={`code-${i}`}
            type="button"
            className="vlab-problem"
            data-severity="error"
            onClick={() => {
              onGoToLine(err.line);
              onClose();
            }}
          >
            <span className="vlab-problem-icon">
              <Code2 size={14} />
            </span>
            <span>
              <strong>
                {err.line}-qator: {err.message}
              </strong>
              <span className="vlab-problem-hint">{err.hint}</span>
            </span>
          </button>
        ))}

        {[...errors, ...warnings].map((issue) => {
          const names = issue.nodeIds.map(nameOf).filter((n): n is string => n !== null);
          return (
            <button
              key={issue.id}
              type="button"
              className="vlab-problem"
              data-severity={issue.severity}
              onClick={() => {
                if (issue.nodeIds.length > 0) onSelectNodes(issue.nodeIds);
                onClose();
              }}
            >
              <span className="vlab-problem-icon">
                {issue.severity === "error" ? <Zap size={14} /> : <AlertTriangle size={14} />}
              </span>
              <span>
                <strong>{issue.message}</strong>
                <span className="vlab-problem-hint">{issue.hint}</span>
                {names.length > 0 && (
                  <span className="vlab-problem-where">
                    {names.join(", ")} — bosing va ko&apos;ring
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
