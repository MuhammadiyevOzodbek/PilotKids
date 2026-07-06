import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Xato quticha — role="alert" (skrinriderlar darhol o'qiydi). */
export function FormError({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "border-danger/30 bg-danger/10 text-danger flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

/** Muvaffaqiyat quticha — role="status". */
export function FormSuccess({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <CheckCircle2 className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
