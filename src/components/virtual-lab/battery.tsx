import { useId } from "react";
import { BATTERY_DEFAULT_VOLTAGE, formatVolts } from "@/lib/virtual-lab/catalog";
import type { BatteryPolarity, ComponentRuntimeState } from "@/lib/virtual-lab/types";

/**
 * Batareya elementi.
 *
 * Gorizontal ushlagichdagi silindrsimon element sifatida chizilgan: chapda
 * yassi manfiy kontakt, o'ngda metall musbat do'mboqcha — xuddi haqiqiy
 * batareyadagidek. Shu tufayli bola ekrandagi narsani stol ustidagisi
 * bilan bog'lay oladi va qutbni chalkashtirmaydi.
 *
 * Terminallar — ushlagichning kontaktlari, element emas. Shuning uchun
 * "teskari solingan" holatda korpus aylantirib chiziladi: do'mboqcha chap
 * tomonga o'tadi, `+` va `−` belgilari almashadi. Foydalanuvchi nima uchun
 * LED yonmayotganini bir qarashda ko'radi.
 *
 * Ranglar `--batt-*` CSS o'zgaruvchilaridan olinadi, shuning uchun kunduzgi
 * va tungi mavzuda ikkalasida ham to'g'ri ko'rinadi.
 */

export interface BatterySymbolProps {
  width: number;
  height: number;
  settings: Record<string, string | number | boolean>;
  runtime?: ComponentRuntimeState;
  /** Mayda yozuvlarni ko'rsatishmi (uzoqlashtirilganda ular o'qilmaydi). */
  showDetail?: boolean;
}

export function BatterySymbol({
  width,
  height,
  settings,
  runtime,
  showDetail = true,
}: BatterySymbolProps) {
  // SVG `id` lari hujjat bo'yicha global — bir nechta batareya qo'yilganda
  // gradientlar to'qnashmasligi uchun har bir nusxa o'z prefiksini oladi.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const shell = `${uid}-shell`;
  const metal = `${uid}-metal`;
  const cap = `${uid}-cap`;

  const volts = typeof settings.voltage === "number" ? settings.voltage : BATTERY_DEFAULT_VOLTAGE;
  const enabled = settings.enabled !== false;
  const polarity: BatteryPolarity = settings.polarity === "reversed" ? "reversed" : "normal";
  const reversed = polarity === "reversed";
  const active = runtime?.active === true;

  /* Musbat do'mboqcha qaysi tomonda: to'g'ri holatda o'ngda. */
  const plusOnRight = !reversed;

  return (
    <svg
      className="vlab-battery"
      data-enabled={enabled ? "true" : "false"}
      data-active={active ? "true" : undefined}
      width={width}
      height={height}
      viewBox="0 0 130 64"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Batareya ${formatVolts(volts)}${enabled ? "" : ", o'chirilgan"}${
        reversed ? ", teskari solingan" : ""
      }`}
    >
      <defs>
        <linearGradient id={shell} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--batt-shell-light)" />
          <stop offset="48%" stopColor="var(--batt-shell)" />
          <stop offset="100%" stopColor="var(--batt-shell-dark)" />
        </linearGradient>
        <linearGradient id={metal} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--batt-metal-light)" />
          <stop offset="45%" stopColor="var(--batt-metal)" />
          <stop offset="100%" stopColor="var(--batt-metal-dark)" />
        </linearGradient>
        <linearGradient id={cap} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--batt-band-light)" />
          <stop offset="100%" stopColor="var(--batt-band)" />
        </linearGradient>
      </defs>

      {/* Ushlagich kontaktlari — pinlar aynan shu nuqtalarga tushadi. */}
      <g className="vlab-batt-contact">
        <rect x="1" y="24" width="13" height="16" rx="2.5" fill={`url(#${metal})`} />
        <rect x="116" y="24" width="13" height="16" rx="2.5" fill={`url(#${metal})`} />
      </g>

      {/* Elementning korpusi. Teskari solinganda ko'zgu aks ettiriladi. */}
      <g transform={reversed ? "translate(130,0) scale(-1,1)" : undefined}>
        {/* Musbat uchidagi metall do'mboqcha (o'ngda) */}
        <rect x="106" y="26" width="10" height="12" rx="2" fill={`url(#${metal})`} />

        {/* Asosiy korpus */}
        <rect x="16" y="12" width="92" height="40" rx="6" fill={`url(#${shell})`} />
        {/* Yuqori qirradagi yorug'lik — 2.5D chuqurlik */}
        <rect
          x="20"
          y="14.5"
          width="84"
          height="3"
          rx="1.5"
          fill="var(--batt-shell-light)"
          opacity="0.75"
        />
        <rect
          x="16"
          y="12"
          width="92"
          height="40"
          rx="6"
          fill="none"
          stroke="var(--batt-outline)"
          strokeWidth="1"
          opacity="0.55"
        />

        {/* Musbat uchidagi yorqin halqa — qutbni rangsiz ham ajratadi */}
        <rect x="94" y="12" width="14" height="40" fill={`url(#${cap})`} opacity="0.9" />
        <rect x="94" y="12" width="1.6" height="40" fill="var(--batt-outline)" opacity="0.35" />

        {/* Manfiy uchidagi yassi kontakt */}
        <rect x="16" y="18" width="5" height="28" rx="2" fill={`url(#${metal})`} opacity="0.9" />
      </g>

      {/* Qutb belgilari — korpus bilan birga almashadi. */}
      <g
        className="vlab-batt-sign"
        fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        textAnchor="middle"
      >
        <text x={plusOnRight ? 101 : 29} y="37" fontSize="17">
          +
        </text>
        <text x={plusOnRight ? 29 : 101} y="36" fontSize="19">
          −
        </text>
      </g>

      {/* Korpusdagi kuchlanish yozuvi */}
      {showDetail && (
        <text
          className="vlab-batt-label"
          x="65"
          y="37"
          textAnchor="middle"
          fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
          fontSize="16"
          fontWeight="800"
          letterSpacing="0.4"
        >
          {formatVolts(volts)}
        </text>
      )}

      {/* Ishlayotganini bildiruvchi kichik indikator — kuchli nur emas. */}
      {showDetail && <circle className="vlab-batt-led" cx="65" cy="47" r="2.6" />}

      {/* O'chirilgan batareya ustida nozik chiziq: rangdan tashqari belgi. */}
      {!enabled && (
        <path
          d="M20 50 L104 16"
          stroke="var(--batt-off-mark)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      )}
    </svg>
  );
}
