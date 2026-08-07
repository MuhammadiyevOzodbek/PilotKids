import { CommandCenter } from "./command-center";
import { getSuperAdminOverview } from "@/lib/superadmin/queries";

export const metadata = { title: "Boshqaruv markazi" };

export default async function SuperAdminHomePage() {
  const data = await getSuperAdminOverview();
  return <CommandCenter data={data} />;
}
