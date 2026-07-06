import type { LucideIcon } from "lucide-react";
import { BookOpen, LayoutDashboard, Sparkles, Trophy, UserRound } from "lucide-react";

/** Landing sahifadagi bo'lim havolalari (bir sahifa ichida anchor). */
export const LANDING_LINKS = [
  { label: "Biz haqimizda", href: "#about" },
  { label: "Afzalliklar", href: "#benefits" },
  { label: "Yo'l xaritasi", href: "#roadmap" },
  { label: "Narxlar", href: "#pricing" },
  { label: "Kurslar", href: "#courses" },
] as const;

/** Dashboard sidebar navigatsiyasi. */
export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const DASHBOARD_LINKS: DashboardNavItem[] = [
  { label: "Boshqaruv paneli", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kurslar", href: "/courses", icon: BookOpen },
  { label: "Reyting", href: "/ranking", icon: Trophy },
  { label: "Obuna", href: "/subscription", icon: Sparkles },
  { label: "Profil", href: "/profile", icon: UserRound },
];
