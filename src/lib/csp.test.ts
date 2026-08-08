import { describe, expect, it } from "vitest";
import { buildCsp, newNonce, NONCE_HEADER } from "@/lib/csp";

/**
 * CSP — xavfsizlik chegarasi, shuning uchun uning shartlari testda qulflanadi.
 *
 * Bu yerdagi har bir tekshiruv «bo'shashtirib yuborish» xavfiga qarshi:
 * siyosatga qo'l tegizilganda, masalan `script-src` ga qaytadan
 * `'unsafe-inline'` yolg'iz o'zi qo'shilib qolsa yoki nonce tushib qolsa,
 * test darhol yiqiladi.
 */

const csp = buildCsp("SINOV_NONCE");
const directive = (name: string) =>
  csp
    .split("; ")
    .find((d) => d.startsWith(name + " "))
    ?.slice(name.length + 1) ?? "";

describe("buildCsp", () => {
  it("script-src nonce va strict-dynamic bilan ishlaydi", () => {
    const scriptSrc = directive("script-src");
    expect(scriptSrc).toContain("'nonce-SINOV_NONCE'");
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it("skript uchun 'self' yoki xost oq ro'yxati yakka o'zi qolmagan", () => {
    // `strict-dynamic` bo'lgani uchun xost ro'yxati baribir e'tiborsiz
    // qoladi — asosiysi nonce bor va u birinchi o'rinda turadi.
    expect(directive("script-src").startsWith("'nonce-")).toBe(true);
  });

  it("inline hodisa atributlari taqiqlangan", () => {
    expect(directive("script-src-attr")).toBe("'none'");
  });

  it("ramka, obyekt va base cheklangan", () => {
    expect(directive("frame-ancestors")).toBe("'none'");
    expect(directive("object-src")).toBe("'none'");
    expect(directive("base-uri")).toBe("'self'");
    expect(directive("form-action")).toBe("'self'");
  });

  it("default-src 'self'", () => {
    expect(directive("default-src")).toBe("'self'");
  });

  it("video faqat ma'lum xostlardan qo'yiladi", () => {
    const frameSrc = directive("frame-src");
    for (const host of [
      "https://oauth.telegram.org",
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
    ]) {
      expect(frameSrc).toContain(host);
    }
    expect(frameSrc).not.toContain("*");
  });

  it("test muhitida 'unsafe-eval' yo'q", () => {
    // Vitest `NODE_ENV=test` bilan ishlaydi, ya'ni dev emas — production
    // bilan bir xil yo'ldan boradi.
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("nonce har safar boshqacha va taxmin qilib bo'lmaydi", () => {
    const values = new Set(Array.from({ length: 200 }, () => newNonce()));
    expect(values.size).toBe(200);
    for (const v of values) expect(v.length).toBeGreaterThanOrEqual(16);
  });

  it("sarlavha nomi o'zgarmagan", () => {
    // `proxy.ts` yozadi, `layout.tsx` o'qiydi — nom bir joyda turishi kerak.
    expect(NONCE_HEADER).toBe("x-nonce");
  });
});
