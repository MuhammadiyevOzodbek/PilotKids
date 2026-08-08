"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExtrudeGeometry, Path, Shape } from "three";
import {
  UNO_CAPS,
  UNO_ICSP,
  UNO_LEDS,
  UNO_MOUNTS,
  UNO_PARTS,
  UNO_PITCH,
  UNO_SMD,
} from "@/lib/virtual-lab/uno-layout";
import {
  SOCKET_W,
  UNO_CORNER_R,
  UNO_H,
  UNO_SIZE,
  mcuLegPositions,
  part3,
  ud,
  unoHeaderBlocks,
  unoOutlineCorners,
  uw,
  ux,
  uz,
  type HeaderBlock,
} from "@/lib/virtual-lab/lab3d/uno-3d";
import { useSimulationStore } from "@/stores/virtual-lab";
import { Box, Cyl, Emissive, InstancedBoxes, M } from "./model-kit";
import type { ModelProps } from "./models-boards";
import { chipLabelTexture } from "./text-texture";
import { unoSilkscreenTexture } from "./uno-silkscreen";

/**
 * PilotKids UNO — plataning uch o'lchamli modeli.
 *
 * Model ikki qoidaga bo'ysunadi:
 *
 * 1. Hech qanday koordinata bu yerda YO'Q. Har bir qismning o'rni
 *    `uno-3d.ts` orqali `uno-layout.ts` dan keladi — ya'ni 2D chizma va
 *    katalog pinlari bilan bitta manbadan. Shu sababli 3D dagi USB uyasi
 *    2D dagi USB uyasi bilan aynan bir joyda turadi va chizmada biror
 *    qism siljitilsa, uchala ko'rinish birga siljiydi.
 *
 * 2. Model MANTIQNI bilmaydi. Unga faqat `runtime` beriladi va u
 *    indikatorlarni shunga qarab yoqadi. Simulyatsiya hisobi
 *    `Simulator` da — bu yerda hech narsa "o'zi miltillamaydi" (§46).
 *
 * Ulanish nuqtalari bu faylda EMAS: ular `PinField` da, chunki bosiladigan
 * qism hamma komponent uchun bitta tizim bo'lishi kerak. Bu yerdagi
 * uyalar — faqat ularning ko'rinadigan "uyasi".
 */

/* ═══════════════════════ O'zgarmas joylashuv ═══════════════════════ */

/*
 * Qismlarning o'rni sozlamaga ham, simulyatsiyaga ham bog'liq emas —
 * shuning uchun MODUL darajasida bir marta hisoblanadi. Shu sababli
 * quyida hech qayerda `useMemo` kerak emas va instansiya ro'yxatlari
 * har renderda yangi massiv bo'lib qayta yozilmaydi (§20).
 */

const PART = {
  usb: part3(UNO_PARTS.usb),
  jack: part3(UNO_PARTS.dcJack),
  mcu: part3(UNO_PARTS.mcu),
  usbChip: part3(UNO_PARTS.usbChip),
  crystal: part3(UNO_PARTS.crystal),
  regulator: part3(UNO_PARTS.regulator),
  reset: part3(UNO_PARTS.reset),
} as const;

type Item = readonly [number, number, number];

/** Mikrokontroller oyoqlari. */
const MCU_LEGS: Item[] = mcuLegPositions(PART.mcu).map((leg) => [
  leg.x,
  UNO_H.surface + 0.09,
  leg.z,
]);

/** Yotiq va tik SMD elementlar — ikki xil o'lchamda, shuning uchun ikki to'plam. */
const SMD_Y = UNO_H.surface + 0.03;
const SMD_FLAT: Item[] = UNO_SMD.filter((s) => !s.vertical).map((s) => [ux(s.x), SMD_Y, uz(s.y)]);
const SMD_UPRIGHT: Item[] = UNO_SMD.filter((s) => s.vertical).map((s) => [ux(s.x), SMD_Y, uz(s.y)]);

const SMD_ALONG: [number, number, number] = [uw(7), 0.06, ud(4)];
const SMD_ACROSS: [number, number, number] = [uw(4), 0.06, ud(7)];

