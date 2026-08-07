import { memo } from "react";
import { UNO_CAPS, UNO_ICSP, UNO_PARTS, UNO_SMD } from "@/lib/virtual-lab/uno-layout";
import { BOARD_FONT, atLeastMid, isHigh, type BoardDetail, type BoardIds } from "./types";

/**
 * Plataning yirik va mayda qismlari.
 *
 * Barchasi bitta dizayn tilida: korpus → ichki qatlam → metall → yengil
 * yorug'lik chizig'i. Shuning uchun ular bir-biriga yopishtirilgan turli
 * chizmalar emas, bitta qurilmaning bo'laklariday ko'rinadi.
 *
 * Hech biri simulyatsiya holatiga bog'liq emas (LED va tugmadan tashqari),
 * shuning uchun hammasi `memo`.
 */

/** Qismni plataga "lehimlab" turuvchi metall oyoqlar. */
function SolderFeet({ xs, y, ids }: { xs: number[]; y: number; ids: BoardIds }) {
  return (
    <g>
      {xs.map((x) => (
        <rect key={x} x={x} y={y} width="5" height="4" rx="1" fill={`url(#${ids.metalDark})`} />
      ))}
    </g>
  );
}

/* ─────────────────────────── USB Type-B ─────────────────────────── */

/**
 * Plata tepasidan qaralganda USB uyasi metall qutidek ko'rinadi: uning
 * og'zi chapga, plataning tashqarisiga qaraydi. Shuning uchun ichki qora
 * bo'shliq faqat chap qirrada — yuqoridan butun kavak ko'rinmaydi.
 */
function UsbTypeBPortInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  const { x, y, w, h } = UNO_PARTS.usb;
  const mid = y + h / 2;

  return (
    <g>
      {/* Korpusni plataga ushlab turuvchi lehim oyoqlari (o'ng qirrada). */}
      <rect
        x={x + w - 3}
        y={y + 8}
        width="7"
        height="11"
        rx="1.5"
        fill={`url(#${ids.metalDark})`}
      />
      <rect
        x={x + w - 3}
        y={y + h - 19}
        width="7"
        height="11"
        rx="1.5"
        fill={`url(#${ids.metalDark})`}
      />

      {/* Metall ekran korpusi: pastki qavat to'qroq — qirralar ko'rinadi. */}
      <rect x={x} y={y} width={w} height={h} rx="3" fill={`url(#${ids.metalDark})`} />
      {/* Ustki yassi yuza — shu ikki qatlam 2.5D chuqurlikni beradi. */}
      <rect x={x + 3} y={y + 3.5} width={w - 6} height={h - 7} rx="2" fill={`url(#${ids.metal})`} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="3"
        fill="none"
        stroke="var(--board-metal-dark)"
        strokeWidth="0.9"
        opacity="0.9"
      />
      {/* Yuqori va pastki qirradagi yorug'lik — 2.5D chuqurlik */}
      <rect
        x={x + 2}
        y={y + 1.4}
        width={w - 4}
        height="2"
        rx="1"
        fill="var(--board-metal-light)"
        opacity="0.9"
      />
      <rect
        x={x + 2}
        y={y + h - 3.4}
        width={w - 4}
        height="2"
        rx="1"
        fill="var(--board-metal-dark)"
        opacity="0.5"
      />

      {/* Og'zi: chapga qaragan qora tirqish, ichida oq konnektor tili. */}
      <rect x={x} y={y + 12} width="9" height={h - 24} rx="2" fill="var(--board-hole)" />
      <rect x={x + 1.5} y={mid - 9} width="5.5" height="18" rx="1" fill="var(--board-connector)" />

      {/* Ekran plastinasining choki va bosma nuqtalari */}
      {atLeastMid(detail) && (
        <>
          <path
            d={`M${x + 12},${mid} H${x + w - 6}`}
            stroke="var(--board-metal-dark)"
            strokeWidth="1.1"
            opacity="0.7"
          />
          <g fill="var(--board-metal-dark)" opacity="0.5">
            <circle cx={x + 22} cy={y + 12} r="1.6" />
            <circle cx={x + 44} cy={y + 12} r="1.6" />
            <circle cx={x + 22} cy={y + h - 12} r="1.6" />
            <circle cx={x + 44} cy={y + h - 12} r="1.6" />
          </g>
        </>
      )}

      {/* Korpus qanotlarining lehim izlari — faqat eng yaqin zoomda. */}
      {isHigh(detail) && (
        <g fill="var(--board-metal-dark)" opacity="0.45">
          <rect x={x + 14} y={y + 3} width="12" height="1.6" rx="0.8" />
          <rect x={x + 34} y={y + 3} width="12" height="1.6" rx="0.8" />
          <rect x={x + 14} y={y + h - 4.6} width="12" height="1.6" rx="0.8" />
          <rect x={x + 34} y={y + h - 4.6} width="12" height="1.6" rx="0.8" />
        </g>
      )}
    </g>
  );
}

