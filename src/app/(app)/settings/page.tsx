import { requireUser } from "@/lib/auth/session";
import { getUserSettings } from "@/lib/queries";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  return <SettingsClient initialNotif={settings.notificationsEnabled} />;
}