/** Ikkala ICSP konnektorining 2×3 ignalari. */
const ICSP_PINS: Item[] = UNO_ICSP.flatMap((icsp) => {
  const cx = icsp.x + icsp.w / 2;
  const cz = icsp.y + icsp.h / 2;
  const items: Item[] = [];
  for (let column = -1; column <= 1; column += 1) {
    for (const row of [-1, 1]) {
      items.push([ux(cx + column * UNO_PITCH * 0.75), UNO_H.surface + 0.3, uz(cz + row * 6)]);
    }
  }
  return items;
});

const HEADER_BLOCKS = unoHeaderBlocks();

/** Har bir konnektorning uyalari — blok bo'yicha oldindan tayyor. */
const HEADER_HOLES: Item[][] = HEADER_BLOCKS.map((block) =>
  block.sockets.map((socket) => [socket.x, UNO_H.socket - 0.012, block.z] as Item),
);

const MCU_LEG_SIZE: [number, number, number] = [0.05, 0.18, 0.045];
const ICSP_PIN_SIZE: [number, number, number] = [0.05, 0.3, 0.05];
const SOCKET_SIZE: [number, number, number] = [SOCKET_W, 0.03, SOCKET_W];

/* ═══════════════════════ Plata geometriyasi ═══════════════════════ */

/**
 * Tekstolitning o'zi — o'yiq, yumaloq burchak va teshiklar bilan (§15, §16).
 *
 * Geometriya bir marta quriladi va sahnadagi barcha platalar shu bitta
 * nusxadan foydalanadi.
 */
let pcbGeometry: ExtrudeGeometry | null = null;

function unoPcbGeometry(): ExtrudeGeometry {
  if (pcbGeometry) return pcbGeometry;

  const corners = unoOutlineCorners();
  const shape = new Shape();

  /*
   * Burchaklarni yumaloqlash.
   *
   * Radius har bir burchak uchun ALOHIDA cheklanadi: o'yiq atrofidagi
   * qirralar atigi bir necha o'ndan bir santimetr va ularga umumiy
   * radiusni qo'llash konturni o'z-o'zini kesib o'tishga majbur qilardi.
   */
  corners.forEach((corner, i) => {
    const previous = corners[(i - 1 + corners.length) % corners.length]!;
    const next = corners[(i + 1) % corners.length]!;

    const toPrevious = direction(corner, previous);
    const toNext = direction(corner, next);
    const radius = Math.min(UNO_CORNER_R, toPrevious.length / 2, toNext.length / 2);

    const start = {
      x: corner.x + toPrevious.x * radius,
      z: corner.z + toPrevious.z * radius,
    };
    const end = { x: corner.x + toNext.x * radius, z: corner.z + toNext.z * radius };

    if (i === 0) shape.moveTo(start.x, start.z);
    else shape.lineTo(start.x, start.z);

    if (radius > 0) shape.quadraticCurveTo(corner.x, corner.z, end.x, end.z);
    else shape.lineTo(end.x, end.z);
  });
  shape.closePath();

  // Mahkamlash teshiklari — plata orqali chinakam o'tadi.
  for (const mount of UNO_MOUNTS) {
    const hole = new Path();
    hole.absarc(ux(mount.x), uz(mount.y), uw(6), 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  pcbGeometry = new ExtrudeGeometry(shape, { depth: UNO_H.pcb, bevelEnabled: false });
  return pcbGeometry;
}

/** Ikki nuqta orasidagi birlik vektor va masofa. */
function direction(from: { x: number; z: number }, to: { x: number; z: number }) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz) || 1;
  return { x: dx / length, z: dz / length, length };
}

/* ═══════════════════════ Model ═══════════════════════ */

