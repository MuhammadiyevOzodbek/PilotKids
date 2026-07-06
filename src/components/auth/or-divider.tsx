import { cn } from "@/lib/utils";

/** O'rtada "yoki" yozuvli chiziq. */
export function OrDivider({ label = "yoki", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)} role="separator" aria-hidden>
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
