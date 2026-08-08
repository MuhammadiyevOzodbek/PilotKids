import { requireUser } from "@/lib/auth/session";
import { LAB_3D } from "../lab-kinds";
import { Lab3DClient } from "./lab-3d-client";

export const metadata = { title: LAB_3D.title };

/**
 * 3D Arduino laboratoriyasi.
 *
 * 2D laboratoriya bilan BITTA sxema modelini bo'lishadi (`useCircuitStore`),
 * shuning uchun bu yerda yig'ilgan zanjir `/lab/onlayn` da ham ochiladi va
 * simulyator ikkalasi uchun bir xil ishlaydi.
 */
export default async function Lab3DPage() {
  // Kirish tekshiruvi qolgan laboratoriya sahifalaridagi bilan bir xil.
  await requireUser();
  return <Lab3DClient />;
}
