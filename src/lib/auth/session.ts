import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { isAdminRole, isSuperAdminRole, type UserRole } from "@/lib/auth/roles";

/** Sessiyadagi foydalanuvchi + PilotKids maydonlari. */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: UserRole | string;
  onboarded?: boolean;
  age?: number | null;
  banned?: boolean | null;
  phoneNumber?: string | null;
};

/**
 * Joriy sessiyani server tomonda o'qish (null bo'lishi mumkin).
 * `cache()` — bitta so'rov ichida necha marta chaqirilsa ham DB'ga bir marta boradi.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Himoyalangan sahifalar uchun — sessiya yo'q bo'lsa /login ga yo'naltiradi.
 *
 * Onboarding tugallanmagan bo'lsa (Google/Telegram/telefon orqali kelgan yangi
 * foydalanuvchi) `/welcome` ga yuboriladi: yosh va ota-ona roziligisiz ilova
 * sahifalari ochilmaydi.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");

  const sessionUser = session.user as unknown as SessionUser;
  const access = await getAccessFromDb(sessionUser.id);
  if (!access) redirect("/login");
  if (access.banned) redirect("/bloklangan");
  if (!access.onboarded) redirect("/welcome");
  return { ...sessionUser, ...access };
}

/** Onboarding sahifasining o'zi uchun — `onboarded` tekshiruvisiz. */
export async function requireUserRaw(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  const sessionUser = session.user as unknown as SessionUser;
  const access = await getAccessFromDb(sessionUser.id);
  if (!access) redirect("/login");
  if (access.banned) redirect("/bloklangan");
  return { ...sessionUser, ...access };
}

/**
 * Faqat ota-ona roli uchun. Talab qilingan rolga ega bo'lmasa — dashboard'ga.
 * Rol client'dan emas, DB'dagi sessiyadan o'qiladi (input: false).
 */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const sessionUser = await requireUser();
  const dbRole = await getRoleFromDb(sessionUser.id);
  if (dbRole !== role) redirect("/dashboard");
  return { ...sessionUser, role: dbRole };
}

/**
 * Rolni MA'LUMOTLAR BAZASIDAN o'qiydi, sessiya cookie'sidan emas.
 *
 * Sessiya cookie'da 5 daqiqa keshlanadi (`cookieCache`). Oddiy sahifalar uchun
 * bu yaxshi, ammo admin huquqi uchun xavfli: rolni olib tashlaganingizdan
 * keyin ham odam yana 5 daqiqa panelda qolib ketardi. Shuning uchun bu yerda
 * har safar DB'ga boramiz — `cache()` tufayli bitta so'rov ichida bir marta.
 */
const getAccessFromDb = cache(
  async (
    userId: string,
  ): Promise<{ role: string; banned: boolean; onboarded: boolean; age: number | null } | null> => {
    const rows = await db
      .select({
        role: user.role,
        banned: user.banned,
        onboarded: user.onboarded,
        age: user.age,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return rows[0] ?? null;
  },
);

/** Route handlerlar uchun joriy DB access holatini redirect qilmasdan olish. */
export async function getUserAccess(userId: string) {
  return getAccessFromDb(userId);
}

const getRoleFromDb = cache(async (userId: string): Promise<string | null> => {
  return (await getAccessFromDb(userId))?.role ?? null;
});

/**
 * Admin panel uchun. Admin bo'lmagan foydalanuvchi panel borligini bilmasin —
 * 404 emas, dashboard'ga jim yo'naltiramiz.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");

  const sessionUser = session.user as unknown as SessionUser;
  const access = await getAccessFromDb(sessionUser.id);
  if (!access) redirect("/login");
  if (access.banned) redirect("/bloklangan");
  if (!access.onboarded) redirect("/welcome");
  if (!isAdminRole(access.role)) redirect("/dashboard");

  return { ...sessionUser, ...access };
}

/** Bosh admin paneli va eng xavfli mutatsiyalar uchun. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");

  const sessionUser = session.user as unknown as SessionUser;
  const access = await getAccessFromDb(sessionUser.id);
  if (!access) redirect("/login");
  if (access.banned) redirect("/bloklangan");
  if (!access.onboarded) redirect("/welcome");
  if (!isSuperAdminRole(access.role)) redirect("/admin");

  return { ...sessionUser, ...access };
}

/** Foydalanuvchi admin ekanini tekshirish (yo'naltirishsiz). */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  const sessionUser = session?.user as unknown as SessionUser | undefined;
  if (!sessionUser) return false;
  return isAdminRole(await getRoleFromDb(sessionUser.id));
}

/** Foydalanuvchi bosh admin ekanini tekshirish (yo'naltirishsiz). */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  const sessionUser = session?.user as unknown as SessionUser | undefined;
  if (!sessionUser) return false;
  return isSuperAdminRole(await getRoleFromDb(sessionUser.id));
}
