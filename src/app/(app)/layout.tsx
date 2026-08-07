import { Sidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/app-header";
import { requireUser } from "@/lib/auth/session";
import { getUserStats, getNotifications, initials, firstName, formatXp } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // `getUserStats` rolni ham qaytaradi (DB'dan, sessiya keshidan emas) —
  // shu bois admin havolasi uchun alohida so'rov kerak emas.
  const [stats, notifs] = await Promise.all([getUserStats(user.id), getNotifications(user.id)]);

  return (
    <div style={{ display: "flex", minHeight: "100svh" }}>
      <Sidebar role={stats.role} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppHeader
          name={firstName(user.name)}
          initials={initials(user.name)}
          xp={formatXp(stats.xp)}
          streak={stats.streak}
          notifications={notifs.map((n) => ({
            id: n.id,
            message: n.message,
            read: n.read,
            createdAt: n.createdAt,
          }))}
        />
        <main id="content" className="app-main" style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
