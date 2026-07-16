"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";

/** Bildirishnoma sozlamasini DB'ga saqlash. */
export async function setNotificationsEnabled(enabled: boolean) {
  const user = await requireUser();
  await db
    .insert(userSettings)
    .values({ userId: user.id, notificationsEnabled: enabled })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { notificationsEnabled: enabled },
    });
  revalidatePath("/settings");
}

/** Tema sozlamasini DB'ga saqlash. */
export async function setThemePreference(theme: "light" | "dark") {
  const user = await requireUser();
  await db
    .insert(userSettings)
    .values({ userId: user.id, theme })
    .onConflictDoUpdate({ target: userSettings.userId, set: { theme } });
}
