import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Joriy sessiyani server tomonda o'qish (null bo'lishi mumkin). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Himoyalangan sahifalar uchun — sessiya yo'q bo'lsa /login ga yo'naltiradi. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
