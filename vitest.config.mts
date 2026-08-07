import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest — virtual laboratoriya yadrosi uchun testlar.
 *
 * Faqat sof mantiq sinaladi (parser, simulyator, validator, dars tekshiruvi,
 * store va import/eksport): ular brauzersiz ishlaydi, shuning uchun `node`
 * muhiti yetarli va testlar tez o'tadi.
 *
 * `@` aliasi `tsconfig.json` dagi `paths` bilan bir xil bo'lishi shart —
 * aks holda test fayllari ilova modullarini topa olmaydi.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
