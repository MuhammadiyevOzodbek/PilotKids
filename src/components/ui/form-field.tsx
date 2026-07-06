"use client";

import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon?: LucideIcon;
  error?: string;
}

/** Yorliq + ikonka + input; htmlFor/id, autoComplete, fokusda primary halqa. */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, id, icon: Icon, error, className, ...props },
  ref,
) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-foreground/90 text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
            aria-hidden
          />
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "border-input bg-card/50 text-foreground placeholder:text-muted-foreground/70 h-11 w-full rounded-xl border px-3 text-sm transition-colors",
            "focus:border-primary focus:ring-primary/40 focus:ring-2 focus:outline-none",
            Icon && "pl-10",
            error && "border-danger focus:border-danger focus:ring-danger/40",
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
});
