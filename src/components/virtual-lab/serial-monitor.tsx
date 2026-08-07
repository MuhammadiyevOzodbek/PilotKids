"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Eraser, Send, TerminalSquare } from "lucide-react";
import type { SerialLogEntry } from "@/lib/virtual-lab/types";

/**
 * Serial Monitor.
 *
 * Loglar soni simulyatorda cheklangan (500 ta), shuning uchun uzoq ishlagan
 * simulyatsiya ham sahifani sekinlashtirmaydi.
 */
export function SerialMonitor({
  logs,
  collapsed,
  onToggle,
  onClear,
  onSend,
}: {
  logs: SerialLogEntry[];
  collapsed: boolean;
  onToggle: () => void;
  onClear: () => void;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Yangi log kelganda pastga tushamiz — foydalanuvchi yuqoriga
  // ko'tarilgan bo'lsa xalaqit bermaymiz.
  useEffect(() => {
    if (!autoScroll || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [logs, autoScroll]);

  return (
    <div className="vlab-panel">
      <div className="vlab-panel-head">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="vlab-panel-title"
          style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
        >
          <TerminalSquare size={15} />
          Serial Monitor
        </button>
        <span className="vlab-count">{logs.length}</span>

        <span className="vlab-spacer" />

        {!collapsed && (
          <>
            <label className="vlab-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Kuzatish
            </label>

            <button
              type="button"
              onClick={() => {
                const text = logs.map((l) => `[${l.at}ms] ${l.text}`).join("\n");
                void navigator.clipboard?.writeText(text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              }}
              className="vlab-tool"
              aria-label="Loglarni nusxalash"
            >
              <Copy size={15} />
              <span className="vlab-tip">{copied ? "Nusxalandi" : "Nusxalash"}</span>
            </button>
            <button type="button" onClick={onClear} className="vlab-tool" aria-label="Tozalash">
              <Eraser size={15} />
              <span className="vlab-tip">Tozalash</span>
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <>
          <div ref={listRef} className="vlab-term">
            {logs.length === 0 ? (
              <p style={{ color: "var(--text-3)", margin: 0 }}>
                Hozircha log yo&apos;q. Simulyatsiyani boshlang yoki <code>Serial.println()</code>{" "}
                ishlating.
              </p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="vlab-term-row">
                  <span className="vlab-term-time">{String(l.at).padStart(6, " ")}ms</span>
                  <span className={`vlab-term-text vlab-term-${l.level}`}>{l.text}</span>
                </div>
              ))
            )}
          </div>

          <form
            className="vlab-term-form"
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text) return;
              onSend(text);
              setInput("");
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Plataga matn yuborish…"
              aria-label="Serial monitorga matn yuborish"
              maxLength={200}
            />
            <button type="submit" className="vlab-term-send" aria-label="Yuborish">
              <Send size={15} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
