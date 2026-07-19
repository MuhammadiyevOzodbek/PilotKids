"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth/session";
import { enforceLimit } from "@/lib/rate-limit";
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
  const user = await requireUser();
  // Parolni taxmin qilishga urinishni cheklaymiz.
  await enforceLimit("action", `parent:${user.id}`);

  const parsed = schema.safeParse({ minutes, password });
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) };

  // Parolni Better Auth orqali tekshiramiz (o'zimiz hash solishtirmaymiz).
  try {
    await auth.api.signInEmail({
      body: { email: user.email, password: parsed.data.password },
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
