import { describe, expect, it } from "vitest";
import { CATALOG, getDefinition } from "../catalog";
import {
  DESK,
  PX_PER_CM,
  TABLE,
  collectPinPositions,
  hasExplicitSize,
  localPinPosition,
  nodePosition,
  nodeRotationY,
  sizeOf,
  snapToGrid,
  toWorkspaceXY,
  worldPinPosition,
} from "./layout";
import type { CircuitNode } from "../types";

/**
 * 3D geometriya qatlami.
 *
 * Bu yerdagi asosiy shart — 2D va 3D BITTA modelni bo'lishishi (§42).
 * Shu sababli testlar «shakl chiroylimi» degan savolga emas, «pin
 * qayerda?» va «2D dan 3D ga o'tib qaytganda joy saqlanadimi?» degan
 * savollarga javob beradi: aynan shular buzilsa sim noto'g'ri joyga
 * ulanadi va simulyator butunlay boshqa zanjirni hisoblaydi.
 */

function node(type: string, x = 0, y = 0, rotation = 0): CircuitNode {
  return { id: `${type}-1`, type, x, y, rotation, settings: {} };
}

describe("komponent o'lchamlari", () => {
  it("katalogdagi HAR BIR komponentning 3D o'lchami yozilgan", () => {
    // Zaxira o'lcham bor, lekin unga tushgan komponent 3D da noto'g'ri
    // kattalikda ko'rinadi — bu test shuni oldini oladi.
    const missing = CATALOG.filter((c) => !hasExplicitSize(c.type)).map((c) => c.type);
    expect(missing).toEqual([]);
  });

  it("o'lchamlar musbat va pinlar korpus ichida", () => {
    for (const component of CATALOG) {
      const size = sizeOf(component.type);
      expect({ type: component.type, ok: size.w > 0 && size.d > 0 && size.h > 0 }).toEqual({
        type: component.type,
        ok: true,
      });
      // Pin balandligi korpusdan oshib ketmasin.
      expect(size.pinY).toBeLessThanOrEqual(size.h);
    }
  });

  it("Arduino Uno haqiqiy o'lchamda (6.86 × 5.34 sm)", () => {
    const size = sizeOf("arduino-uno");
    expect(size.w).toBeCloseTo(6.86, 2);
    expect(size.d).toBeCloseTo(5.34, 2);
  });
});

describe("2D ↔ 3D joylashuv", () => {
  it("ish maydoni koordinatasi 3D ga o'tib qaytganda saqlanadi", () => {
    // Bu 42-bandning asosi: bitta loyihani ikkala laboratoriyada ochish.
    for (const [x, y] of [
      [0, 0],
      [420, 300],
      [-150, 980],
    ] as const) {
      const at = nodePosition(node("led", x, y));
      expect(toWorkspaceXY(at.x, at.z)).toEqual({ x, y });
    }
  });

  it("stol ustidagi joy santimetrda", () => {
    const at = nodePosition(node("led", PX_PER_CM * 3, PX_PER_CM * 4));
    expect(at).toEqual({ x: 3, y: 0, z: 4 });
  });

  it("2D burilishi 3D da teskari belgi bilan qo'llanadi", () => {
    // 2D da burchak soat yo'nalishi bo'yicha, 3D da Y o'qi yuqoriga
    // qaragani uchun belgisi almashadi — aks holda komponent teskari burilardi.
    expect(nodeRotationY(node("led", 0, 0, 90))).toBeCloseTo(-Math.PI / 2, 6);
    // `toBeCloseTo` — belgisiz nol (`-0`) ham nol hisoblansin.
    expect(nodeRotationY(node("led", 0, 0, 0))).toBeCloseTo(0, 6);
  });

  it("panjaraga tegish yoqilganda 0.5 sm ga yaxlitlanadi", () => {
    expect(snapToGrid(1.24, true)).toBe(1);
    expect(snapToGrid(1.26, true)).toBe(1.5);
    expect(snapToGrid(1.26, false)).toBe(1.26);
  });
});

