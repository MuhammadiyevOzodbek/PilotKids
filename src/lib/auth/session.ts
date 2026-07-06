import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Joriy so'rov uchun serverdagi sessiyani qaytaradi (bir so'rovda keshlanadi). */
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Foydalanuvchi kirmagan bo'lsa /login ga yo'naltiradi va foydalanuvchini
 * qaytaradi. Himoyalangan sahifalar/serverda ishlatiladi (proxy'ga
 * qo'shimcha — sessiya server'da ham tekshiriladi).
 */
export async function requireUser() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session.user;
}
