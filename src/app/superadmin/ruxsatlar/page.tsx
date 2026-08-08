import { PermissionsView } from "./permissions-view";
import { getCapabilities } from "@/lib/superadmin/queries";
import { requireSuperAdmin } from "@/lib/auth/session";

export const metadata = { title: "Ruxsatlar matritsasi" };

/*
 * Tekshiruv sahifaning O'ZIDA.
 *
 * `layout.tsx` ham tekshiradi, lekin loyihaning qoidasi bo'yicha layout
 * himoya hisoblanmaydi: sahifa boshqa joyga ko'chirilsa yoki layout
 * o'zgarsa, himoya jim yo'qolardi. Qolgan barcha superadmin so'rovlari
 * o'zida tekshiradi — `getCapabilities` yagona istisno edi.
 */
export default async function SuperAdminPermissionsPage() {
  await requireSuperAdmin();
  return <PermissionsView capabilities={getCapabilities()} />;
}
