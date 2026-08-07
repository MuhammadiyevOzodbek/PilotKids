"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserRaw } from "@/lib/auth/session";
import { limitGuard } from "@/lib/rate-limit";
import { onboardingSchema, passwordSchema, firstError } from "@/lib/validation";

/**
 * Onboardingni yakunlash.
 *
 * Google / Telegram / telefon orqali kirgan foydalanuvchida yosh va ota-ona
 * roziligi bo'lmaydi — ular shu yerda so'raladi. `onboarded` faqat shu action
 * orqali `true` bo'ladi, klient uni to'g'ridan-to'g'ri yubora olmaydi
 * (auth konfiguratsiyasida `input: false`).
 */
export async function completeOnboarding(input: { name: string; age: number; consent: boolean }) {
  const u = await requireUserRaw();
  const limited = await limitGuard("action", u.id);
  if (limited) return limited;

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) };

  await db
    .update(user)
    .set({
      name: parsed.data.name,
      age: parsed.data.age,
      parentConsent: true,
      onboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, u.id));

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Telefon bilan ro'yxatdan o'tishning yakuniy qadami.
 *
 * SMS kod tasdiqlanganda better-auth hisobni allaqachon ochib, sessiyani
 * beradi — lekin unda na ism, na yosh, na parol bo'ladi. Formada yig'ilgan
 * shu ma'lumotlar bu yerda saqlanadi.
 *
 * Parol `auth.api.setPassword` orqali qo'yiladi: u faqat serverdan chaqiriladi
 * va parol hali yo'q hisobga ishlaydi. Shundan keyin foydalanuvchi har safar
 * SMS kutmasdan, raqam + parol bilan ham kira oladi.
 */
export async function completePhoneSignup(input: {
  name: string;
  age: number;
  consent: boolean;
  password: string;
}) {
  const u = await requireUserRaw();
  const limited = await limitGuard("action", u.id);
  if (limited) return limited;

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) };

  const parsedPassword = passwordSchema.safeParse(input.password);
  if (!parsedPassword.success) {
    return { ok: false as const, error: firstError(parsedPassword.error) };
  }

  try {
    await auth.api.setPassword({
      body: { newPassword: parsedPassword.data },
      headers: await headers(),
    });
  } catch {
    // Parol o'rnatilmasa ham hisob ochilgan — foydalanuvchini yo'lda
    // qoldirmaymiz, u SMS kod bilan kiraverishi mumkin.
    return {
      ok: false as const,
      error: "Parolni saqlab bo'lmadi. Sozlamalar bo'limidan qayta urinib ko'ring.",
    };
  }

  await db
    .update(user)
    .set({
      name: parsed.data.name,
      age: parsed.data.age,
      parentConsent: true,
      onboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, u.id));

  revalidatePath("/", "layout");
  return { ok: true as const };
}
