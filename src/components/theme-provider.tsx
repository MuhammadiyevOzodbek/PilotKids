"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useThemeStore, THEME_STORAGE_KEY, type Theme } from "@/store/useThemeStore";

/**
 * Mount'da localStorage'dagi tanlovni o'qib Zustand store'ni sinxronlaydi.
 * Saqlangan qiymat bo'lmasa — "system" rejimida OS afzalligiga ergashadi va
 * OS temasi o'zgarsa jonli yangilanadi. Boshqa tab'dagi o'zgarishlarni ham tinglaydi.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* localStorage bloklangan — system'ga tushamiz */
    }
    // Saqlanmagan bo'lsa "system"
    const theme: Theme = stored === "dark" || stored === "light" ? stored : "system";
    useThemeStore.getState().setTheme(theme);

    // OS temasi o'zgarganda — faqat "system" rejimida qayta yechamiz
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (useThemeStore.getState().theme === "system") {
        useThemeStore.getState().setTheme("system");
      }
    };
    mql.addEventListener("change", onSystemChange);

    // Boshqa tab localStorage'ni o'zgartirsa
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next: Theme = e.newValue === "dark" || e.newValue === "light" ? e.newValue : "system";
      useThemeStore.getState().setTheme(next);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mql.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // reducedMotion="user" — prefers-reduced-motion yoqilganda Framer
  // animatsiyalari avtomatik o'chadi (a11y talab)
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
