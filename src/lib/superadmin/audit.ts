import "server-only";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { superadminAuditLog } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/auth/session";

type AuditImpact = "low" | "medium" | "high";

function firstIp(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export async function writeSuperadminAudit({
  actor,
  action,
  target,
  impact = "low",
}: {
  actor: SessionUser;
  action: string;
  target: string;
  impact?: AuditImpact;
}) {
  const h = await headers();
  await db.insert(superadminAuditLog).values({
    actorId: actor.id,
    actorName: actor.name || actor.email || "Noma'lum admin",
    actorRole: String(actor.role ?? "admin"),
    action,
    target,
    impact,
    ipAddress: firstIp(h.get("x-forwarded-for")) ?? h.get("x-real-ip"),
  });
}
