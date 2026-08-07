import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCurrentLesson } from "@/lib/queries";

// Faqat yo'naltiruvchi sahifa — indekslanmasin.
export const metadata: Metadata = { title: "Dars", robots: { index: false, follow: false } };

/**
 * `/lesson` — foydalanuvchining hozirgi darsiga yo'naltiradi.
 * Hech qanday dars boshlanmagan bo'lsa, kurslar sahifasiga.
 */
export default async function LessonIndexPage() {
  const user = await requireUser();
  const current = await getCurrentLesson(user.id);
  if (!current) redirect("/courses");
  redirect(`/lesson/${current.id}`);
}
