import "server-only";

import { cache } from "react";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notification, session, superadminAuditLog, user } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/session";
import type {
  AdminLevel,
  AdminRow,
  AuditRow,
  Capability,
  MetricCard,
  PayoutRow,
  PlanRow,
  RegionRow,
  ReportRow,
  RevenuePoint,
  ServiceRow,
  SessionRow,
  SettingGroup,
  StreamEvent,
  ThreatRow,
} from "./types";

function fmt(n: number) {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

function clock(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function dateLabel(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function adminLevel(role: string): AdminLevel {
  return role === "superadmin" ? "root" : "admin";
}

/**
 * Baza javob vaqtini o'lchash.
 *
 * MUHIM: bu funksiya BOSHQA so'rovlar bilan bir vaqtda (`Promise.all` ichida)
 * chaqirilmasligi kerak. Neon HTTP drayverida har bir so'rov alohida HTTP
 * so'rovi — bir nechtasi birdan yuborilsa ular navbatga tushadi. Ping o'sha
 * navbatda kutib qolsa, o'lchov "baza qancha vaqtda javob berdi" emas, "bizning
 * so'rovimiz qancha kutdi" degan raqamni ko'rsatadi (o'lchovda 20 ta parallel
 * so'rovda 5+ soniya chiqdi, aslida bitta so'rov ~300 ms).
 *
 * `cache()` — bitta so'rov ichida necha marta chaqirilsa ham bir marta o'lchaydi.
 */
const pingDb = cache(async (): Promise<{ ok: boolean; latency: number }> => {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: 0 };
  }
});

/**
 * Umumiy ko'rsatkichlar — HAMMASI BITTA so'rovda.
 *
 * Ilgari 8 ta alohida `count()` so'rovi yuborilardi. Baza `us-east-1` da
 * bo'lgani uchun har bir so'rov ~300 ms tarmoq yo'liga tushadi, ya'ni bu
 * kartochkalar uchun ~2.4 soniya sarflanardi. Skalyar pastki so'rovlar bilan
 * bir borishda hal bo'ladi.
 */
async function getCounts() {
  const res = await db.execute(sql`
    select
      (select count(*) from "user")::int                                            as users,
      (select count(*) from "user" where updated_at > now() - interval '30 days')::int as active_users,
      (select count(*) from course)::int                                            as courses,
      (select count(*) from lesson)::int                                            as lessons,
      (select count(*) from quiz_question)::int                                     as questions,
      (select count(*) from certificate)::int                                       as certificates,
      (select count(*) from chat_message)::int                                      as messages
  `);
  const row = (res.rows[0] ?? {}) as Record<string, number>;
  return {
    users: row.users ?? 0,
    activeUsers: row.active_users ?? 0,
    courses: row.courses ?? 0,
    lessons: row.lessons ?? 0,
    questions: row.questions ?? 0,
    certificates: row.certificates ?? 0,
    messages: row.messages ?? 0,
  };
}

export async function getSuperAdminOverview() {
  await requireSuperAdmin();

  // Ping ataylab YOLG'IZ va birinchi bo'lib bajariladi — aks holda u qolgan
  // so'rovlar navbatida kutib, haqiqiy bo'lmagan katta raqam ko'rsatadi.
  const dbPing = await pingDb();

  const { users, activeUsers, courses, lessons, questions, certificates, messages } =
    await getCounts();

  const metrics: MetricCard[] = [
    {
      key: "users",
      label: "Jami foydalanuvchi",
      value: fmt(users),
      tint: "var(--sa-accent)",
      icon: "groups",
      spark: [users],
    },
    {
      key: "active",
      label: "30 kun ichida yangilangan",
      value: fmt(activeUsers),
      tint: "var(--sa-accent-2)",
      icon: "sensors",
      spark: [activeUsers],
    },
    {
      key: "content",
      label: "Kurs / dars / test",
      value: `${courses}/${lessons}/${questions}`,
      tint: "var(--sa-ok)",
      icon: "school",
    },
    {
      key: "certificates",
      label: "Sertifikat yozuvlari",
      value: fmt(certificates),
      tint: "var(--sa-warn)",
      icon: "workspace_premium",
    },
    {
      key: "ai",
      label: "AI tutor xabarlari",
      value: fmt(messages),
      tint: "var(--sa-accent)",
      icon: "smart_toy",
    },
    {
      key: "db",
      label: "DB javob vaqti",
      value: dbPing.ok ? String(dbPing.latency) : "off",
      unit: dbPing.ok ? "ms" : undefined,
      tint: dbPing.ok ? "var(--sa-ok)" : "var(--sa-crit)",
      icon: "database",
    },
  ];

  // Bular bir-biriga bog'liq emas — ketma-ket `await` qilinsa har biri
  // alohida tarmoq yo'lini kutadi (~230 ms × 4). Birga yuboriladi.
  const [stream, services, revenue, regions] = await Promise.all([
    getActivityStream(),
    getServices(),
    getRevenue(),
    getRegions(),
  ]);

  return { metrics, stream, services, revenue, regions };
}

export async function getSuperAdminShellStats() {
  await requireSuperAdmin();

  const [admins, services, threats, reports] = await Promise.all([
    db
      .select({ value: count() })
      .from(user)
      .where(sql`${user.role} in ('admin', 'superadmin')`)
      .then((r) => r[0]?.value ?? 0),
    getServices(),
    getThreats(),
    getReports(),
  ]);

  return {
    adminCount: admins,
    moderationOpenCount: reports.filter((r) => r.status !== "resolved").length,
    serviceIssueCount: services.filter((s) => s.status !== "ok").length,
    serviceOkCount: services.filter((s) => s.status === "ok").length,
    serviceTotalCount: services.length,
    threatOpenCount: threats.filter((t) => !t.handled).length,
  };
}

export async function getActivityStream(): Promise<StreamEvent[]> {
  await requireSuperAdmin();
  const rows = await db
    .select({
      id: notification.id,
      at: notification.createdAt,
      actor: user.name,
      message: notification.message,
    })
    .from(notification)
    .innerJoin(user, eq(notification.userId, user.id))
    .orderBy(desc(notification.createdAt))
    .limit(8);

  return rows.map((r) => ({
    id: r.id,
    at: clock(r.at),
    actor: r.actor,
    action: "bildirishnoma",
    target: r.message,
    tone: "info",
    icon: "notifications",
  }));
}

export async function getAdmins(): Promise<AdminRow[]> {
  await requireSuperAdmin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      sessions30d: sql<number>`(
        select count(*)::int from ${session}
        where ${session.userId} = ${user.id} and ${session.createdAt} >= ${since}
      )`,
      lastSeen: sql<Date | null>`(
        select max(${session.updatedAt}) from ${session}
        where ${session.userId} = ${user.id}
      )`,
    })
    .from(user)
    .where(sql`${user.role} in ('admin', 'superadmin')`)
    .orderBy(desc(user.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    level: adminLevel(r.role),
    region: "Kiritilmagan",
    lastSeen: r.lastSeen ? dateLabel(r.lastSeen) : "Sessiya yo'q",
    actions30d: r.sessions30d,
    twoFactor: false,
    status: r.banned ? "suspended" : "active",
  }));
}

