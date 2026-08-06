import { z } from "zod";

/**
 * Umumiy validatsiya sxemalari.
 * Server action'lar HTTP endpoint bo'lgani uchun TypeScript tiplari runtime'da
 * yo'qoladi — har bir kirish shu yerda qayta tekshiriladi.
 */

export const uuidSchema = z.string().uuid("Noto'g'ri identifikator");

export const userIdSchema = z
  .string()
  .trim()
  .min(1, "Noto'g'ri foydalanuvchi")
  .max(128, "Noto'g'ri foydalanuvchi")
  .regex(/^[A-Za-z0-9_-]+$/, "Noto'g'ri foydalanuvchi");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Ism kamida 2 harf bo'lsin")
  .max(60, "Ism juda uzun")
  // Raqam va maxsus belgilarsiz — bolalar platformasi uchun toza ismlar.
  .regex(/^[\p{L}\s'’-]+$/u, "Ismda faqat harflar bo'lsin");

export const emailSchema = z.string().trim().toLowerCase().email("Email manzil noto'g'ri").max(254);

/** Zaif/keng tarqalgan parollar — ro'yxatdan o'tishda rad etiladi. */
const WEAK_PASSWORDS = new Set([
  "password",
  "parol123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "11111111",
  "00000000",
  "iloveyou",
  "admin123",
  "pilotkids",
  "abc12345",
  "password1",
  "letmein1",
]);

export const passwordSchema = z
  .string()
  .min(8, "Parol kamida 8 belgidan iborat bo'lsin")
  .max(128, "Parol juda uzun")
  .refine((p) => /[a-zA-Z]/.test(p), "Parolda kamida bitta harf bo'lsin")
  .refine((p) => /[0-9]/.test(p), "Parolda kamida bitta raqam bo'lsin")
  .refine((p) => !WEAK_PASSWORDS.has(p.toLowerCase()), "Bu parol juda oson topiladi");

export const ageSchema = z
  .number()
  .int("Yosh butun son bo'lsin")
  .min(5, "Yosh kamida 5 bo'lsin")
  .max(18, "PilotKids 18 yoshgacha bo'lgan o'quvchilar uchun");

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  age: ageSchema,
  password: passwordSchema,
  consent: z.literal(true, { message: "Ota-ona roziligi talab qilinadi" }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Parolni kiriting").max(128),
});

/** O'zbekiston telefon raqami: +998 va 9 ta raqam. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^\+998\d{9}$/.test(v), "Raqamni +998 XX XXX XX XX ko'rinishida kiriting");

/**
 * Telefon bilan ro'yxatdan o'tish.
 *
 * `signupSchema` bilan bir xil, faqat email o'rniga raqam. Parol shu yerda ham
 * majburiy: SMS kod hisobni ochadi, parol esa keyinchalik SMS'siz (raqam+parol)
 * kirish imkonini beradi.
 */
export const phoneSignupSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  age: ageSchema,
  password: passwordSchema,
  consent: z.literal(true, { message: "Ota-ona roziligi talab qilinadi" }),
});

/** SMS/email orqali keladigan bir martalik kod. */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Kod 6 ta raqamdan iborat");

/** Onboarding — OAuth/telefon orqali kelgan foydalanuvchidan so'raladi. */
export const onboardingSchema = z.object({
  name: nameSchema,
  age: ageSchema,
  consent: z.literal(true, { message: "Ota-ona roziligi talab qilinadi" }),
});

/** AI chatga yuborilayotgan xabar. */
export const chatInputSchema = z
  .string()
  .trim()
  .min(1, "Xabar bo'sh bo'lmasin")
  .max(1000, "Xabar juda uzun (1000 belgidan kam bo'lsin)");

export const themeSchema = z.enum(["light", "dark"]);

export const noteSchema = z.string().trim().max(2000, "Eslatma juda uzun");

/** Quiz javobi. */
export const quizAnswerSchema = z.object({
  questionId: uuidSchema,
  selectedIndex: z.number().int().min(0).max(9),
});

/** Zod xatosini foydalanuvchiga ko'rsatiladigan bitta matnga aylantiradi. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Ma'lumot noto'g'ri";
}

/** Action'lar uchun umumiy natija turi. */
export type ActionResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
