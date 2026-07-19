"use client";

import { useState, useEffect, useRef, useOptimistic, useTransition } from "react";
import { Icon } from "@/components/icon";
import { sendChatMessage } from "@/lib/actions/chat";
import { quickChips } from "@/lib/data";

export type ChatMsg = { id?: string; role: string; text: string };

export function TutorChat({ initial }: { initial: ChatMsg[] }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  // useOptimistic — foydalanuvchi xabari darhol ko'rinadi; server javob berib
  // revalidate qilgach ro'yxat avtomatik `initial` bilan yangilanadi (bot javobi bilan).
  const [messages, addOptimistic] = useOptimistic<ChatMsg[], ChatMsg>(initial, (state, msg) => [
    ...state,
    msg,
  ]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || isPending) return;
    setInput("");
    setError(null);
    startTransition(async () => {
      addOptimistic({ role: "me", text: clean });
      const res = await sendChatMessage(clean);
      // Rate limit yoki validatsiya xatosi — foydalanuvchiga ko'rsatamiz va
      // yozgan matnini qaytarib beramiz, aks holda u yo'qolib ketardi.
      if (!res.ok) {
        setError(res.error);
        setInput(clean);
      }
    });
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 26,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", padding: "20px 10px" }}>
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Icon name="smart_toy" size={34} color="#fff" />
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 19,
                margin: "0 0 8px",
                color: "var(--text)",
              }}
            >
              Salom! Men Robo 👋
            </h2>
            <p
              style={{
                color: "var(--text-2)",
                fontSize: 14.5,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 340,
              }}
            >
              Robototexnika, Arduino, sensorlar yoki dasturlash bo&apos;yicha istalgan savolingizni
              bering. Quyidagi tayyor savollardan ham boshlashingiz mumkin.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const isBot = m.role === "bot";
          return (
            <div
              key={m.id ?? i}
              style={{
                display: "flex",
                gap: 11,
                alignItems: "flex-end",
                width: "100%",
                justifyContent: isBot ? "flex-start" : "flex-end",
              }}
            >
              {isBot && (
                <span
                  style={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#2F6BF3,#5b8cff)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon name="smart_toy" size={20} color="#fff" />
                </span>
              )}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 18,
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  maxWidth: "78%",
                  wordBreak: "break-word",
                  ...(isBot
                    ? {
                        background: "var(--surface-2)",
                        color: "var(--text)",
                        borderBottomLeftRadius: 5,
                      }
                    : { background: "var(--primary)", color: "#fff", borderBottomRightRadius: 5 }),
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)" }}>
        {error && (
          <p
            role="alert"
            style={{
              color: "#E5484D",
              background: "rgba(229,72,77,.08)",
              border: "1px solid rgba(229,72,77,.25)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13.5,
              fontWeight: 600,
              margin: "0 0 12px",
            }}
          >
            {error}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 9,
            marginBottom: 14,
            flexWrap: "nowrap",
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          {quickChips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => send(c)}
              className="hover-primary tap"
              style={{
                padding: "8px 14px",
                borderRadius: 99,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-2)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "6px 6px 6px 18px",
          }}
        >
          <input
            className="field tap"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Robo'dan istalgan narsani so'rang…"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: 15,
              outline: "none",
              padding: "10px 0",
            }}
          />
          <button
            type="submit"
            disabled={isPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              cursor: isPending ? "wait" : "pointer",
              display: "grid",
              placeItems: "center",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            <Icon name="send" size={22} />
          </button>
        </form>
      </div>
    </div>
  );
}