export async function getAdminSessions(): Promise<SessionRow[]> {
  await requireSuperAdmin();
  const rows = await db
    .select({
      id: session.id,
      name: user.name,
      email: user.email,
      role: user.role,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(sql`${user.role} in ('admin', 'superadmin')`)
    .orderBy(desc(session.updatedAt))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    level: adminLevel(r.role),
    device: r.userAgent ?? "Noma'lum qurilma",
    geo: "Noma'lum",
    ip: r.ipAddress ?? "—",
    started: dateLabel(r.createdAt),
  }));
}

/**
 * Xizmatlar holati.
 *
 * `cache()` — bu ro'yxat bitta sahifa ochilishida bir necha marta so'raladi
 * (qobiq statistikasi, boshqaruv markazi, tizim sahifasi). Keshsiz har safar
 * yangi ping yuborilardi.
 */
export const getServices = cache(async (): Promise<ServiceRow[]> => {
  await requireSuperAdmin();
  const dbPing = await pingDb();
  const env = process.env;
  return [
    {
      id: "db",
      name: "Neon DB",
      icon: "database",
      status: dbPing.ok ? "ok" : "down",
      load: dbPing.ok ? Math.min(100, dbPing.latency) : 0,
      latency: dbPing.latency,
      note: dbPing.ok ? "select 1 muvaffaqiyatli" : "ulanish xatosi",
    },
    {
      id: "auth",
      name: "Better Auth",
      icon: "lock",
      status: env.BETTER_AUTH_SECRET && env.BETTER_AUTH_URL ? "ok" : "degraded",
      load: 0,
      latency: 0,
      note: "server konfiguratsiyasi",
    },
    {
      id: "telegram",
      name: "Telegram auth",
      icon: "send",
      status: env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME ? "ok" : "degraded",
      load: 0,
      latency: 0,
      note: env.TELEGRAM_BOT_USERNAME
        ? `@${env.TELEGRAM_BOT_USERNAME.replace(/^@/, "")}`
        : "sozlanmagan",
    },
    {
      id: "google",
      name: "Google OAuth",
      icon: "account_circle",
      status: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? "ok" : "degraded",
      load: 0,
      latency: 0,
      note: "OAuth provider",
    },
    {
      id: "redis",
      name: "Rate limit Redis",
      icon: "speed",
      status: env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? "ok" : "degraded",
      load: 0,
      latency: 0,
      note: "Upstash konfiguratsiyasi",
    },
    {
      id: "email",
      name: "Email OTP",
      icon: "mail",
      status: env.SMTP_HOST ? "ok" : "degraded",
      load: 0,
      latency: 0,
      note: "SMTP konfiguratsiyasi",
    },
  ];
});

