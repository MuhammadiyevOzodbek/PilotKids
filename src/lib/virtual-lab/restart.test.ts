import { describe, expect, it } from "vitest";
import { LIVE_CONTROLS, LIVE_SETTING_KEYS, SENSOR_CONTROLS } from "./live-controls";
import { needsSimulationRestart } from "./restart";
import { getDefinition } from "./catalog";
import type { Circuit, CircuitNode } from "./types";

/**
 * Simulyatsiyani qayta ishga tushirish qoidasi va jonli boshqaruvlar.
 *
 * Bu ikki modul 2D va 3D laboratoriya uchun BITTA manba. Ilgari qoida
 * faqat 2D da bor edi va 3D da ishlayotgan simulyator sxema o'zgarsa ham
 * eskisini hisoblashda davom etardi.
 */

function node(overrides: Partial<CircuitNode> = {}): CircuitNode {
  return {
    id: "n1",
    type: "led",
    x: 100,
    y: 100,
    rotation: 0,
    settings: { color: "red" },
    ...overrides,
  };
}

function circuit(nodes: CircuitNode[] = [node()]): Circuit {
  return { nodes, wires: [] };
}

const CODE = "void setup() {}\nvoid loop() {}";

describe("qayta ishga tushirish shart emas", () => {
  it("hech narsa o'zgarmagan", () => {
    const doc = { circuit: circuit(), code: CODE };
    expect(needsSimulationRestart(doc, { circuit: circuit(), code: CODE })).toBe(false);
  });

  it("jonli sozlama o'zgargan — potensiometr burildi", () => {
    /*
     * Bu ENG muhim holat: agar potensiometr burilishi qayta ishga
     * tushirishni talab qilsa, bola slayderni surishi bilan simulyatsiya
     * uzilib qolardi.
     */
    const before = circuit([node({ type: "potentiometer", settings: { value: 100 } })]);
    const after = circuit([node({ type: "potentiometer", settings: { value: 900 } })]);
    expect(
      needsSimulationRestart({ circuit: before, code: CODE }, { circuit: after, code: CODE }),
    ).toBe(false);
  });

  it("tugma bosilgan", () => {
    const before = circuit([node({ type: "push-button", settings: { pressed: false } })]);
    const after = circuit([node({ type: "push-button", settings: { pressed: true } })]);
    expect(
      needsSimulationRestart({ circuit: before, code: CODE }, { circuit: after, code: CODE }),
    ).toBe(false);
  });
});

describe("qayta ishga tushirish SHART", () => {
  it("kod o'zgargan", () => {
    const doc = { circuit: circuit(), code: CODE };
    expect(needsSimulationRestart(doc, { circuit: circuit(), code: `${CODE}\n` })).toBe(true);
  });

  it("komponent qo'shilgan", () => {
    const before = { circuit: circuit(), code: CODE };
    const after = { circuit: circuit([node(), node({ id: "n2" })]), code: CODE };
    expect(needsSimulationRestart(before, after)).toBe(true);
  });

  it("sim ulangan", () => {
    const before = { circuit: circuit(), code: CODE };
    const after = {
      circuit: {
        nodes: [node()],
        wires: [
          {
            id: "w1",
            color: "red" as const,
            from: { nodeId: "n1", pinId: "anode" },
            to: { nodeId: "n1", pinId: "cathode" },
          },
        ],
      },
      code: CODE,
    };
    expect(needsSimulationRestart(before, after)).toBe(true);
  });

  it("komponent ko'chirilgan — breadboarddagi ulanish o'zgarishi mumkin", () => {
    const before = { circuit: circuit(), code: CODE };
    const after = { circuit: circuit([node({ x: 400 })]), code: CODE };
    expect(needsSimulationRestart(before, after)).toBe(true);
  });

  it("burilgan", () => {
    const before = { circuit: circuit(), code: CODE };
    const after = { circuit: circuit([node({ rotation: 90 })]), code: CODE };
    expect(needsSimulationRestart(before, after)).toBe(true);
  });

  it("jonli BO'LMAGAN sozlama o'zgargan — rezistor qiymati", () => {
    const before = circuit([node({ type: "resistor", settings: { ohms: 220 } })]);
    const after = circuit([node({ type: "resistor", settings: { ohms: 1000 } })]);
    expect(
      needsSimulationRestart({ circuit: before, code: CODE }, { circuit: after, code: CODE }),
    ).toBe(true);
  });

  it("jonli komponentning BOSHQA sozlamasi o'zgargan", () => {
    // Potensiometrda `value` jonli, qolgani esa sxemaning bir qismi.
    const before = circuit([
      node({ type: "potentiometer", settings: { value: 100, ohms: 10000 } }),
    ]);
    const after = circuit([node({ type: "potentiometer", settings: { value: 100, ohms: 50000 } })]);
    expect(
      needsSimulationRestart({ circuit: before, code: CODE }, { circuit: after, code: CODE }),
    ).toBe(true);
  });
});

describe("jonli boshqaruvlar", () => {
  it("har bir boshqaruvning kaliti katalogda bor", () => {
    // Kalit noto'g'ri bo'lsa slayder hech narsani o'zgartirmasdi.
    for (const [type, control] of Object.entries(LIVE_CONTROLS)) {
      const def = getDefinition(type);
      expect(def, type).toBeDefined();
      const keys = def!.settings.map((setting) => setting.key);
      expect(keys, `${type}.${control.key}`).toContain(control.key);
    }
  });

  it("kalitlar jadvali boshqaruvlar bilan mos", () => {
    for (const [type, control] of Object.entries(LIVE_CONTROLS)) {
      expect(LIVE_SETTING_KEYS[type]).toBe(control.key);
    }
  });

  it("sensor slayderlari faqat suriluvchi turlar", () => {
    for (const control of Object.values(SENSOR_CONTROLS)) {
      expect(control.kind).toBe("range");
    }
    expect(SENSOR_CONTROLS["push-button"]).toBeUndefined();
  });

  it("oraliqlar mantiqiy", () => {
    for (const [type, control] of Object.entries(LIVE_CONTROLS)) {
      expect(control.min, type).toBeLessThan(control.max);
    }
  });
});
