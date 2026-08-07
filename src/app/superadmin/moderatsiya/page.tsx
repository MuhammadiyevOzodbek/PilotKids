import { ModerationView } from "./moderation-view";
import { getReports } from "@/lib/superadmin/queries";

export const metadata = { title: "Moderatsiya" };

export default async function SuperAdminModerationPage() {
  const reports = await getReports();
  return <ModerationView reports={reports} />;
}
