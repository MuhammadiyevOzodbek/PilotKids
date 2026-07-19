"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
}

const iconBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

/** Vaqtni "2 soat oldin" ko'rinishida qaytaradi. */
function timeAgo(value: Date | string): string {
  const then = value instanceof Date ? value : new Date(value);
  const sec = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (sec < 60) return "hozirgina";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daqiqa oldin`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} soat oldin`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} kun oldin`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} hafta oldin`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} oy oldin`;
  return `${Math.floor(day / 365)} yil oldin`;
}

export function NotificationsMenu({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  // Server javobini kutmasdan o'qilganlarni darhol ko'rsatamiz (optimistik).
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const items = notifications.map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  const unreadCount = items.filter((n) => !n.read).length;

  // Tashqariga bosilganda va Escape bosilganda yopamiz.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function handleReadAll() {
    setReadIds(new Set(items.map((n) => n.id)));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unreadCount > 0 ? `Bildirishnomalar, ${unreadCount} ta o'qilmagan` : "Bildirishnomalar"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ ...iconBtn, position: "relative" }}
      >
        <Icon name="notifications" size={21} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 11,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--success)",
              border: "2px solid var(--surface)",
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Bildirishnomalar ro'yxati"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxWidth: "calc(100vw - 24px)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "var(--shadow-lg)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}>
              Bildirishnomalar
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                disabled={pending}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: pending ? "default" : "pointer",
                  padding: 0,
                }}
              >
                Barchasini o&apos;qildi
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {items.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "26px 14px",
                  textAlign: "center",
                  fontSize: 13.5,
                  color: "var(--text-3)",
                }}
              >
                Hozircha bildirishnoma yo&apos;q
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  role="menuitem"
                  onClick={() => !n.read && handleRead(n.id)}
                  aria-label={n.read ? n.message : `O'qilmagan: ${n.message}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    // O'qilmaganlar yorqinroq fon bilan ajratiladi.
                    background: n.read ? "transparent" : "var(--primary-soft)",
                    cursor: n.read ? "default" : "pointer",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      marginTop: 5,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: n.read ? "transparent" : "var(--primary)",
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13.5,
                        lineHeight: 1.45,
                        color: "var(--text)",
                        fontWeight: n.read ? 500 : 700,
                      }}
                    >
                      {n.message}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "var(--text-3)",
                        marginTop: 3,
                      }}
                    >
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