export async function getRevenue(): Promise<RevenuePoint[]> {
  await requireSuperAdmin();
  const months = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg"];
  return months.map((month) => ({ month, premium: 0, family: 0, school: 0 }));
}

export async function getPlans(): Promise<PlanRow[]> {
  await requireSuperAdmin();
  return [];
}

export async function getPayments(): Promise<PayoutRow[]> {
  await requireSuperAdmin();
  return [];
}

export async function getRegions(): Promise<RegionRow[]> {
  await requireSuperAdmin();
  const rows = await db.select({ value: count() }).from(user);
  const total = rows[0]?.value ?? 0;
  return total
    ? [{ id: "unknown", name: "Hudud kiritilmagan", users: total, share: 100, growth: 0 }]
    : [];
}

export async function getAuditRows(): Promise<AuditRow[]> {
  await requireSuperAdmin();
  const rows = await db
    .select({
      id: superadminAuditLog.id,
      at: superadminAuditLog.createdAt,
      actor: superadminAuditLog.actorName,
      role: superadminAuditLog.actorRole,
      action: superadminAuditLog.action,
      target: superadminAuditLog.target,
      ip: superadminAuditLog.ipAddress,
      impact: superadminAuditLog.impact,
    })
    .from(superadminAuditLog)
    .orderBy(desc(superadminAuditLog.createdAt))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    at: dateLabel(r.at),
    actor: r.actor,
    level: adminLevel(r.role),
    action: r.action,
    target: r.target,
    ip: r.ip ?? "—",
    impact: r.impact === "high" || r.impact === "medium" ? r.impact : "low",
  }));
}

export function getCapabilities(): Capability[] {
  return [
    {
      id: "users",
      group: "Foydalanuvchilar",
      label: "User roli, bloklash va o'chirish",
      hint: "Faqat superadmin bajaradi.",
      grid: { root: "full", admin: "none" },
    },
    {
      id: "content",
      group: "Kontent",
      label: "Kurs, dars va testlarni boshqarish",
      hint: "Admin va superadmin uchun.",
      grid: { root: "full", admin: "full" },
    },
    {
      id: "superadmin",
      group: "Platforma",
      label: "Bosh admin paneli",
      hint: "Faqat superadmin kiradi.",
      grid: { root: "full", admin: "none" },
    },
    {
      id: "settings",
      group: "Platforma",
      label: "Global sozlamalar va xavfli amallar",
      hint: "Faqat superadmin bajaradi.",
      grid: { root: "full", admin: "none" },
    },
  ];
}

export async function getSettingGroups(): Promise<SettingGroup[]> {
  await requireSuperAdmin();
  return [
    {
      id: "auth",
      title: "Autentifikatsiya",
      items: [
        {
          id: "google",
          label: "Google OAuth",
          hint: "GOOGLE_CLIENT_ID va GOOGLE_CLIENT_SECRET mavjudligi.",
          on: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        },
        {
          id: "telegram",
          label: "Telegram Login",
          hint: "TELEGRAM_BOT_TOKEN va TELEGRAM_BOT_USERNAME mavjudligi.",
          on: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME),
          rootOnly: true,
        },
      ],
    },
    {
      id: "system",
      title: "Tizim",
      items: [
        {
          id: "redis",
          label: "Rate limiting",
          hint: "UPSTASH Redis konfiguratsiyasi mavjudligi.",
          on: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
          rootOnly: true,
        },
        {
          id: "smtp",
          label: "Email yuborish",
          hint: "SMTP konfiguratsiyasi mavjudligi.",
          on: Boolean(process.env.SMTP_HOST),
        },
      ],
    },
  ];
}

export async function getReports(): Promise<ReportRow[]> {
  await requireSuperAdmin();
  return [];
}

export async function getThreats(): Promise<ThreatRow[]> {
  await requireSuperAdmin();
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      banReason: user.banReason,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.banned, true))
    .orderBy(desc(user.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    at: dateLabel(r.updatedAt),
    kind: "Bloklangan foydalanuvchi",
    detail: `${r.name} · ${r.email} · ${r.banReason ?? "sababi kiritilmagan"}`,
    ip: "—",
    geo: "—",
    severity: "medium",
    handled: true,
  }));
}

export async function getSecurityLayers() {
  await requireSuperAdmin();
  return [
    {
      label: "Rate limiting",
      note: process.env.UPSTASH_REDIS_REST_URL ? "Upstash sozlangan" : "Upstash sozlanmagan",
      tone: process.env.UPSTASH_REDIS_REST_URL ? ("ok" as const) : ("warn" as const),
    },
    { label: "Telegram signature", note: "Serverda HMAC tekshiriladi", tone: "ok" as const },
    { label: "Admin guard", note: "DB roli har requestda o'qiladi", tone: "ok" as const },
    { label: "DB role check", note: "user_role_check constraint faol", tone: "ok" as const },
  ];
}
