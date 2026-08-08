import { describe, expect, it } from "vitest";
import {
  ageSchema,
  chatInputSchema,
  emailSchema,
  firstError,
  loginSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  onboardingSchema,
  otpSchema,
  parseAgeInput,
  phoneSignupSchema,
  quizAnswerSchema,
  signupSchema,
  themeSchema,
} from "@/lib/validation";

/**
 * Xato matnlari foydalanuvchiga ko'rsatiladi, ya'ni ular MAHSULOT matni.
 *
 * Ilgari sxemada matn ko'rsatilmagan holatlar Zod'ning ingliz standartiga
 * tushib ketardi: `/api/auth/sign-up/email` ga `age`siz so'rov yuborilsa
 * javob «Invalid input: expected number, received undefined» bo'lardi. Bu
 * to'plam har bir yo'lda javob o'zbekcha qolishini tekshiradi.
 */

/** Lotin alifbosidagi o'zbekcha matnni ingliz xato matnidan ajratadi. */
const ENGLISH_MARKERS =
  /invalid|expected|received|required|must be|too small|too big|string|number|boolean|unrecognized/i;

function messageOf(result: { success: boolean; error?: unknown }): string {
  expect(result.success).toBe(false);
  return firstError(result.error as Parameters<typeof firstError>[0]);
}

describe("validatsiya matnlari o'zbekcha", () => {
  const cases: [string, () => { success: boolean; error?: unknown }][] = [
    ["yosh yuborilmagan", () => signupSchema.safeParse({ name: "Ali", email: "a@b.uz" })],
    ["yosh bo'sh matn", () => ageSchema.safeParse(parseAgeInput(""))],
    ["yosh matn sifatida", () => ageSchema.safeParse("o'n ikki")],
    ["yosh kasr son", () => ageSchema.safeParse(12.5)],
    ["ism yuborilmagan", () => signupSchema.safeParse({ email: "a@b.uz", age: 12 })],
    ["ism son", () => signupSchema.safeParse({ name: 5, email: "a@b.uz", age: 12 })],
    ["email yuborilmagan", () => signupSchema.safeParse({ name: "Ali", age: 12 })],
    ["parol yuborilmagan", () => signupSchema.safeParse({ name: "Ali", email: "a@b.uz", age: 12 })],
    ["rozilik yo'q", () => signupSchema.safeParse({ name: "Ali", email: "a@b.uz", age: 12 })],
    ["butunlay bo'sh", () => signupSchema.safeParse({})],
    ["obyekt o'rniga matn", () => signupSchema.safeParse("salom")],
    ["telefon yuborilmagan", () => phoneSignupSchema.safeParse({ name: "Ali", age: 12 })],
    ["kod yuborilmagan", () => otpSchema.safeParse(undefined)],
    ["kod noto'g'ri", () => otpSchema.safeParse("12ab")],
    ["kirish bo'sh", () => loginSchema.safeParse({})],
    ["onboarding bo'sh", () => onboardingSchema.safeParse({})],
    ["tema noma'lum", () => themeSchema.safeParse("blue")],
    ["quiz javobi bo'sh", () => quizAnswerSchema.safeParse({})],
    [
      "quiz indeks katta",
      () => quizAnswerSchema.safeParse({ questionId: crypto.randomUUID(), selectedIndex: 99 }),
    ],
    ["chat xabari bo'sh", () => chatInputSchema.safeParse("")],
    ["chat xabari uzun", () => chatInputSchema.safeParse("a".repeat(1001))],
  ];

  for (const [label, run] of cases) {
    it(`${label} → ingliz matni chiqmaydi`, () => {
      const message = messageOf(run());
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(ENGLISH_MARKERS);
    });
  }
});

describe("parseAgeInput", () => {
  it("bo'sh maydonni NaN qiladi — «kamida 5» xatosi chiqmasin", () => {
    expect(Number.isNaN(parseAgeInput(""))).toBe(true);
    expect(Number.isNaN(parseAgeInput("   "))).toBe(true);
    expect(firstError(ageSchema.safeParse(parseAgeInput("")).error!)).toBe("Yoshingizni kiriting");
  });

  it("haqiqiy yoshni o'zgartirmaydi", () => {
    expect(parseAgeInput("12")).toBe(12);
    expect(ageSchema.safeParse(parseAgeInput("12")).success).toBe(true);
  });
});

describe("bo'sh maydon va noto'g'ri qiymat farqlanadi", () => {
  /*
   * Ilgari bo'sh forma «Ism kamida 2 harf bo'lsin» derdi — foydalanuvchi
   * hech narsa yozmagan bo'lsa ham, javob uzunlik haqida edi. Bu ikki holat
   * har xil xabar berishi kerak.
   */
  const CASES: [string, () => { success: boolean; error?: unknown }, string][] = [
    ["ism bo'sh", () => nameSchema.safeParse(""), "Ismingizni kiriting"],
    ["ism qisqa", () => nameSchema.safeParse("A"), "Ism kamida 2 harf bo'lsin"],
    ["email bo'sh", () => emailSchema.safeParse(""), "Email manzilni kiriting"],
    ["email noto'g'ri", () => emailSchema.safeParse("xx"), "Email manzil noto'g'ri"],
    ["parol bo'sh", () => passwordSchema.safeParse(""), "Parolni kiriting"],
    [
      "parol qisqa",
      () => passwordSchema.safeParse("12345"),
      "Parol kamida 8 belgidan iborat bo'lsin",
    ],
    ["telefon bo'sh", () => phoneSchema.safeParse(""), "Telefon raqamini kiriting"],
    [
      "telefon noto'g'ri",
      () => phoneSchema.safeParse("+99890"),
      "Raqamni +998 XX XXX XX XX ko'rinishida kiriting",
    ],
  ];

  for (const [label, run, expected] of CASES) {
    it(`${label} → «${expected}»`, () => {
      expect(messageOf(run())).toBe(expected);
    });
  }
});

describe("aniq matnlar saqlanadi", () => {
  it("chegara xatolari o'z matnini beradi", () => {
    expect(firstError(ageSchema.safeParse(3).error!)).toBe("Yosh kamida 5 bo'lsin");
    expect(firstError(ageSchema.safeParse(25).error!)).toBe(
      "PilotKids 18 yoshgacha bo'lgan o'quvchilar uchun",
    );
  });

  it("to'g'ri ma'lumot o'tadi", () => {
    expect(
      signupSchema.safeParse({
        name: "Ali",
        email: "ALI@Misol.uz",
        age: 12,
        password: "Parol1234",
        consent: true,
      }).success,
    ).toBe(true);
  });
});
