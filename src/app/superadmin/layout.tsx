import type { Metadata } from "next";
import { SuperAdminShell } from "@/components/superadmin/shell";
import { requireSuperAdmin } from "@/lib/auth/session";
import { firstName } from "@/lib/queries";
import { getSuperAdminShellStats } from "@/lib/superadmin/queries";
import "./superadmin.css";

export const metadata: Metadata = {
  title: { default: "Bosh boshqaruv", template: "%s · Bosh boshqaruv · PilotKids" },
  robots: { index: false, follow: false },
};

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const stats = await getSuperAdminShellStats();

  return (
    <SuperAdminShell name={firstName(user.name)} stats={stats}>
      {children}
    </SuperAdminShell>
  );
}
