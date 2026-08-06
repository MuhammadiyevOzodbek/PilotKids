import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/session";
import { firstName } from "@/lib/queries";

export const metadata: Metadata = {
  title: { default: "Admin panel", template: "%s · Admin · PilotKids" },
  // Boshqaruv paneli qidiruv natijalarida chiqmasin.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Har bir admin sahifasi shu tekshiruvdan o'tadi; action'lar ham
  // o'z ichida `requireAdmin()` chaqiradi (layout himoya emas).
  const user = await requireAdmin();

  return <AdminShell name={firstName(user.name)}>{children}</AdminShell>;
}
