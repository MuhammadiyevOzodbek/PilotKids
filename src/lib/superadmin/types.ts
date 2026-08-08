import type { Tone } from "@/components/superadmin/ui";

export interface MetricCard {
  key: string;
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  tint: string;
  icon: string;
  spark?: number[];
}

export interface StreamEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  tone: Tone;
  icon: string;
}

export type AdminLevel = "root" | "admin";

export interface AdminRow {
  id: string;
  name: string;
  email: string;
  level: AdminLevel;
  region: string;
  lastSeen: string;
  actions30d: number;
  /** Hozir amal qilayotgan sessiyalar soni. */
  liveSessions: number;
  twoFactor: boolean;
  status: "active" | "suspended";
}

export const ADMIN_LEVEL_LABEL: Record<AdminLevel, string> = {
  root: "Bosh admin",
  admin: "Admin",
};

export const ADMIN_LEVEL_TONE: Record<AdminLevel, Tone> = {
  root: "root",
  admin: "info",
};

export interface ServiceRow {
  id: string;
  name: string;
  icon: string;
  status: "ok" | "degraded" | "down";
  load: number;
  latency: number;
  note: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  hint: string;
  on: boolean;
  rollout: number;
  risk: "low" | "medium" | "high";
}

export interface RevenuePoint {
  month: string;
  premium: number;
  family: number;
  school: number;
}

export interface PlanRow {
  id: string;
  name: string;
  price: string;
  subscribers: number;
  mrr: string;
  share: number;
  tint: string;
}

export interface PayoutRow {
  id: string;
  at: string;
  who: string;
  method: string;
  amount: string;
  state: "done" | "pending" | "failed" | "refunded";
}

export interface RegionRow {
  id: string;
  name: string;
  users: number;
  share: number;
  growth: number;
}

export interface AuditRow {
  id: string;
  at: string;
  actor: string;
  level: AdminLevel;
  action: string;
  target: string;
  ip: string;
  impact: "high" | "medium" | "low";
}

export interface Capability {
  id: string;
  group: string;
  label: string;
  hint: string;
  grid: Record<AdminLevel, "full" | "read" | "none">;
}

export interface SettingGroup {
  id: string;
  title: string;
  items: {
    id: string;
    label: string;
    hint: string;
    on: boolean;
    rootOnly?: boolean;
  }[];
}

export interface ReportRow {
  id: string;
  at: string;
  kind: string;
  content: string;
  author: string;
  reports: number;
  status: "new" | "reviewing" | "resolved";
}

export interface SessionRow {
  id: string;
  name: string;
  email: string;
  level: AdminLevel;
  device: string;
  geo: string;
  ip: string;
  started: string;
}

export interface ThreatRow {
  id: string;
  at: string;
  kind: string;
  detail: string;
  ip: string;
  geo: string;
  severity: "high" | "medium" | "low";
  handled: boolean;
}
