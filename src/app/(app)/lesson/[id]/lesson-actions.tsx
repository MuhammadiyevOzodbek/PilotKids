"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { completeLesson, saveLessonNote } from "@/lib/actions/learning";

/** "Bajarildi" tugmasi — XP serverda beriladi. */
export function CompleteButton({
  lessonId,
  isDone,
  xpReward,
  nextLessonId,
}: {
  lessonId: string;
  isDone: boolean;
  xpReward: number;
  nextLessonId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  function handle() {
    if (isDone || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await completeLesson(lessonId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCelebrate(
        res.courseFinished
          ? "Kursni tamomladingiz! Sertifikatingiz tayyor 🏆"
          : res.leveledUp
            ? `Ajoyib! +${res.xpGained} XP va yangi daraja 🎉`
            : `Dars tugallandi! +${res.xpGained} XP ⚡`,
      );
      router.refresh();
    });
  }

  if (isDone) {
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "15px 26px",
            borderRadius: 14,
            background: "var(--success-soft)",
            color: "var(--success)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "15.5px",
          }}
        >
          <Icon name="check_circle" size={21} />
          Bu dars tugallangan
        </span>
        {nextLessonId && (
          <button
            type="button"
            onClick={() => router.push(`/lesson/${nextLessonId}`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "15px 24px",
              borderRadius: 14,
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "15.5px",
              cursor: "pointer",
            }}
          >
            Keyingi dars
            <Icon name="arrow_forward" size={20} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={isPending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          padding: "15px 26px",
          borderRadius: 14,
          border: "none",
          background: "var(--success)",
          color: "#fff",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "15.5px",
          cursor: isPending ? "wait" : "pointer",
          boxShadow: "0 12px 28px -12px rgba(15,164,110,.6)",
          opacity: isPending ? 0.75 : 1,
        }}
      >
        <Icon name="check_circle" size={21} />
        {isPending ? "Saqlanmoqda…" : `Bajarildi deb belgilash (+${xpReward} XP)`}
      </button>
      {celebrate && (
        <p
          role="status"
          style={{ color: "var(--success)", fontWeight: 700, fontSize: 14.5, margin: "14px 0 0" }}
        >
          {celebrate}
        </p>
      )}
      {error && (
        <p
          role="alert"
          style={{ color: "#E5484D", fontWeight: 600, fontSize: 14, margin: "14px 0 0" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Shaxsiy eslatma — DB'ga saqlanadi. */
export function LessonNote({ lessonId, initial }: { lessonId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dirty = value !== initial;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveLessonNote(lessonId, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        maxLength={2000}
        rows={4}
        placeholder="Bu darsdan nimani eslab qolmoqchisiz?"
        aria-label="Dars eslatmasi"
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 14,
          background: "var(--surface-2)",
          color: "var(--text)",
          fontSize: "13.5px",
          lineHeight: 1.6,
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--primary)",
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || isPending}
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            background: dirty ? "var(--primary)" : "var(--surface-3)",
            color: dirty ? "#fff" : "var(--text-3)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: dirty && !isPending ? "pointer" : "default",
          }}
        >
          {isPending ? "Saqlanmoqda…" : "Saqlash"}
        </button>
        {saved && (
          <span
            role="status"
            style={{
              color: "var(--success)",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon name="check" size={16} color="var(--success)" />
            Saqlandi
          </span>
        )}
        {error && <span style={{ color: "#E5484D", fontSize: 13, fontWeight: 600 }}>{error}</span>}
      </div>
    </div>
  );
}