describe("pin joylashuvi", () => {
  it("pin nisbatlari katalogdan olinadi, qo'lda yozilmaydi", () => {
    const def = getDefinition("led")!;
    const anode = def.pins.find((p) => p.id === "anode")!;
    const size = sizeOf("led");
    const at = localPinPosition("led", "anode")!;

    expect(at.x).toBeCloseTo((anode.x - 0.5) * size.w, 6);
    expect(at.z).toBeCloseTo((anode.y - 0.5) * size.d, 6);
  });

  it("noma'lum pin uchun `null`", () => {
    expect(localPinPosition("led", "yoq-bunday")).toBeNull();
    expect(worldPinPosition(node("led"), "yoq-bunday")).toBeNull();
  });

  it("komponent burilganda pin ham buriladi", () => {
    const straight = worldPinPosition(node("arduino-uno"), "D13")!;
    const turned = worldPinPosition(node("arduino-uno", 0, 0, 90), "D13")!;

    // 90° burilishda markazdan masofa saqlanadi, yo'nalish o'zgaradi.
    expect(Math.hypot(turned.x, turned.z)).toBeCloseTo(Math.hypot(straight.x, straight.z), 6);
    expect(turned.x).not.toBeCloseTo(straight.x, 3);
  });

  it("komponent ko'chirilganda pin ham ko'chadi", () => {
    const at = worldPinPosition(node("arduino-uno", PX_PER_CM * 10, PX_PER_CM * 5), "D13")!;
    const base = worldPinPosition(node("arduino-uno"), "D13")!;
    expect(at.x).toBeCloseTo(base.x + 10, 6);
    expect(at.z).toBeCloseTo(base.z + 5, 6);
  });

  it("breadboarddagi 336 teshikning hammasi alohida nuqtada", () => {
    const positions = collectPinPositions({ nodes: [node("breadboard")], wires: [] });
    expect(positions.size).toBe(getDefinition("breadboard")!.pins.length);

    // Ikki teshik ustma-ust tushsa, sim noto'g'ri tugunga ulanardi.
    const seen = new Set([...positions.values()].map((p) => `${p.x.toFixed(3)}:${p.z.toFixed(3)}`));
    expect(seen.size).toBe(positions.size);
  });

  it("Arduino pinlari ham ustma-ust tushmaydi", () => {
    const positions = collectPinPositions({ nodes: [node("arduino-uno")], wires: [] });
    const seen = new Set([...positions.values()].map((p) => `${p.x.toFixed(3)}:${p.z.toFixed(3)}`));
    expect(seen.size).toBe(positions.size);
  });

  it("ulanmaydigan pinlar ro'yxatga kirmaydi", () => {
    const def = getDefinition("arduino-uno")!;
    const connectable = def.pins.filter((p) => p.connectable).length;
    const positions = collectPinPositions({ nodes: [node("arduino-uno")], wires: [] });
    expect(positions.size).toBe(connectable);
  });

  it("bir necha komponent birga to'g'ri joylashadi", () => {
    const positions = collectPinPositions({
      nodes: [node("arduino-uno", 0, 0), node("led", 500, 200)],
      wires: [],
    });
    const led = positions.get("led-1:anode")!;
    expect(led.x).toBeCloseTo(500 / PX_PER_CM + localPinPosition("led", "anode")!.x, 6);
  });
});

describe("ish stoli", () => {
  it("gilamcha ish maydonini to'liq qoplaydi", () => {
    // Komponentlar `TABLE` ichida joylashadi; gilamcha kichik bo'lsa
    // ularning bir qismi yalang'och yog'och ustida qolardi.
    expect(DESK.mat.width).toBeGreaterThanOrEqual(TABLE.width);
    expect(DESK.mat.depth).toBeGreaterThanOrEqual(TABLE.depth);
  });

  it("stol gilamchadan kattaroq — atrofida chekka qoladi", () => {
    expect(DESK.width).toBeGreaterThan(DESK.mat.width);
    expect(DESK.depth).toBeGreaterThan(DESK.mat.depth);
  });

  it("oyoqlar qopqoq ostida qoladi", () => {
    const legEdge = DESK.width / 2 - DESK.leg.inset;
    expect(legEdge).toBeLessThan(DESK.width / 2);
    expect(legEdge - DESK.leg.size).toBeGreaterThan(0);
  });

  it("qopqoq va gilamcha balandligi stol balandligidan kichik", () => {
    // Oyoq uzunligi shu ayirmadan chiqadi — manfiy bo'lsa stol teskari
    // qurilardi.
    expect(DESK.thickness + DESK.mat.thickness).toBeLessThan(DESK.height);
  });

  it("haqiqiy o'quv stoli o'lchamida", () => {
    // Masshtab hissi shunga tayanadi: Arduino (6.86 sm) stolga nisbatan
    // qanchalik kichik ekani ko'rinib turishi kerak.
    expect(DESK.height).toBeGreaterThan(60);
    expect(DESK.height).toBeLessThan(85);
    expect(sizeOf("arduino-uno").w).toBeLessThan(DESK.width / 10);
  });
});
