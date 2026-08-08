"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { limitGuard } from "@/lib/rate-limit";

/** Bildirishnoma sozlamasini DB'ga saqlash. */
export async function setNotificationsEnabled(enabled: boolean) {
  const user = await requireUser();
  const limited = await limitGuard("action", user.id);
  if (limited) return limited;

  const parsed = z.boolean().safeParse(enabled);
  if (!parsed.success) return { ok: false as const, error: "Noto'g'ri qiymat" };

  await db
    .insert(userSettings)
    .values({ userId: user.id, notificationsEnabled: parsed.data })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { notificationsEnabled: parsed.data },
    });
  revalidatePath("/settings");
  return { ok: true as const };
}

/*
 * `setThemePreference` OLIB TASHLANDI.
 *
 * U hech qayerdan chaqirilmasdi — tema `ThemeProvider` orqali
 * `localStorage` da saqlanadi. Ammo `"use server"` faylidagi har bir
 * eksport Next.js'da doimiy, tashqaridan chaqirilishi mumkin bo'lgan
 * HTTP endpoint hosil qiladi. Ya'ni tugmasi yo'q amal ham hujum sathida
 * qolib ketardi.
 *
 * Tema DB'da ham saqlanishi kerak bo'lsa, avval uni chaqiradigan
 * interfeys yozilsin — keyin bu action qaytariladi.
 */
