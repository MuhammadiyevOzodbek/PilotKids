import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getUserStats } from "@/lib/queries";

/**
 * Kirishdan keyingi manzilni tanlaydigan sahifa.
 *
 * Ilgari bu qaror `/dashboard` ning O'ZIDA qabul qilinardi: admin u yerga
 * kirsa, darhol o'z paneliga qaytarib yuborilardi. Natijada admin uchun
 * ilovaning bola tomoni butunlay yopiq edi — «Ilovaga qaytish» tugmasi ham
 * shu sababli ishlamasdi.
 *
 * Endi qaror faqat SHU YERDA qabul qilinadi. Bu ataylab alohida manzil:
 * "qayerga tushishim kerak?" — yo'naltirish masalasi, sahifaning ishi emas.
 * Shuning uchun `/dashboard` hamma uchun oddiy sahifa bo'lib qoldi.
 */
// Bu sahifa faqat yo'naltiradi — indekslanishi ham, ismini takrorlashi ham shart emas.
export const metadata = { title: "Yo'naltirilmoqda", robots: { index: false, follow: false } };

export default async function LandingRedirectPage() {
  const user = await requireUser();
  const stats = await getUserStats(user.id);

  if (stats.role === "superadmin") redirect("/superadmin");
  if (stats.role === "admin") redirect("/admin");
  redirect("/dashboard");
}
