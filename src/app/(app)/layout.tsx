import { Sidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/app-header";
import { requireUser } from "@/lib/auth/session";
import { getUserStats, getNotifications, initials, firstName, formatXp } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [stats, notifs] = await Promise.all([getUserStats(user.id), getNotifications(user.id)]);
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppHeader
          name={firstName(user.name)}
          initials={initials(user.name)}
          xp={formatXp(stats.xp)}
          streak={stats.streak}
          hasUnread={unread > 0}
        />
        <main style={{ flex: 1, padding: "34px 32px 60px" }}>{children}</main>
      </div>
    </div>
  );
}
