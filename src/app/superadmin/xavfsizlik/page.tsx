import { SecurityView } from "./security-view";
import { getAdminSessions, getSecurityLayers, getThreats } from "@/lib/superadmin/queries";

export const metadata = { title: "Xavfsizlik" };

export default async function SuperAdminSecurityPage() {
  const [sessions, threats, layers] = await Promise.all([
    getAdminSessions(),
    getThreats(),
    getSecurityLayers(),
  ]);
  return <SecurityView sessions={sessions} threats={threats} layers={layers} />;
}
