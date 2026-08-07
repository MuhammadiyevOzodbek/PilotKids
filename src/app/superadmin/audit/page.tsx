import { AuditView } from "./audit-view";
import { getAuditRows } from "@/lib/superadmin/queries";

export const metadata = { title: "Audit jurnali" };

export default async function SuperAdminAuditPage() {
  const audit = await getAuditRows();
  return <AuditView audit={audit} />;
}
