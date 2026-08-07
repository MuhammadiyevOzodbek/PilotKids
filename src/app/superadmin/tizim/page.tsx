import { SystemView } from "./system-view";
import { getServices, getSettingGroups } from "@/lib/superadmin/queries";

export const metadata = { title: "Tizim holati" };

export default async function SuperAdminSystemPage() {
  const [services, settingGroups] = await Promise.all([getServices(), getSettingGroups()]);
  const flags = settingGroups.flatMap((g) =>
    g.items.map((i) => ({
      id: i.id,
      name: i.label,
      hint: i.hint,
      on: i.on,
      rollout: i.on ? 100 : 0,
      risk: i.rootOnly ? ("high" as const) : ("low" as const),
    })),
  );
  return <SystemView services={services} flags={flags} />;
}
