"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/** Yorug'/qorong'u tema o'tkazgichi (☀/☾). Tanlov localStorage'da saqlanadi. */
export function ThemeToggle({ className }: { className?: string }) {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  // Server/mijoz ikonasi mos kelmasligining oldini olamiz (hydration)
  const mounted = useMounted();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Yorug' temaga o'tish" : "Qorong'u temaga o'tish"}
      className={cn(
        "glass relative inline-flex size-10 items-center justify-center rounded-xl",
        "text-foreground/80 hover:text-foreground transition-colors",
        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5" aria-hidden />
        ) : (
          <Moon className="size-5" aria-hidden />
        )
      ) : (
        <span className="size-5" aria-hidden />
      )}
    </button>
  );
}
