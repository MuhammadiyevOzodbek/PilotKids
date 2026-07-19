"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { enforceLimit } from "@/lib/rate-limit";
import { themeSchema } from "@/lib/validation";

/** Bildirishnoma sozlamasini DB'ga saqlash. */
export async function setNotificationsEnabled(enabled: boolean) {
  const user = await requireUser();
  await enforceLimit("action", user.id);

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

/** Tema sozlamasini DB'ga saqlash. */
export async function setThemePreference(theme: "light" | "dark") {
  const user = await requireUser();
  await enforceLimit("action", user.id);

  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { ok: false as const, error: "Noto'g'ri tema" };

  await db
    .insert(userSettings)
    .values({ userId: user.id, theme: parsed.data })
    .onConflictDoUpdate({ target: userSettings.userId, set: { theme: parsed.data } });
  return { ok: true as const };
}