export const UsbTypeBPort = memo(UsbTypeBPortInner);

/* ─────────────────────────── DC quvvat uyasi ─────────────────────────── */

function DcPowerJackInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  const { x, y, w, h } = UNO_PARTS.dcJack;
  const cy = y + h / 2;

  return (
    <g>
      <SolderFeet xs={[x + w - 3]} y={y + 3} ids={ids} />
      <SolderFeet xs={[x + w - 3]} y={y + h - 7} ids={ids} />

      {/* Silindrsimon qora korpus */}
      <rect x={x} y={y} width={w} height={h} rx="5" fill="var(--board-plastic)" />
      <rect
        x={x}
        y={y}
        width={w}
        height="9"
        rx="4.5"
        fill="var(--board-plastic-light)"
        opacity="0.9"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="5"
        fill="none"
        stroke="var(--board-shadow)"
        strokeWidth="0.8"
        opacity="0.6"
      />

      {/* Uya: tashqi halqa → chuqurlik → ichki metall kontakt */}
      <circle cx={x + 16} cy={cy} r="14" fill="var(--board-plastic-light)" />
      <circle cx={x + 16} cy={cy} r="11.5" fill="var(--board-hole)" />
      <circle cx={x + 16} cy={cy} r="7.5" fill="var(--board-plastic)" />
      <circle cx={x + 16} cy={cy} r="3" fill={`url(#${ids.metal})`} />
      {atLeastMid(detail) && (
        <path
          d={`M${x + 6},${cy - 9} a11.5,11.5 0 0 1 8,-4`}
          stroke="var(--board-metal-light)"
          strokeWidth="1"
          fill="none"
          opacity="0.35"
        />
      )}
    </g>
  );
}

export const DcPowerJack = memo(DcPowerJackInner);

/* ─────────────────────────── ATmega328P ─────────────────────────── */

/** DIP korpusning bir tomonidagi oyoqlar qatori. */
function DipLegs({
  x,
  y,
  count,
  step,
  ids,
}: {
  x: number;
  y: number;
  count: number;
  step: number;
  ids: BoardIds;
}) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={x + i * step}
          y={y}
          width="4.2"
          height="6"
          rx="1"
          fill={`url(#${ids.metal})`}
          stroke="var(--board-metal-dark)"
          strokeWidth="0.4"
        />
      ))}
    </g>
  );
}

function AtmegaChipInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  const { x, y, w, h } = UNO_PARTS.mcu;
  const legs = 14;
  const step = 11;
  const legStart = x + (w - ((legs - 1) * step + 4.2)) / 2;

  return (
    <g>
      {isHigh(detail) && (
        <>
          <DipLegs x={legStart} y={y - 5} count={legs} step={step} ids={ids} />
          <DipLegs x={legStart} y={y + h - 1} count={legs} step={step} ids={ids} />
        </>
      )}

      <rect x={x} y={y} width={w} height={h} rx="2.5" fill={`url(#${ids.chip})`} />
      {/* Korpusning yuqori qirrasi — yengil yorug'lik */}
      <rect
        x={x + 2}
        y={y + 1.2}
        width={w - 4}
        height="1.6"
        rx="0.8"
        fill="var(--board-chip-highlight)"
        opacity="0.55"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="2.5"
        fill="none"
        stroke="var(--board-shadow)"
        strokeWidth="0.7"
        opacity="0.55"
      />

      {/* 1-oyoq belgisi: chap chekkadagi yarim doira va nuqta */}
      <path d={`M${x},${y + h / 2 - 5} a5,5 0 0 0 0,10`} fill="var(--board-pcb-dark)" />
      <circle cx={x + 11} cy={y + 8} r="2.2" fill="var(--board-chip-notch)" />

      {atLeastMid(detail) && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 3}
          textAnchor="middle"
          fontFamily={BOARD_FONT}
          fontSize="8"
          fontWeight="600"
          letterSpacing="0.7"
          fill="var(--board-chip-text)"
          opacity="0.9"
        >
          ATmega328P
        </text>
      )}
    </g>
  );
}

export const AtmegaChip = memo(AtmegaChipInner);

/* ─────────────────────────── Kichik IC (QFP) ─────────────────────────── */

function SmallIcChipInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  const { x, y, w, h } = UNO_PARTS.usbChip;

  return (
    <g>
      {isHigh(detail) && (
        <g fill={`url(#${ids.metal})`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x={x - 3} y={y + 5 + i * 6} width="3.4" height="2.4" rx="0.6" />
              <rect x={x + w - 0.4} y={y + 5 + i * 6} width="3.4" height="2.4" rx="0.6" />
              <rect x={x + 5 + i * 6} y={y - 3} width="2.4" height="3.4" rx="0.6" />
              <rect x={x + 5 + i * 6} y={y + h - 0.4} width="2.4" height="3.4" rx="0.6" />
            </g>
          ))}
        </g>
      )}
      <rect x={x} y={y} width={w} height={h} rx="2" fill={`url(#${ids.chip})`} />
      <rect
        x={x + 1.5}
        y={y + 1}
        width={w - 3}
        height="1.4"
        rx="0.7"
        fill="var(--board-chip-highlight)"
        opacity="0.5"
      />
      <circle cx={x + 6} cy={y + 6} r="2" fill="var(--board-chip-notch)" />
      {atLeastMid(detail) && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 2.5}
          textAnchor="middle"
          fontFamily={BOARD_FONT}
          fontSize="5"
          fontWeight="700"
          letterSpacing="0.4"
          fill="var(--board-chip-text)"
          opacity="0.7"
        >
          USB
        </text>
      )}
    </g>
  );
}

export const SmallIcChip = memo(SmallIcChipInner);

/* ─────────────────────────── Kvarts rezonator ─────────────────────────── */

function CrystalResonatorInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  const { x, y, w, h } = UNO_PARTS.crystal;

  return (
    <g>
      {isHigh(detail) && <SolderFeet xs={[x - 1, x + w - 4]} y={y + h - 2} ids={ids} />}
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="var(--board-metal-dark)" />
      <rect
        x={x + 1.5}
        y={y + 1.5}
        width={w - 3}
        height={h - 3}
        rx={(h - 3) / 2}
        fill={`url(#${ids.metal})`}
      />
      <rect
        x={x + 4}
        y={y + 3}
        width={w - 8}
        height="1.6"
        rx="0.8"
        fill="var(--board-metal-light)"
        opacity="0.85"
      />
      {atLeastMid(detail) && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 2}
          textAnchor="middle"
          fontFamily={BOARD_FONT}
          fontSize="4.6"
          fontWeight="700"
          fill="var(--board-metal-dark)"
          opacity="0.8"
        >
          16MHz
        </text>
      )}
    </g>
  );
}

export const CrystalResonator = memo(CrystalResonatorInner);

/* ─────────────────────────── Stabilizator ─────────────────────────── */

function VoltageRegulatorInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  const { x, y, w, h } = UNO_PARTS.regulator;

  return (
    <g>
      {/* Radiator plastinasi */}
      <rect x={x + 2} y={y - 5} width={w - 4} height="7" rx="1.5" fill={`url(#${ids.metal})`} />
      <circle cx={x + w / 2} cy={y - 1.6} r="1.8" fill="var(--board-hole)" />
      {/* Korpus */}
      <rect x={x} y={y} width={w} height={h} rx="2" fill={`url(#${ids.chip})`} />
      <rect
        x={x + 1.5}
        y={y + 1}
        width={w - 3}
        height="1.3"
        rx="0.6"
        fill="var(--board-chip-highlight)"
        opacity="0.45"
      />
      {isHigh(detail) && (
        <SolderFeet xs={[x + 6, x + w / 2 - 2.5, x + w - 11]} y={y + h - 1} ids={ids} />
      )}
    </g>
  );
}

export const VoltageRegulator = memo(VoltageRegulatorInner);

/* ─────────────────────────── Kondensatorlar ─────────────────────────── */

/**
 * Elektrolitik kondensator — tepadan qaralganda alyuminiy qopqoq ko'rinadi:
 * to'q korpus, ustida ochroq halqa va manfiy qutbni bildiruvchi yo'lak.
 */
function ElectrolyticCapsInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  return (
    <g>
      {UNO_CAPS.map((c) => (
        <g key={`${c.x}-${c.y}`}>
          {/* Alyuminiy qobiq */}
          <circle cx={c.x} cy={c.y} r={c.r} fill={`url(#${ids.metalDark})`} />
          {/* Ustki qopqoq — to'q, chunki u qora izolyatsiya bilan qoplangan */}
          <circle cx={c.x} cy={c.y} r={c.r - 1.8} fill="var(--board-plastic)" />
          <circle
            cx={c.x}
            cy={c.y}
            r={c.r}
            fill="none"
            stroke="var(--board-shadow)"
            strokeWidth="0.7"
            opacity="0.6"
          />
          {/* Manfiy qutb yo'lagi — haqiqiy kondensatordagidek bir yon bo'ylab */}
          <path
            d={`M${c.x - c.r + 1.4},${c.y - 4} a${c.r - 1.4},${c.r - 1.4} 0 0 0 0,8`}
            fill="none"
            stroke="var(--board-metal-light)"
            strokeWidth="2.6"
            opacity="0.55"
          />
          {atLeastMid(detail) && (
            <>
              {/* Qopqoqdagi bosim klapani — uch nurli belgi */}
              <path
                d={`M${c.x - 4.5},${c.y - 2.6} L${c.x + 4.5},${c.y + 2.6} M${c.x - 4.5},${c.y + 2.6} L${c.x + 4.5},${c.y - 2.6}`}
                stroke="var(--board-chip-highlight)"
                strokeWidth="1"
                opacity="0.5"
              />
            </>
          )}
        </g>
      ))}
    </g>
  );
}

export const ElectrolyticCaps = memo(ElectrolyticCapsInner);

/* ─────────────────────────── ICSP header ─────────────────────────── */

function IcspHeaderInner({
  x,
  y,
  w,
  h,
  label,
  ids,
  detail,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  ids: BoardIds;
  detail: BoardDetail;
}) {
  const cols = 3;
  const rows = 2;
  const step = 8;
  const startX = x + (w - (cols - 1) * step) / 2;
  const startY = y + (h - (rows - 1) * step) / 2;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="2" fill={`url(#${ids.plastic})`} />
      <rect x={x} y={y} width={w} height="2" rx="1" fill="var(--board-shadow)" opacity="0.4" />
      {Array.from({ length: cols }, (_, c) =>
        Array.from({ length: rows }, (_, r) => {
          const cx = startX + c * step;
          const cy = startY + r * step;
          return (
            <g key={`${c}-${r}`}>
              <rect
                x={cx - 2.6}
                y={cy - 2.6}
                width="5.2"
                height="5.2"
                rx="1"
                fill="var(--board-hole)"
              />
              <rect
                x={cx - 2}
                y={cy - 2}
                width="4"
                height="4"
                rx="0.8"
                fill={`url(#${ids.metal})`}
              />
              {/* 1-kontakt kvadrat, qolganlari yumaloq — haqiqatdagidek */}
              {c === 0 && r === 0 && (
                <rect
                  x={cx - 3.2}
                  y={cy - 3.2}
                  width="6.4"
                  height="6.4"
                  rx="0.6"
                  fill="none"
                  stroke="var(--board-label)"
                  strokeWidth="0.6"
                  opacity="0.6"
                />
              )}
            </g>
          );
        }),
      )}
      {atLeastMid(detail) && (
        <text
          x={x + w / 2}
          y={y + h + 7}
          textAnchor="middle"
          fontFamily={BOARD_FONT}
          fontSize="5"
          fontWeight="700"
          letterSpacing="0.5"
          fill="var(--board-label)"
          opacity="0.7"
        >
          {label}
        </text>
      )}
    </g>
  );
}

const IcspHeader = memo(IcspHeaderInner);

export { IcspHeader };

/** Ikkala ICSP bloki. */
function IcspHeadersInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  return (
    <>
      {UNO_ICSP.map((h) => (
        <IcspHeader
          key={h.id}
          x={h.x}
          y={h.y}
          w={h.w}
          h={h.h}
          label={h.label}
          ids={ids}
          detail={detail}
        />
      ))}
    </>
  );
}

export const IcspHeaders = memo(IcspHeadersInner);

/* ─────────────────────────── Mayda SMD ─────────────────────────── */

/** Rezistor va kondensatorlarning 0805 korpuslari — faqat katta zoomda. */
function SmallSmdComponentsInner({ ids }: { ids: BoardIds }) {
  return (
    <g pointerEvents="none">
      {UNO_SMD.map((c) => {
        const w = c.vertical ? 4 : 8;
        const h = c.vertical ? 8 : 4;
        return (
          <g key={`${c.x}-${c.y}`}>
            <rect
              x={c.x - w / 2 - 1.4}
              y={c.y - h / 2}
              width={w + 2.8}
              height={h}
              rx="0.8"
              fill={`url(#${ids.metal})`}
              opacity="0.85"
            />
            <rect
              x={c.x - w / 2}
              y={c.y - h / 2}
              width={w}
              height={h}
              rx="0.6"
              fill="var(--board-smd)"
            />
          </g>
        );
      })}
    </g>
  );
}

export const SmallSmdComponents = memo(SmallSmdComponentsInner);
