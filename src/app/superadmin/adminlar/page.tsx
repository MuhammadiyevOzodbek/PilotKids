import { AdminsView } from "./admins-view";
import { getAdmins } from "@/lib/superadmin/queries";

export const metadata = { title: "Adminlar" };

export default async function SuperAdminAdminsPage() {
  const admins = await getAdmins();
  return <AdminsView admins={admins} />;
}
