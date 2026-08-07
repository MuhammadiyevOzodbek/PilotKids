import { Icon } from "@/components/icon";

/**
 * Bosh admin yuklanish holati.
 *
 * `LoadingView` ilova tokenlarida (yorug' fon) — bu yerda u qora qobiq
 * ichida oq dog'dek ko'rinardi, shuning uchun alohida.
 */
export default function SuperAdminLoading() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        gap: 14,
        minHeight: "56svh",
        color: "#7c5cff",
      }}
    >
      <Icon name="radar" size={38} className="sa-spin" />
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "#4d566c",
        }}
      >
        Ma&apos;lumot yig&apos;ilmoqda…
      </p>
    </div>
  );
}
