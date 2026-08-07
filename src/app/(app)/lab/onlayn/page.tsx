import { requireUser } from "@/lib/auth/session";
import { getLesson } from "@/lib/virtual-lab/lessons";
import { VirtualLabClient } from "./lab-client";

export const metadata = { title: "Onlayn laboratoriya — PilotKids" };

/**
 * Onlayn laboratoriya.
 *
 * `?dars=miltillovchi-led` bilan ochilsa, o'sha darsning boshlang'ich sxemasi
 * va kodi yuklanadi hamda topshiriq tekshiruvi yoqiladi.
 */
export default async function OnlineLabPage({
  searchParams,
}: {
  searchParams: Promise<{ dars?: string }>;
}) {
  await requireUser();

  const { dars } = await searchParams;
  // Noma'lum dars nomi berilsa — oddiy bo'sh laboratoriya ochiladi.
  const lesson = dars ? getLesson(dars) : null;

  return <VirtualLabClient lessonSlug={lesson?.slug} />;
}
