import { LoadingView } from "@/components/loading-view";

/**
 * Ildiz segmentining yuklanish holati.
 *
 * `(app)`, `admin` va `superadmin` segmentlarida bu allaqachon bor edi,
 * ildizda esa yo'q edi. Natijada `/welcome` va `/boshlash` (ikkalasi ham
 * bazaga so'rov qiladi) sekin ulanishda ekranni umuman o'zgartirmasdi —
 * bola tugma ishlamadi deb o'ylab, ikkinchi marta bosardi.
 */
export default function RootLoading() {
  return <LoadingView />;
}
