import { describe, expect, it } from "vitest";
import {
  MAX_FRAME,
  MIN_HEIGHT,
  MOVE_KEYS,
  SPEED,
  movementFrom,
  navigationShift,
  type NavigationInput,
} from "./navigation";

/**
 * Klaviatura bilan yurish.
 *
 * Hisob sof funksiyada bo'lgani uchun uni kamerasiz ham tekshirish
 * mumkin: kirish — bosilgan tugmalar va kameraning holati, chiqish —
 * siljish vektori.
 */

/** Standart holat: kamera nishondan 20 sm balandda va orqada, oldinga qaragan. */
function scene(overrides: Partial<NavigationInput> = {}): NavigationInput {
  return {
    forward: 0,
    strafe: 0,
    lift: 0,
    camera: { x: 0, y: 14, z: 20 },
    target: { x: 0, y: 0, z: 0 },
    // −Z tomonga qaraydi.
    direction: { x: 0, y: -0.5, z: -1 },
    delta: 1 / 60,
    boost: false,
    bounds: { x: 90, z: 70 },
    ...overrides,
  };
}

describe("tugmalarni yig'ish", () => {
  it("W va o'q tugmalari bir xil ishlaydi", () => {
    expect(movementFrom(["KeyW"])).toEqual(movementFrom(["ArrowUp"]));
    expect(movementFrom(["KeyA"])).toEqual(movementFrom(["ArrowLeft"]));
  });

  it("qarama-qarshi tugmalar bir-birini yo'qotadi", () => {
    expect(movementFrom(["KeyW", "KeyS"])).toEqual({ forward: 0, strafe: 0, lift: 0 });
  });

  it("bir vaqtda ikki yo'nalish qo'shiladi", () => {
    expect(movementFrom(["KeyW", "KeyD"])).toEqual({ forward: 1, strafe: 1, lift: 0 });
  });

  it("begona tugma e'tiborga olinmaydi", () => {
    expect(movementFrom(["KeyZ", "KeyP"])).toEqual({ forward: 0, strafe: 0, lift: 0 });
  });

  it("balandlik chap Shift va bo'shliqda", () => {
    expect(movementFrom(["Space"])).toEqual({ forward: 0, strafe: 0, lift: 1 });
    expect(movementFrom(["ShiftLeft"])).toEqual({ forward: 0, strafe: 0, lift: -1 });
    expect(movementFrom(["Space", "ShiftLeft"])).toEqual({ forward: 0, strafe: 0, lift: 0 });
    // Eski tugmalar endi kameraga tegmaydi.
    expect(movementFrom(["KeyQ", "KeyE"])).toEqual({ forward: 0, strafe: 0, lift: 0 });
  });

  it("kalitlar fizik tugma kodlari — klaviatura tili ahamiyatsiz", () => {
    // `key` ishlatilganda kirill tartibida "ц" kelib, harakat to'xtardi.
    // `ShiftLeft` ham fizik kod: `key` da u shunchaki "Shift" bo'lardi va
    // chap bilan o'ng Shift ajralmasdi.
    for (const code of Object.keys(MOVE_KEYS)) {
      expect(code).toMatch(/^(Key[A-Z]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft)$/);
    }
  });
});

describe("uzoq turgandan keyingi birinchi kadr", () => {
  /*
   * ENG MUHIM TEST.
   *
   * Sahna `frameloop="demand"` rejimida: bo'sh turganda kadr chizilmaydi
   * va `delta` oxirgi chizilgan kadrdan beri o'tgan vaqtni beradi. Yarim
   * daqiqa qimirlamay turib `W` bosilsa, `delta ≈ 30` bo'lardi va kamera
   * bitta kadrda butun stolni kesib o'tib ketardi — foydalanuvchi ko'rgan
   * xato aynan shu edi.
   */
  it("katta `delta` kamerani uloqtirib yubormaydi", () => {
    const jump = navigationShift(scene({ forward: 1, delta: 30 }));
    const normal = navigationShift(scene({ forward: 1, delta: 1 / 60 }));

    // Uzoq tanaffusdan keyingi qadam oddiy kadrnikidan uch baravardan
    // ko'p farq qilmasin.
    expect(Math.abs(jump.z)).toBeLessThan(Math.abs(normal.z) * 4);
  });

  it("chegaralangan qadam MAX_FRAME dan oshmaydi", () => {
    const capped = navigationShift(scene({ forward: 1, delta: 10 }));
    const exact = navigationShift(scene({ forward: 1, delta: MAX_FRAME }));
    expect(capped.z).toBeCloseTo(exact.z, 10);
  });
});

