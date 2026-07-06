import { eq } from "drizzle-orm";
import { DashboardShell, type DashboardUser } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { db, ranks } from "@/lib/db";
import { getUnreadNotificationCount } from "@/lib/db/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side sessiya tekshiruvi — sessiya yo'q bo'lsa /login ga redirect
  // (proxy'ga qo'shimcha himoya qatlami).
  const sessionUser = await requireUser();

  let rankName: string | undefined;
  if (sessionUser.rankId) {
    const rows = await db
      .select({ name: ranks.name })
      .from(ranks)
      .where(eq(ranks.id, sessionUser.rankId))
      .limit(1);
    rankName = rows[0]?.name;
  }

  const unreadCount = await getUnreadNotificationCount(sessionUser.id);

  const user: DashboardUser = {
    name: sessionUser.name,
    email: sessionUser.email,
    rank: rankName,
  };

  return (
    <DashboardShell user={user} badges={{ "/dashboard": unreadCount }}>
      {children}
    </DashboardShell>
  );
}
