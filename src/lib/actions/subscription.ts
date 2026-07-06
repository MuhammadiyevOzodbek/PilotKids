"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, notifications, subscriptions } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/courses";

function revalidate() {
  revalidatePath("/subscription");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
}

/**
 * Premium'ga o'tish (to'lov MOCK — Payme/Click keyin ulanadi).
 * Mavjud obuna qatorini yangilaydi yoki yangi yaratadi.
 */
export async function upgradeToPremium(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 kun

    const [existing] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (existing) {
      await db
        .update(subscriptions)
        .set({ plan: "premium", status: "active", startDate: now, endDate: end })
        .where(eq(subscriptions.id, existing.id));
    } else {
      await db.insert(subscriptions).values({
        userId: user.id,
        plan: "premium",
        status: "active",
        startDate: now,
        endDate: end,
      });
    }

    await db.insert(notifications).values({
      userId: user.id,
      message: "Premium obuna faollashtirildi! 🚀 Barcha kurslar endi ochiq.",
    });

    revalidate();
    return { ok: true, message: "Premium obuna faollashtirildi!" };
  } catch (e) {
    console.error("[upgradeToPremium]", e);
    return { ok: false, error: "Obunani faollashtirib bo'lmadi. Qaytadan urinib ko'ring." };
  }
}

/** Premium obunani bekor qilish — Bepul rejaga qaytadi. */
export async function cancelPremium(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [existing] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existing) return { ok: false, error: "Aktiv obuna topilmadi" };

    await db
      .update(subscriptions)
      .set({ plan: "free", status: "active", endDate: null })
      .where(eq(subscriptions.id, existing.id));

    revalidate();
    return { ok: true, message: "Bepul rejaga qaytdingiz" };
  } catch (e) {
    console.error("[cancelPremium]", e);
    return { ok: false, error: "Obunani bekor qilib bo'lmadi. Qaytadan urinib ko'ring." };
  }
}
