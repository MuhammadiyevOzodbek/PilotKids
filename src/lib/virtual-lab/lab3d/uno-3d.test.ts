import { describe, expect, it } from "vitest";
import { getDefinition } from "../catalog";
import { localPinPosition, sizeOf } from "./layout";
import {
  MCU_PINS_PER_SIDE,
  SOCKET_W,
  UNO_CORNER_R,
  UNO_H,
  mcuLegPositions,
  part3,
  unoHeaderBlocks,
  unoOutlineCorners,
  unoPinHint,
  uw,
  ux,
  uz,
} from "./uno-3d";
import { UNO_BOARD, UNO_PARTS, UNO_PINS, UNO_PITCH, UNO_VIEWBOX } from "../uno-layout";

/**
 * 3D Arduino modelining geometriyasi.
 *
 * Testlarning maqsadi — modelning "chiroyliligini" emas, 2D chizma bilan
 * BOG'LIQLIGINI qo'riqlash. Agar kimdir 3D da qismni qo'lda siljitsa yoki
 * chizmadagi o'lchamni o'zgartirsa, quyidagilardan biri yiqiladi.
 */

describe("chizma birligidan santimetrga", () => {
  it("plata markazi nolga to'g'ri keladi", () => {
    expect(ux(UNO_VIEWBOX.width / 2)).toBeCloseTo(0, 10);
    expect(uz(UNO_VIEWBOX.height / 2)).toBeCloseTo(0, 10);
  });

  it("katalogdagi pin nuqtasi bilan AYNAN bir joyga tushadi", () => {
    // Aynan shu narsa 3D dagi uya bilan bosiladigan nuqtani bog'lab turadi.
    for (const spec of UNO_PINS) {
      const at = localPinPosition("arduino-uno", spec.id);
      expect(at, spec.id).not.toBeNull();
      expect(at!.x, spec.id).toBeCloseTo(ux(spec.x), 10);
      expect(at!.z, spec.id).toBeCloseTo(uz(spec.y), 10);
    }
  });
});

describe("vertikal qatlamlar", () => {
  it("plata va konnektor balandligi pin nuqtasida tugaydi", () => {
    // Sim uchi shu balandlikka ulanadi; farq bo'lsa sim havoda osilib qolardi.
    expect(UNO_H.pcb + UNO_H.header).toBeCloseTo(sizeOf("arduino-uno").pinY, 10);
    expect(UNO_H.socket).toBe(sizeOf("arduino-uno").pinY);
  });

  it("plata haqiqiy tekstolit qalinligida — kub emas", () => {
    expect(UNO_H.pcb).toBeLessThan(0.3);
  });
});

describe("plata konturi", () => {
  const corners = unoOutlineCorners();

  it("o'ng chekkadagi o'yiq bilan sakkiz burchakli", () => {
    expect(corners).toHaveLength(8);
  });

  it("hamma burchak plata gabaritidan chiqmaydi", () => {
    const left = ux(UNO_BOARD.x);
    const right = ux(UNO_BOARD.x + UNO_BOARD.w);
    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(left - 1e-9);
      expect(corner.x).toBeLessThanOrEqual(right + 1e-9);
    }
  });

  it("yumaloqlash radiusi eng qisqa qirradan kichik bo'lishi mumkin", () => {
    /*
     * O'yiq atrofidagi qirralar juda qisqa. Chizuvchi radiusni har bir
     * burchak uchun cheklaydi; bu test ana shu cheklov KERAKLIGINI
     * hujjatlaydi — aks holda kontur o'z-o'zini kesib o'tardi.
     */
    const shortest = Math.min(
      ...corners.map((corner, i) => {
        const next = corners[(i + 1) % corners.length]!;
        return Math.hypot(next.x - corner.x, next.z - corner.z);
      }),
    );
    expect(shortest).toBeLessThan(UNO_CORNER_R * 2);
  });
});

