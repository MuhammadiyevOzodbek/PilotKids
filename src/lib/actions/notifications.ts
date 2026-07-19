"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { notification } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { enforceLimit } from "@/lib/rate-limit";
import { uuidSchema } from "@/lib/validation";

/** Bitta bildirishnomani o'qilgan deb belgilash. */
export async function markNotificationRead(id: string) {
  const u = await requireUser();
  await enforceLimit("action", u.id);

  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "Noto'g'ri identifikator" };

  // `userId` sharti — boshqa foydalanuvchi bildirishnomasiga tegib bo'lmaydi.
  await db
    .update(notification)
    .set({ read: true })
    .where(and(eq(notification.id, parsed.data), eq(notification.userId, u.id)));

  // Header (app) layout'da — barcha ilova sahifalari yangilanishi kerak.
  revalidatePath("/(app)", "layout");
  return { ok: true as const };
}

/** Barcha bildirishnomalarni o'qilgan deb belgilash. */
export async function markAllNotificationsRead() {
  const u = await requireUser();
  await enforceLimit("action", u.id);

  await db
    .update(notification)
    .set({ read: true })
    .where(and(eq(notification.userId, u.id), eq(notification.read, false)));

  revalidatePath("/(app)", "layout");
  return { ok: true as const };
}
