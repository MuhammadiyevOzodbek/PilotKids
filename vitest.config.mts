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
    /*
     * `.tsx` ham ro'yxatda.
     *
     * Ilgari faqat `.ts` qidirilardi va `*.test.tsx` fayli JIMGINA ishga
     * tushmasdi — hech qanday xato bermasdan. `node` muhitida komponent
     * testi baribir ishlamaydi, lekin noto'g'ri kengaytmali test endi
     * yo'qolib qolmaydi: u ishga tushadi va aniq xato beradi.
     */
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
