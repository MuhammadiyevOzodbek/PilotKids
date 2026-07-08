import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

/**
 * <head> ga inline joylashtiriladigan skript — DOM render qilinishidan OLDIN
 * temani <html> ga qo'llaydi. Bu FOUC (miltillash)ning oldini oladi.
 * Saqlangan tanlov bo'lsa uni, aks holda OS afzalligini ishlatadi.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var isDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;
