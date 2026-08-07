import { LoadingView } from "@/components/loading-view";

/**
 * Admin sahifalari ko'p so'rov qiladi (statistika, ro'yxatlar) — busiz
 * bo'lim ochilganda ekran bo'sh turib qoladi.
 */
export default function AdminLoading() {
  return <LoadingView label="Panel yuklanmoqda…" />;
}
