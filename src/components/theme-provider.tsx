"use client";

import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

/** Init-skript qo'ygan `.dark` klassini store bilan birinchi renderdan keyin sinxronlaydi. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setThemeState = useTheme((s) => s.setTheme);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
