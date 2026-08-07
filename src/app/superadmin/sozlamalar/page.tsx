import { SettingsView } from "./settings-view";
import { getSettingGroups } from "@/lib/superadmin/queries";

export const metadata = { title: "Global sozlamalar" };

export default async function SuperAdminSettingsPage() {
  const groups = await getSettingGroups();
  return <SettingsView groups={groups} />;
}
