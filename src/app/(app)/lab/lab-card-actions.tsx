"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { setLabProjectStatus } from "@/lib/actions/learning";

/** Lab loyihasini boshlash / tugatish tugmalari. */
export function LabCardActions({
  projectId,
  status,
}: {
  projectId: string;
  status: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(next: "started" | "done") {
    setError(null);
    startTransition(async () => {
      const res = await setLabProjectStatus(projectId, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (status === "done") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: 12,
          background: "var(--success-soft)",
          color: "var(--success)",
          fontWeight: 700,
          fontSize: 13.5,
          width: "100%",
          justifyContent: "center",
        }}
      >
        <Icon name="verified" size={18} color="var(--success)" />
        Tugallandi
      </div>
    );
  }

  const started = status === "started";

  return (
    <div>
      <button
        type="button"
        onClick={() => run(started ? "done" : "started")}
        disabled={isPending}
        style={{
          width: "100%",
          padding: "11px 16px",
          borderRadius: 12,
          border: "none",
          background: started ? "var(--success)" : "var(--primary)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13.5,
          cursor: isPending ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: isPending ? 0.75 : 1,
        }}
      >
        <Icon name={started ? "check_circle" : "play_arrow"} size={18} />
        {isPending ? "Saqlanmoqda…" : started ? "Tugatdim (+60 XP)" : "Loyihani boshlash"}
      </button>
      {error && (
        <p
          role="alert"
          style={{ color: "#E5484D", fontSize: 12.5, fontWeight: 600, margin: "8px 0 0" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