describe("ayol konnektorlar", () => {
  const blocks = unoHeaderBlocks();

  it("haqiqiy platadagidek to'rtta blokka bo'linadi", () => {
    // Yuqorida D0–D7 va D8–AREF, pastda POWER va ANALOG IN.
    expect(blocks).toHaveLength(4);
  });

  it("har bir ulanadigan pin aynan bitta uyaga tushadi", () => {
    const sockets = blocks.flatMap((block) => block.sockets.map((socket) => socket.spec.id));
    expect([...sockets].sort()).toEqual([...UNO_PINS.map((p) => p.id)].sort());
  });

  it("uya markazi pin nuqtasi bilan bir joyda", () => {
    for (const block of blocks) {
      for (const socket of block.sockets) {
        const at = localPinPosition("arduino-uno", socket.spec.id);
        expect(socket.x, socket.spec.id).toBeCloseTo(at!.x, 10);
        expect(block.z, socket.spec.id).toBeCloseTo(at!.z, 10);
      }
    }
  });

  it("uya qo'shni uyaga urilmaydi", () => {
    expect(SOCKET_W).toBeLessThan(uw(UNO_PITCH));
  });

  it("korpus hamma uyasini o'z ichiga oladi", () => {
    for (const block of blocks) {
      const left = block.cx - block.w / 2;
      const right = block.cx + block.w / 2;
      for (const socket of block.sockets) {
        expect(socket.x).toBeGreaterThan(left);
        expect(socket.x).toBeLessThan(right);
      }
    }
  });
});

describe("mikrokontroller", () => {
  const body = part3(UNO_PARTS.mcu);
  const legs = mcuLegPositions(body);

  it("DIP-28 — har tomonda o'n to'rttadan oyoq", () => {
    expect(legs).toHaveLength(MCU_PINS_PER_SIDE * 2);
  });

  it("oyoqlar korpusning ikki tomonida, tashqarisida", () => {
    const zs = [...new Set(legs.map((leg) => Math.round(leg.z * 1000)))];
    expect(zs).toHaveLength(2);
    for (const leg of legs) {
      expect(Math.abs(leg.z - body.cz)).toBeGreaterThan(body.d / 2);
    }
  });

  it("oyoqlar korpus kengligiga sig'adi", () => {
    for (const leg of legs) {
      expect(leg.x).toBeGreaterThan(body.cx - body.w / 2);
      expect(leg.x).toBeLessThan(body.cx + body.w / 2);
    }
  });
});

describe("qismlarning joylashuvi", () => {
  it("hamma qism plata gabaritidan chiqib ketmaydi", () => {
    const { w, d } = sizeOf("arduino-uno");
    for (const [name, rect] of Object.entries(UNO_PARTS)) {
      const p = part3(rect);
      expect(Math.abs(p.cx) + p.w / 2, name).toBeLessThanOrEqual(w / 2 + 1e-9);
      expect(Math.abs(p.cz) + p.d / 2, name).toBeLessThanOrEqual(d / 2 + 1e-9);
    }
  });

  it("USB va quvvat uyasi plataning chap qirrasida", () => {
    expect(part3(UNO_PARTS.usb).cx).toBeLessThan(0);
    expect(part3(UNO_PARTS.dcJack).cx).toBeLessThan(0);
  });

  it("USB orqada, quvvat uyasi oldinda — bir-birining ustiga tushmaydi", () => {
    const usb = part3(UNO_PARTS.usb);
    const jack = part3(UNO_PARTS.dcJack);
    expect(usb.cz + usb.d / 2).toBeLessThan(jack.cz - jack.d / 2);
  });
});

describe("pin izohi", () => {
  it("har bir plata pini uchun matn bor", () => {
    for (const spec of UNO_PINS) {
      const hint = unoPinHint(spec.id);
      expect(hint, spec.id).not.toBeNull();
      expect(hint!.silk).toBe(spec.silk);
      expect(hint!.note.length).toBeGreaterThan(0);
    }
  });

  it("PWM pinlari alohida belgilanadi", () => {
    expect(unoPinHint("D9")!.note).toContain("PWM");
    expect(unoPinHint("D8")!.note).not.toContain("PWM");
  });

  it("plataga tegishli bo'lmagan pin uchun null", () => {
    expect(unoPinHint("anode")).toBeNull();
  });
});

describe("katalog bilan bog'liqlik", () => {
  it("chizmadagi har bir pin katalogda ham bor", () => {
    const catalog = new Set(getDefinition("arduino-uno")?.pins.map((p) => p.id));
    for (const spec of UNO_PINS) expect(catalog.has(spec.id), spec.id).toBe(true);
  });
});
