"use client";

import { create } from "zustand";
import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

/** Foydalanuvchi tanlovi — "system" localStorage'da saqlanmaydi (default). */
export type Theme = "light" | "dark" | "system";
/** DOM'ga haqiqatda qo'llanadigan tema. */
export type ResolvedTheme = "light" | "dark";

// Qayta eksport — mavjud import qiluvchilar buzilmasligi uchun
export { THEME_STORAGE_KEY };

interface ThemeState {
  /** Foydalanuvchi tanlovi ("system" — hech narsa saqlanmagan holat) */
  theme: Theme;
  /** "system" hozir qanday temaga yechilganini bildiradi */
  resolvedTheme: ResolvedTheme;
  /** DOM va localStorage'ni ham yangilaydi */
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** OS afzalligini o'qiydi (prefers-color-scheme). */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Tanlovni haqiqiy temaga yechadi. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }
  try {
    if (theme === "system") {
      // Saqlanmagan bo'lsa — system rejimida qolamiz
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    /* localStorage bloklangan bo'lishi mumkin — jim o'tamiz */
  }
  return resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Boshlang'ich qiymatlar SSR uchun; mount'da localStorage/DOM'ga sinxronlanadi
  theme: "system",
  resolvedTheme: "dark",
  setTheme: (theme) => {
    const resolvedTheme = applyTheme(theme);
    set({ theme, resolvedTheme });
  },
  toggleTheme: () => {
    // Yechilgan temaga qarab qarama-qarshisiga o'tamiz (endi tanlov saqlanadi)
    const next: ResolvedTheme = get().resolvedTheme === "dark" ? "light" : "dark";
    const resolvedTheme = applyTheme(next);
    set({ theme: next, resolvedTheme });
  },
}));
