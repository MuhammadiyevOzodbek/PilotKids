"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/lib/auth/client";
import { DASHBOARD_LINKS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  name: string;
  email: string;
  rank?: string;
}

export function DashboardShell({
  user,
  children,
  badges,
}: {
  user: DashboardUser;
  children: React.ReactNode;
  /** href -> son (0 bo'lsa ko'rsatilmaydi). Masalan o'qilmagan bildirishnomalar. */
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {DASHBOARD_LINKS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const badge = badges?.[href] ?? 0;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-gradient-signature glow-blue text-white"
                : "text-foreground/75 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                  active ? "bg-white/25 text-white" : "bg-accent text-accent-foreground",
                )}
                aria-label={`${badge} ta o'qilmagan bildirishnoma`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="border-border space-y-3 border-t p-3">
      <div className="flex items-center gap-3 px-1">
        <span className="bg-gradient-signature font-display flex size-9 items-center justify-center rounded-full text-sm font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.rank ?? user.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="text-foreground/75 hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
      >
        <LogOut className="size-5" aria-hidden />
        {signingOut ? "Chiqilmoqda…" : "Chiqish"}
      </button>
    </div>
  );

  return (
    <div className="bg-grid flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass border-border sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r py-4 lg:flex">
        <div className="flex items-center justify-between px-5 pb-4">
          <Logo />
        </div>
        {navContent}
        {userBlock}
      </aside>

      {/* Mobil drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="glass border-border fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r py-4 lg:hidden"
            >
              <div className="flex items-center justify-between px-5 pb-4">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Menyuni yopish"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
              {navContent}
              {userBlock}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Asosiy hudud */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil yuqori panel */}
        <header className="glass border-border sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Menyuni ochish"
            className="glass flex size-10 items-center justify-center rounded-xl"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Logo />
          <ThemeToggle />
        </header>

        {/* Desktop yuqori o'ng panel */}
        <div className="hidden items-center justify-end px-8 py-4 lg:flex">
          <ThemeToggle />
        </div>

        <main className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
