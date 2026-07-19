import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Joriy sessiyani server tomonda o'qish (null bo'lishi mumkin).
 * `cache()` — bitta so'rov ichida necha marta chaqirilsa ham DB'ga bir marta boradi.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Himoyalangan sahifalar uchun — sessiya yo'q bo'lsa /login ga yo'naltiradi. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/**
 * Faqat ota-ona roli uchun. Talab qilingan rolga ega bo'lmasa — dashboard'ga.
 * Rol client'dan emas, DB'dagi sessiyadan o'qiladi (input: false).
 */
export async function requireRole(role: "student" | "parent") {
  const user = await requireUser();
  if ((user as { role?: string }).role !== role) redirect("/dashboard");
  return user;
}
