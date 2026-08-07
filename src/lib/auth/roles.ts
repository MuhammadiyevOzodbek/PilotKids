export const USER_ROLES = ["student", "parent", "admin", "superadmin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Admin panelga (`/admin`) kira oladigan rollar. */
export const ADMIN_ROLES: UserRole[] = ["admin", "superadmin"];

/**
 * Foydalanuvchilarni boshqarish huquqiga ega rollar.
 *
 * better-auth admin plagini shu ro'yxatdagilarga o'z HTTP endpointlarini
 * ochadi (rol berish, parol o'rnatish, impersonatsiya) — shuning uchun bu
 * yerda ataylab faqat bosh admin turadi.
 */
export const SUPER_ADMIN_ROLES: UserRole[] = ["superadmin"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "superadmin";
}
