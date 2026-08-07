"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth/session";
import { limitGuard } from "@/lib/rate-limit";
import { firstError } from "@/lib/validation";

/** Kunlik ekran vaqti chegarasi — 15 daqiqadan 4 soatgacha. */
const schema = z.object({
  minutes: z
    .number()
    .int("Daqiqa butun son bo'lsin")
    .min(15, "Chegara kamida 15 daqiqa bo'lsin")
    .max(240, "Chegara 4 soatdan oshmasin"),
  password: z.string().min(1, "Parolni kiriting").max(128),
});

/**
 * Kunlik ekran vaqti chegarasini o'zgartirish.
 *
 * Bu ota-ona nazorati sozlamasi, shuning uchun bola uni o'zi ko'tarib
 * yubormasligi kerak — o'zgartirish hisob PAROLINI qayta kiritishni talab
 * qiladi. Parolni odatda ota-ona biladi (hisobni u ochgan).
 */
export async function setDailyLimit(minutes: number, password: string) {
  const user = await requireRole("parent");
  // Parolni taxmin qilishga urinishni cheklaymiz.
  const limited = await limitGuard("action", `parent:${user.id}`);
  if (limited) return limited;

  const parsed = schema.safeParse({ minutes, password });
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) };

  /*
   * Parolni Better Auth orqali tekshiramiz (o'zimiz hash solishtirmaymiz).
   *
   * `verifyPassword` — `signInEmail` EMAS. Kirish endpointi parolni to'g'ri
   * tekshirsa-da, yon ta'siri bor: har chaqiruvda YANGI sessiya yaratadi
   * (jadval o'sib boradi, cookie jimgina almashadi) va `/sign-in/email`
   * uchun ajratilgan urinishlar limitini yeydi — natijada chegarani bir necha
   * marta o'zgartirgan ota-ona o'z hisobiga kira olmay qolishi mumkin edi.
   * `verifyPassword` esa joriy sessiya egasining parolini sessiya
   * yaratmasdan tekshiradi.
   */
  try {
    await auth.api.verifyPassword({
      body: { password: parsed.data.password },
      headers: await headers(),
    });
  } catch {
    return { ok: false as const, error: "Parol noto'g'ri. Ota-onangizdan so'rang." };
  }

  await db
    .insert(userSettings)
    .values({ userId: user.id, dailyLimitMin: parsed.data.minutes })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { dailyLimitMin: parsed.data.minutes },
    });

  revalidatePath("/parent");
  revalidatePath("/settings");
  return { ok: true as const, minutes: parsed.data.minutes };
}
