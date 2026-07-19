"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { enforceLimit } from "@/lib/rate-limit";
import { nameSchema, ageSchema, firstError } from "@/lib/validation";
import { z } from "zod";

const profileSchema = z.object({
  name: nameSchema,
  age: ageSchema,
});

/**
 * Profilni yangilash.
 * Email va rol bu yerda o'zgartirilmaydi — ular auth oqimiga tegishli.
 */
export async function updateProfile(input: { name: string; age: number }) {
  const u = await requireUser();
  await enforceLimit("action", u.id);

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) };

  await db
    .update(user)
    .set({ name: parsed.data.name, age: parsed.data.age, updatedAt: new Date() })
    .where(eq(user.id, u.id));

  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
