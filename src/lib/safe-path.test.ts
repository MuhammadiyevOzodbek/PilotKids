import { describe, expect, it } from "vitest";
import { DEFAULT_LANDING, safeInternalPath } from "@/lib/safe-path";

/**
 * Ochiq yo'naltirishga qarshi regressiya.
 *
 * Har bir qator — haqiqiy chetlab o'tish usuli. Ilgari `startsWith("/")` va
 * `!startsWith("//")` tekshiruvi ishlatilardi va quyidagi to'rt holat undan
 * o'tib, foydalanuvchini `http://evil.com/` ga olib chiqardi.
 */

const EXTERNAL = [
  "//evil.com",
  "//evil.com/yo'l",
  "/\\evil.com",
  "/\\/evil.com",
  "/\\\\evil.com",
  "/\t/evil.com",
  "/\n/evil.com",
  "/\r/evil.com",
  "/ /evil.com",
  "https://evil.com",
  "http://evil.com",
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "mailto:a@b.uz",
  "evil.com",
  "\\\\evil.com",
  "",
];

describe("safeInternalPath tashqi manzilni rad etadi", () => {
  for (const value of EXTERNAL) {
    it(`${JSON.stringify(value)} → ${DEFAULT_LANDING}`, () => {
      expect(safeInternalPath(value)).toBe(DEFAULT_LANDING);
    });
  }

  it("null va undefined ham zaxira manzilga tushadi", () => {
    expect(safeInternalPath(null)).toBe(DEFAULT_LANDING);
    expect(safeInternalPath(undefined)).toBe(DEFAULT_LANDING);
  });

  it("natija hech qachon tashqi origin bermaydi", () => {
    for (const value of EXTERNAL) {
      const result = safeInternalPath(value);
      expect(new URL(result, "http://pilotkids.uz").origin).toBe("http://pilotkids.uz");
    }
  });
});

describe("safeInternalPath ichki yo'lni saqlaydi", () => {
  const INTERNAL: [string, string][] = [
    ["/dashboard", "/dashboard"],
    ["/lesson/9f1b2c3d", "/lesson/9f1b2c3d"],
    ["/courses?q=arduino", "/courses?q=arduino"],
    ["/maxfiylik#cookie", "/maxfiylik#cookie"],
    ["/lab/onlayn?kind=1#bo'lim", "/lab/onlayn?kind=1#bo'lim"],
    ["/", "/"],
    // Nuqtali yo'l normallashtiriladi, lekin ichki bo'lib qoladi.
    ["/a/../dashboard", "/dashboard"],
  ];

  for (const [input, expected] of INTERNAL) {
    it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(safeInternalPath(input)).toBe(expected);
    });
  }

  it("boshqa zaxira manzil berish mumkin", () => {
    expect(safeInternalPath("//evil.com", "/login")).toBe("/login");
  });
});
