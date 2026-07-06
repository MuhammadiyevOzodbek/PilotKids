import { Bell, CheckCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/db/schema";

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

export function NotificationsList({ items }: { items: Notification[] }) {
  const hasUnread = items.some((n) => !n.read);

  return (
    <GlassCard padding="lg" className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display flex items-center gap-2 font-semibold">
          <Bell className="size-5" aria-hidden /> Bildirishnomalar
        </h3>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              <CheckCheck className="size-3.5" /> Hammasini o'qilgan
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">Hozircha bildirishnomalar yo'q.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 rounded-xl p-3 text-sm transition-colors ${
                n.read ? "bg-transparent" : "bg-primary/5"
              }`}
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  n.read ? "bg-muted-foreground/30" : "bg-accent pulse-glow"
                }`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-foreground/90">{n.message}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{timeAgo(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