export function ArduinoUnoModel({ runtime }: ModelProps) {
  /*
   * `useMemo` KERAK EMAS: ikkala funksiya ham natijasini modul darajasida
   * keshlaydi, ya'ni ular sahnadagi barcha platalar uchun bitta nusxa
   * qaytaradi. Hook bilan o'rash esa har bir plata uchun alohida kesh
   * yozuvini yaratardi — foydasiz.
   */
  const geometry = unoPcbGeometry();
  const silkscreen = unoSilkscreenTexture();

  return (
    <group>
      {/*
        Tekstolit.

        Shakl XZ tekisligida qurilgan va X o'qi atrofida yotqiziladi;
        ekstruziya pastga ketadi, shuning uchun plata 0 dan `pcb` gacha
        joyni egallaydi va stol ustida yotadi.
      */}
      <mesh
        geometry={geometry}
        material={M.solderMask()}
        position={[0, UNO_H.pcb, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      />

      {/* Bosma qatlam: yozuvlar, kontur va o'tkazgich yo'llari */}
      {silkscreen && (
        <mesh position={[0, UNO_H.surface + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[UNO_SIZE.w, UNO_SIZE.d]} />
          <meshStandardMaterial
            map={silkscreen}
            transparent
            roughness={0.8}
            metalness={0}
            // Plataga yopishgan qatlam chuqurlikka yozmasin — aks holda
            // mahkamlash teshiklari ustida ko'rinmas parda qolardi.
            depthWrite={false}
          />
        </mesh>
      )}

      <MountingRings />
      <UsbPort />
      <PowerJack />
      <Microcontroller />
      <UsbController />
      <Crystal />
      <Regulator />
      <Capacitors />

      <InstancedBoxes items={SMD_FLAT} size={SMD_ALONG} material={M.icBlack()} />
      <InstancedBoxes items={SMD_UPRIGHT} size={SMD_ACROSS} material={M.icBlack()} />

      <IcspHeaders />
      <ResetButton />
      <Indicators runtime={runtime} />

      {HEADER_BLOCKS.map((block, i) => (
        <FemaleHeader key={`${block.z}:${block.cx}`} block={block} holes={HEADER_HOLES[i]!} />
      ))}
    </group>
  );
}

/* ═══════════════════════ Qismlar ═══════════════════════ */

/** Mahkamlash teshiklari atrofidagi metallangan halqa (§16). */
function MountingRings() {
  return (
    <group>
      {UNO_MOUNTS.map((mount) => (
        <mesh
          key={`${mount.x}:${mount.y}`}
          position={[ux(mount.x), UNO_H.surface + 0.005, uz(mount.y)]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={M.tinned()}
        >
          <ringGeometry args={[uw(6), uw(9), 20]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * USB Type-B uyasi (§2).
 *
 * Shtamplangan po'lat korpus, ustida pastroq "tom" va chap tomonda
 * quyuq og'iz — haqiqiy B-tipdagi konnektorning tanilgan silueti.
 */
function UsbPort() {
  const p = PART.usb;
  const base = UNO_H.surface;
  const height = 1.05;
  const mouth = p.cx - p.w / 2;

  return (
    <group>
      <Box
        pos={[p.cx, base + height / 2, p.cz]}
        size={[p.w, height, p.d]}
        material={M.connector()}
      />
      {/* B-tipning yuqori pog'onasi */}
      <Box
        pos={[p.cx + 0.06, base + height + 0.11, p.cz]}
        size={[p.w * 0.78, 0.22, p.d * 0.66]}
        material={M.connector()}
      />
      {/* Uya ichidagi plastik izolyator */}
      <Box
        pos={[mouth + 0.16, base + height * 0.48, p.cz]}
        size={[0.24, height * 0.52, p.d * 0.6]}
        material={M.icBlack()}
        shadow={false}
      />
      {/* Og'iz — qorong'i tirqish */}
      <Box
        pos={[mouth + 0.01, base + height * 0.5, p.cz]}
        size={[0.05, height * 0.66, p.d * 0.7]}
        material={M.socketHole()}
        shadow={false}
      />
    </group>
  );
}

/** Barrel jack — tashqi quvvat uyasi (§3). */
function PowerJack() {
  const p = PART.jack;
  const base = UNO_H.surface;
  const height = 1.0;
  const axis = base + height * 0.45;
  const face = p.cx - p.w / 2;

  return (
    <group>
      <Box
        pos={[p.cx, base + height / 2, p.cz]}
        size={[p.w, height, p.d]}
        material={M.plasticBlack()}
      />
      {/* Dumaloq uya plata chetidan chiqib turadi */}
      <Cyl pos={[face - 0.1, axis, p.cz]} r={0.33} h={0.34} axis="x" material={M.plasticBlack()} />
      <Cyl
        pos={[face - 0.2, axis, p.cz]}
        r={0.2}
        h={0.18}
        axis="x"
        material={M.socketHole()}
        shadow={false}
      />
      {/* Ichkaridagi markaziy kontakt */}
      <Cyl
        pos={[face - 0.17, axis, p.cz]}
        r={0.055}
        h={0.26}
        axis="x"
        material={M.tinned()}
        shadow={false}
      />
    </group>
  );
}

/** ATmega328P — DIP-28 korpus, oyoqlari va yozuvi bilan (§4). */
function Microcontroller() {
  const p = PART.mcu;
  const base = UNO_H.surface;
  const bodyH = 0.36;

  const label = useMemo(
    () => chipLabelTexture({ lines: ["ATMEGA328P", "PilotKids"], aspect: 5 }),
    [],
  );

  return (
    <group>
      <Box pos={[p.cx, base + bodyH / 2, p.cz]} size={[p.w, bodyH, p.d]} material={M.icBlack()} />

      {/* Birinchi oyoq o'yig'i — chip qaysi tomonga qaraganini aytadi */}
      <Cyl
        pos={[p.cx - p.w / 2 + 0.13, base + bodyH, p.cz]}
        r={0.09}
        h={0.06}
        material={M.socketHole()}
        shadow={false}
      />

      {label && (
        <mesh position={[p.cx + 0.1, base + bodyH + 0.002, p.cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[p.w * 0.74, p.d * 0.66]} />
          <meshStandardMaterial map={label} transparent roughness={0.7} depthWrite={false} />
        </mesh>
      )}

      <InstancedBoxes items={MCU_LEGS} size={MCU_LEG_SIZE} material={M.tinned()} />
    </group>
  );
}

/** USB↔UART boshqaruvchi (§5). */
function UsbController() {
  const p = PART.usbChip;
  const base = UNO_H.surface;

  return (
    <group>
      {/* Oyoqlar korpusdan chiqib turgandek ko'rinsin */}
      <Box
        pos={[p.cx, base + 0.03, p.cz]}
        size={[p.w * 1.18, 0.05, p.d * 1.18]}
        material={M.tinned()}
        shadow={false}
      />
      <Box pos={[p.cx, base + 0.12, p.cz]} size={[p.w, 0.16, p.d]} material={M.icBlack()} />
      <Cyl
        pos={[p.cx - p.w / 4, base + 0.2, p.cz - p.d / 4]}
        r={0.035}
        h={0.02}
        material={M.socketHole()}
        shadow={false}
      />
    </group>
  );
}

/** 16 MGs kvarts rezonator — metall korpus (§11). */
function Crystal() {
  const p = PART.crystal;
  return (
    <Cyl
      pos={[p.cx, UNO_H.surface + 0.15, p.cz]}
      r={0.15}
      h={p.w}
      axis="x"
      material={M.connector()}
    />
  );
}

/** Kuchlanish stabilizatori — radiator plastinasi bilan (§11). */
function Regulator() {
  const p = PART.regulator;
  const base = UNO_H.surface;
  return (
    <group>
      <Box pos={[p.cx, base + 0.14, p.cz]} size={[p.w, 0.28, p.d]} material={M.icBlack()} />
      <Box
        pos={[p.cx, base + 0.29, p.cz + p.d * 0.1]}
        size={[p.w * 0.9, 0.04, p.d * 0.6]}
        material={M.tinned()}
        shadow={false}
      />
    </group>
  );
}

/** Elektrolitik kondensatorlar (§11). */
function Capacitors() {
  const base = UNO_H.surface;
  return (
    <group>
      {UNO_CAPS.map((cap) => {
        const r = uw(cap.r);
        return (
          <group key={`${cap.x}:${cap.y}`}>
            <Cyl pos={[ux(cap.x), base + 0.35, uz(cap.y)]} r={r} h={0.7} material={M.connector()} />
            {/* Ustki bosim klapani */}
            <Cyl
              pos={[ux(cap.x), base + 0.71, uz(cap.y)]}
              r={r * 0.55}
              h={0.02}
              material={M.icBlack()}
              shadow={false}
            />
          </group>
        );
      })}
    </group>
  );
}

/** 2×3 ICSP konnektorlar — metall igna va qora asos (§12). */
function IcspHeaders() {
  const base = UNO_H.surface;
  return (
    <group>
      {UNO_ICSP.map((icsp) => {
        const p = part3(icsp);
        return (
          <Box
            key={icsp.id}
            pos={[p.cx, base + 0.08, p.cz]}
            size={[p.w, 0.16, p.d]}
            material={M.headerBlack()}
          />
        );
      })}
      <InstancedBoxes items={ICSP_PINS} size={ICSP_PIN_SIZE} material={M.gold()} />
    </group>
  );
}

/**
 * Reset tugmasi (§9).
 *
 * Bosilganda tugma HAQIQATDAN simulyatsiyani qayta boshlaydi: buyruq
 * `useSimulationStore` ga yoziladi, simulyatsiya siklini boshqaradigan
 * joy esa simulyatorni noldan quradi va `setup()` qaytadan bajariladi.
 * Ya'ni bu bezak animatsiya emas — haqiqiy platadagi tugma nima qilsa,
 * shuni qiladi.
 *
 * Buyruq ATAYLAB umumiy do'konda: 2D laboratoriyadagi RESET ham aynan
 * shu yerga yozadi, ya'ni ikkala ko'rinishda bitta mexanizm.
 */
function ResetButton() {
  const p = PART.reset;
  const base = UNO_H.surface;
  const requestReset = useSimulationStore((s) => s.requestReset);

  const [pressed, setPressed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const press = useCallback(() => {
    setPressed(true);
    requestReset();
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPressed(false), 140);
  }, [requestReset]);

  return (
    <group>
      <Box pos={[p.cx, base + 0.12, p.cz]} size={[p.w, 0.24, p.d]} material={M.icBlack()} />
      <Cyl
        pos={[p.cx, base + 0.29 - (pressed ? 0.05 : 0), p.cz]}
        r={0.11}
        h={0.14}
        material={M.plasticRed()}
      />
      {/*
        Bosish sohasi tugmadan kattaroq: haqiqiy tugma atigi 2 mm va
        sichqoncha bilan unga aniq urish qiyin (§17 dagi qoida bilan
        bir xil sabab).
      */}
      <mesh
        position={[p.cx, base + 0.3, p.cz]}
        onPointerDown={(event) => {
          event.stopPropagation();
          press();
        }}
      >
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * ON / L / TX / RX indikatorlari (§10).
 *
 * Har biri SIMULYATOR holatidan oziqlanadi (§46) — hech qaysisi o'zicha
 * miltillamaydi:
 *   ON — plataga quvvat bor
 *   L  — D13 pini HIGH (aynan «Blink» darsidagi chiroq)
 *   TX/RX — Serial orqali ma'lumot ketyapti
 */
function Indicators({ runtime }: Pick<ModelProps, "runtime">) {
  const serial = runtime?.serialActive === true;

  const state: Record<string, { color: string; on: boolean }> = {
    ON: { color: "#33d17a", on: runtime?.powered !== false },
    L: { color: "#ffb03a", on: (runtime?.pins?.D13 ?? 0) > 0 },
    TX: { color: "#f5c542", on: serial },
    RX: { color: "#f5c542", on: serial },
  };

  return (
    <group>
      {UNO_LEDS.map((led) => {
        const info = state[led.id] ?? { color: "#8d99a8", on: false };
        return (
          <mesh
            key={led.id}
            position={[ux(led.x), UNO_H.surface + 0.035, uz(led.y)]}
            scale={[uw(9), 0.07, ud(7)]}
          >
            <boxGeometry />
            <Emissive color={info.color} intensity={info.on ? 2.6 : 0.04} opacity={1} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Ayol pin konnektor — har bir uyasi alohida ko'rinadi (§6).
 *
 * Uzun qora blok o'rniga korpus + uyalar. Uyalar instansiyalangan, ya'ni
 * yigirma to'qqiztasi ham bitta chizish chaqiruvida (§20).
 */
function FemaleHeader({ block, holes }: { block: HeaderBlock; holes: Item[] }) {
  return (
    <group>
      <Box
        pos={[block.cx, UNO_H.surface + UNO_H.header / 2, block.z]}
        size={[block.w, UNO_H.header, ud(14)]}
        material={M.headerBlack()}
      />
      <InstancedBoxes items={holes} size={SOCKET_SIZE} material={M.socketHole()} />
    </group>
  );
}
