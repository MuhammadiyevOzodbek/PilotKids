"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: string;
  id: string;
  error?: string;
}

/** Parol maydoni — ko'rsat/yashir (Eye) tugmasi bilan. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, id, error, className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-foreground/90 text-sm font-medium">
          {label}
        </label>
        <div className="relative">
          <Lock
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
            aria-hidden
          />
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            className={cn(
              "border-input bg-card/50 text-foreground placeholder:text-muted-foreground/70 h-11 w-full rounded-xl border px-3 pr-11 pl-10 text-sm transition-colors",
              "focus:border-primary focus:ring-primary/40 focus:ring-2 focus:outline-none",
              error && "border-danger focus:border-danger focus:ring-danger/40",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
            aria-pressed={visible}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-primary absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {visible ? (
              <EyeOff className="size-4.5" aria-hidden />
            ) : (
              <Eye className="size-4.5" aria-hidden />
            )}
          </button>
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-danger text-xs">
            {error}
          </p>
        )}
      </div>
    );
  },
);
