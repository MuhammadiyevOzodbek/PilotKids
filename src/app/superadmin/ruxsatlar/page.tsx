import { PermissionsView } from "./permissions-view";
import { getCapabilities } from "@/lib/superadmin/queries";

export const metadata = { title: "Ruxsatlar matritsasi" };

export default function SuperAdminPermissionsPage() {
  return <PermissionsView capabilities={getCapabilities()} />;
}
