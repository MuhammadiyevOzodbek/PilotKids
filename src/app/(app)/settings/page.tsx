import { requireUser } from "@/lib/auth/session";
import { getUserSettings } from "@/lib/queries";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Sozlamalar — PilotKids" };

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  return (
    <SettingsClient
      initialNotif={settings.notificationsEnabled}
      name={user.name}
      age={(user as { age?: number | null }).age ?? null}
      email={user.email}
    />
  );
}
