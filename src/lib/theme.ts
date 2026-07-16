"use client";

import { create } from "zustand";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = "pilotkids-theme";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "light",
  setTheme: (theme) => {
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === "light" ? "dark" : "light"),
}));

// FOUC'siz boshlang'ich tema — DOM render'idan oldin <html> ga qo'llaymiz.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;
