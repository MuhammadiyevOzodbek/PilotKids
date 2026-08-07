import { useId, useMemo } from "react";
import { UNO_VIEWBOX, unoOutlinePath } from "@/lib/virtual-lab/uno-layout";
import { BoardDefs } from "./defs";
import { BoardBranding, BoardLabels } from "./labels";
import {
  AtmegaChip,
  CrystalResonator,
  DcPowerJack,
  ElectrolyticCaps,
  IcspHeaders,
  SmallIcChip,
  SmallSmdComponents,
  UsbTypeBPort,
  VoltageRegulator,
} from "./parts";
import { BoardBody, BoardTraces, MountingHoles } from "./pcb";
import { PinHeader, PinSockets } from "./pins";
import { ResetButton } from "./reset-button";
import { StatusLeds } from "./status-led";
import { atLeastMid, isHigh, makeBoardIds, type BoardDetail, type BoardPinState } from "./types";

/**
 * PilotKids UNO — o'quv simulyatori uchun chizilgan plata.
 *
 * Chizma to'liq original: haqiqiy plataning tuzilishi (gabarit nisbati,
 * 2.54 mm header qadami, port va chip o'lchamlari) takrorlangan, lekin
 * Arduino logotipi yoki brend elementlari ko'chirilmagan.
 *
 * Chizish tartibi — haqiqiy ishlab chiqarish tartibi bilan bir xil:
 * tekstolit → o'tkazgich yo'llari → silkscreen → komponentlar → headerlar.
 * Shu sababli hech narsa noto'g'ri qatlamda qolmaydi.
 *
 * Interaktiv ulanish nuqtalari bu SVG ustida, HTML qatlamida turadi
 * (`component-node`), shuning uchun butun chizma `pointer-events: none`;
 * faqat RESET tugmasi o'zi uchun uni qayta yoqadi.
 */
export interface ArduinoBoardSvgProps {
  width: number;
  height: number;
  detail?: BoardDetail;
  /** Simulyatsiya ishlayaptimi — ON indikatori. */
  powered?: boolean;
  /** D13 pini yuqori darajadami — L indikatori. */
  d13High?: boolean;
  /** Serial orqali ma'lumot ketyaptimi — TX/RX miltillashi. */
  serialActive?: boolean;
  /** Sxemada shu plataga tegishli xato bormi. */
  error?: boolean;
  /** Plata o'chirilganmi (ulanishlar ishlamaydi). */
  disabled?: boolean;
  /** Pin holatlari — uyaning ostidagi belgini boshqaradi. */
  pinStates?: Record<string, BoardPinState>;
  /** RESET tugmasi bosilganda. */
  onReset?: () => void;
}

export function ArduinoBoardSvg({
  width,
  height,
  detail = "high",
  powered = false,
  d13High = false,
  serialActive = false,
  error = false,
  disabled = false,
  pinStates,
  onReset,
}: ArduinoBoardSvgProps) {
  // SVG `id` lari hujjat bo'yicha global — bir nechta plata qo'yilganda
  // gradientlar to'qnashmasligi uchun har bir nusxa o'z prefiksini oladi.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = useMemo(() => makeBoardIds(uid), [uid]);
  const outline = useMemo(() => unoOutlinePath(), []);

  const mid = atLeastMid(detail);
  const fine = isHigh(detail);

  return (
    <svg
      className="vlab-board"
      data-error={error ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      width={width}
      height={height}
      viewBox={`0 0 ${UNO_VIEWBOX.width} ${UNO_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="PilotKids UNO o'quv platasi"
    >
      <BoardDefs ids={ids} />

      {/* ── 1. Tekstolit ── */}
      <BoardBody ids={ids} />

      {/* ── 2. O'tkazgich yo'llari (faqat o'rta va katta zoomda) ── */}
      {mid && <BoardTraces ids={ids} detail={detail} />}

      {/* ── 3. Silkscreen: brend va yozuvlar komponentlar ostida qoladi ── */}
      <BoardBranding subtitle={mid} />
      {mid && <BoardLabels />}

      {/* ── 4. Mayda SMD — eng yaqin zoomda ── */}
      {fine && <SmallSmdComponents ids={ids} />}

      {/* ── 5. Mahkamlash teshiklari ── */}
      <MountingHoles ids={ids} />

      {/* ── 6. Yirik qismlar ── */}
      <UsbTypeBPort ids={ids} detail={detail} />
      <DcPowerJack ids={ids} detail={detail} />
      <VoltageRegulator ids={ids} detail={detail} />
      <ElectrolyticCaps ids={ids} detail={detail} />
      <AtmegaChip ids={ids} detail={detail} />

      {mid && (
        <>
          <SmallIcChip ids={ids} detail={detail} />
          <CrystalResonator ids={ids} detail={detail} />
          <IcspHeaders ids={ids} detail={detail} />
          <StatusLeds
            powered={powered}
            d13High={d13High}
            serialActive={serialActive}
            error={error}
            detail={detail}
          />
          <ResetButton ids={ids} detail={detail} onReset={onReset} />
        </>
      )}

      {/* ── 7. Header uyalari — eng ustki qatlam, simlar shu yerga ulanadi ── */}
      <PinHeader ids={ids} />
      <PinSockets ids={ids} states={pinStates} />

      {/* Xato bo'lsa: butun plata qizarmaydi, faqat nozik kontur chiziladi. */}
      {error && (
        <path
          d={outline}
          fill="none"
          stroke="var(--board-error)"
          strokeWidth="2"
          opacity="0.85"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
