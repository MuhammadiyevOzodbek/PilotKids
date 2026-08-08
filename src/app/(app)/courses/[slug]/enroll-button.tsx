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
  lessonCount,
}: {
  courseId: string;
  enrolled: boolean;
  continueHref: string | null;
  /** Kursdagi darslar soni — 0 bo'lsa kurs «tugallandi» emas, hali tayyor emas. */
  lessonCount: number;
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
    color: "var(--on-primary)",
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
      {/* Yozilgan, lekin boradigan darsi yo'q — tugma bosilsa hech nima
          bo'lmaydi, shuning uchun uni o'chirib qo'yamiz. */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || (enrolled && !continueHref)}
        style={baseStyle}
      >
        {isPending
          ? "Yozilmoqda…"
          : enrolled
            ? continueHref
              ? "Kursni davom ettirish"
              : /*
                 * Keyingi dars yo'qligi ikki xil ma'noni anglatishi mumkin edi:
                 * hammasi tugatilgan yoki kursda umuman dars yo'q. Ilgari
                 * ikkalasi ham «Kurs tugallandi 🎉» deb ko'rsatilardi — bo'sh
                 * kursga yozilgan bola darrov tabrik olardi.
                 */
                lessonCount > 0
                ? "Kurs tugallandi 🎉"
                : "Darslar tayyorlanmoqda"
            : "Kursga yozilish"}
      </button>
      {error && (
        <p
          role="alert"
          style={{ color: "var(--danger)", fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}
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
            fontSize: 14.5,
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
