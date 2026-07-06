"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { profileSchema } from "@/lib/validations/profile";
import type { ActionResult } from "@/lib/actions/courses";

/**
 * Foydalanuvchi profilini yangilaydi (ism, yosh, avatar havolasi).
 * Server tomonda qayta validatsiya qilinadi — mijoz tekshiruviga ishonmaymiz.
 */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }

  const { name, age, avatarUrl } = parsed.data;

  try {
    await db
      .update(users)
      .set({ name, age, avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { ok: true, message: "Profil yangilandi ✅" };
  } catch (e) {
    console.error("[updateProfile]", e);
    return { ok: false, error: "Profilni saqlab bo'lmadi. Qaytadan urinib ko'ring." };
  }
}