describe("yo'nalishlar", () => {
  it("W qarash tomoniga olib boradi", () => {
    const shift = navigationShift(scene({ forward: 1 }));
    expect(shift.z).toBeLessThan(0);
    expect(shift.x).toBeCloseTo(0, 10);
  });

  it("S orqaga qaytaradi", () => {
    const shift = navigationShift(scene({ forward: -1 }));
    expect(shift.z).toBeGreaterThan(0);
  });

  it("D o'ngga, A chapga siljitadi", () => {
    // −Z ga qarab turganda o'ng tomon — +X.
    expect(navigationShift(scene({ strafe: 1 })).x).toBeGreaterThan(0);
    expect(navigationShift(scene({ strafe: -1 })).x).toBeLessThan(0);
  });

  it("oldinga yurish balandlikni o'zgartirmaydi", () => {
    // Kamera pastga qarab tursa ham `W` uni stol ichiga kirgizmasin.
    const shift = navigationShift(scene({ forward: 1, direction: { x: 0, y: -3, z: -1 } }));
    expect(shift.y).toBe(0);
  });

  it("tik pastga qaraganda ham harakat to'xtamaydi", () => {
    const shift = navigationShift(scene({ forward: 1, direction: { x: 0, y: -1, z: 0 } }));
    expect(Math.hypot(shift.x, shift.z)).toBeGreaterThan(0);
  });
});

describe("balandlik", () => {
  it("E kamerani ko'taradi", () => {
    expect(navigationShift(scene({ lift: 1 })).y).toBeGreaterThan(0);
  });

  it("Q kamerani tushiradi", () => {
    /*
     * Ilgari bu ishlamasdi: chegara NISHONNING balandligiga qo'yilgandi
     * va nishon boshidanoq nolda turgani uchun `Q` har doim nolga
     * yaxlitlanardi.
     */
    expect(navigationShift(scene({ lift: -1 })).y).toBeLessThan(0);
  });

  it("kamera stol ostiga tusha olmaydi", () => {
    const low = scene({ lift: -1, camera: { x: 0, y: MIN_HEIGHT, z: 20 } });
    expect(navigationShift(low).y).toBe(0);
  });

  it("chegaraga yetganda aynan chegarada to'xtaydi", () => {
    const near = scene({ lift: -1, camera: { x: 0, y: MIN_HEIGHT + 0.01, z: 20 }, delta: 1 });
    expect(near.camera.y + navigationShift(near).y).toBeCloseTo(MIN_HEIGHT, 10);
  });
});

describe("tezlik", () => {
  it("uzoqdan qaraganda tezroq yuriladi", () => {
    const near = navigationShift(scene({ forward: 1, camera: { x: 0, y: 3, z: 5 } }));
    const far = navigationShift(scene({ forward: 1, camera: { x: 0, y: 25, z: 35 } }));
    expect(Math.abs(far.z)).toBeGreaterThan(Math.abs(near.z));
  });

  it("Shift tezlashtiradi", () => {
    const plain = navigationShift(scene({ forward: 1 }));
    const fast = navigationShift(scene({ forward: 1, boost: true }));
    expect(Math.abs(fast.z)).toBeCloseTo(Math.abs(plain.z) * SPEED.boost, 6);
  });

  it("juda yaqindan ham harakat sezilarli qoladi", () => {
    const shift = navigationShift(
      scene({ forward: 1, camera: { x: 0, y: 0.5, z: 0.5 }, delta: 1 }),
    );
    expect(Math.abs(shift.z)).toBeCloseTo(SPEED.min * MAX_FRAME, 6);
  });
});

describe("chegaralar", () => {
  it("nishon stol atrofidan chiqib ketmaydi", () => {
    const edge = scene({
      forward: 1,
      target: { x: 0, y: 0, z: -70 },
      camera: { x: 0, y: 14, z: -50 },
      delta: 1,
      boost: true,
    });
    expect(edge.target.z + navigationShift(edge).z).toBeGreaterThanOrEqual(-edge.bounds.z);
  });

  it("chegarada turganda oldinga harakat nolga aylanadi", () => {
    const edge = scene({
      forward: 1,
      target: { x: 0, y: 0, z: -70 },
      camera: { x: 0, y: 14, z: -50 },
    });
    expect(navigationShift(edge).z).toBe(0);
  });

  it("chegaradan orqaga qaytish mumkin", () => {
    const edge = scene({
      forward: -1,
      target: { x: 0, y: 0, z: -70 },
      camera: { x: 0, y: 14, z: -50 },
    });
    expect(navigationShift(edge).z).toBeGreaterThan(0);
  });
});

describe("harakatsizlik", () => {
  it("hech qanday tugma bosilmagan bo'lsa siljish yo'q", () => {
    expect(navigationShift(scene())).toEqual({ x: 0, y: 0, z: 0 });
  });
});
