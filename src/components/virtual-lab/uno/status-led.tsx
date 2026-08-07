import { memo } from "react";
import { UNO_LEDS } from "@/lib/virtual-lab/uno-layout";
import { BOARD_FONT, atLeastMid, type BoardDetail } from "./types";

/**
 * Plataning indikator LED'i (ON / L / TX / RX).
 *
 * Miltillash CSS animatsiyasi bilan qilinadi — agar u React'da bo'lsa,
 * Serial ishlaganda butun plata sekundiga o'nlab marta qayta chizilardi.
 * Bu yerda esa faqat `data-blink` atributi almashadi.
 *
 * Holat faqat rang bilan emas: yonganda LED atrofida halqa paydo bo'ladi,
 * shuning uchun rangni ajratmaydiganlar ham farqni ko'radi.
 */

export type LedTone = "power" | "signal" | "serial" | "error";

export type LedState = "off" | "on" | "blink" | "error";

function LedInner({
  x,
  y,
  label,
  tone,
  state,
  detail,
}: {
  x: number;
  y: number;
  label: string;
  tone: LedTone;
  state: LedState;
  detail: BoardDetail;
}) {
  const lit = state !== "off";

  return (
    <g className="vlab-led" data-tone={state === "error" ? "error" : tone} data-state={state}>
      {/* Yumshoq nur — ataylab kuchsiz, multfilm ko'rinishiga o'tib ketmasin. */}
      {lit && <circle className="vlab-led-glow" cx={x} cy={y} r="8.5" />}

      <rect x={x - 4.5} y={y - 3.5} width="9" height="7" rx="1.4" className="vlab-led-body" />
      {lit && (
        <rect x={x - 2.2} y={y - 1.8} width="4.4" height="3.6" rx="0.9" className="vlab-led-core" />
      )}
      {/* Rangdan tashqari ikkinchi belgi: yonganda halqa chiziladi. */}
      {lit && (
        <rect
          x={x - 6.4}
          y={y - 5.4}
          width="12.8"
          height="10.8"
          rx="2.6"
          className="vlab-led-ring"
        />
      )}

      {atLeastMid(detail) && (
        <text
          x={x}
          y={y + 14}
          textAnchor="middle"
          fontFamily={BOARD_FONT}
          fontSize="5.4"
          fontWeight="700"
          letterSpacing="0.4"
          fill="var(--board-label)"
          opacity="0.75"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export const StatusLed = memo(LedInner);

/** Qaysi indikator qanday rangda yonishi. */
const LED_TONE: Record<string, LedTone> = {
  ON: "power",
  L: "signal",
  TX: "serial",
  RX: "serial",
};

/**
 * To'rttala indikator.
 *
 * - `ON` — plataga quvvat kelganda (simulyatsiya ishlayotganda) yonadi.
 * - `L`  — D13 pini bilan bog'langan, xuddi haqiqiy platadagidek.
 * - `TX/RX` — faqat Serial orqali ma'lumot ketayotganda miltillaydi.
 */
function StatusLedsInner({
  powered,
  d13High,
  serialActive,
  error,
  detail,
}: {
  powered: boolean;
  d13High: boolean;
  serialActive: boolean;
  error: boolean;
  detail: BoardDetail;
}) {
  const stateOf = (id: string): LedState => {
    if (error && id === "ON") return "error";
    if (id === "ON") return powered ? "on" : "off";
    if (id === "L") return d13High ? "on" : "off";
    return serialActive ? "blink" : "off";
  };

  return (
    <>
      {UNO_LEDS.map((led) => (
        <StatusLed
          key={led.id}
          x={led.x}
          y={led.y}
          label={led.label}
          tone={LED_TONE[led.id] ?? "signal"}
          state={stateOf(led.id)}
          detail={detail}
        />
      ))}
    </>
  );
}

export const StatusLeds = memo(StatusLedsInner);
