"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { enrollCourse } from "@/lib/actions/learning";

/** Kursga yozilish / davom ettirish tugmasi. */
export function EnrollButton({
  courseId,
  enrolled,
  continueHref,
}: {
  courseId: string;
  enrolled: boolean;
  continueHref: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const baseStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: 15,
    borderRadius: 14,
    border: "none",
    background: "var(--primary)",
    color: "#fff",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 15.5,
    cursor: isPending ? "wait" : "pointer",
    boxShadow: "0 12px 26px -12px var(--ring)",
    marginBottom: 12,
    textAlign: "center",
    opacity: isPending ? 0.75 : 1,
  };

  function handleClick() {
    setError(null);
    if (enrolled) {
      if (continueHref) router.push(continueHref);
      return;
    }
    startTransition(async () => {
      const res = await enrollCourse(courseId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isPending} style={baseStyle}>
        {isPending
          ? "Yozilmoqda…"
          : enrolled
            ? continueHref
              ? "Kursni davom ettirish"
              : "Kurs tugallandi 🎉"
            : "Kursga yozilish"}
      </button>
      {error && (
        <p
          role="alert"
          style={{ color: "#E5484D", fontSize: 13.5, fontWeight: 600, margin: "0 0 12px" }}
        >
          {error}
        </p>
      )}
      {!enrolled && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--text-3)",
            fontSize: 13,
            fontWeight: 600,
            margin: 0,
          }}
        >
          <Icon name="lock_open" size={16} />
          Bepul · darhol boshlanadi
        </p>
      )}
    </>
  );
}
