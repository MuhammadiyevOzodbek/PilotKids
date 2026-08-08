import { describe, expect, it } from "vitest";
import { parseSketch } from "./parser";
import { Simulator } from "./simulator";
import { validateCircuit } from "./validator";
import type { Circuit, CircuitNode } from "./types";

/**
 * Sensorni ulash usullari.
 *
 * Bitta sensorni bir necha xil to'g'ri usulda ulash mumkin. Bu testlar
 * ularning HAMMASI ishlashini kafolatlaydi: aks holda bola darslikdagidek
 * yig'sa ham `analogRead()` jimgina 0 qaytarardi.
 */

const CODE = `void setup() { Serial.begin(9600); }
void loop() { Serial.println(analogRead(A0)); delay(100); }`;

const uno: CircuitNode = { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} };
const ldr: CircuitNode = {
  id: "ldr",
  type: "ldr",
  x: 400,
  y: 0,
  rotation: 0,
  settings: { light: 640 },
};
const res = (id: string, ohms = 10000): CircuitNode => ({
  id,
  type: "resistor",
  x: 700,
  y: 0,
  rotation: 0,
  settings: { ohms },
});
const bb: CircuitNode = {
  id: "bb",
  type: "breadboard",
  x: 0,
  y: 400,
  rotation: 0,
  settings: {},
};

const link = (id: string, a: [string, string], b: [string, string]): Circuit["wires"][number] => ({
  id,
  from: { nodeId: a[0]!, pinId: a[1]! },
  to: { nodeId: b[0]!, pinId: b[1]! },
  color: "blue",
});

function reading(circuit: Circuit): string | undefined {
  const parsed = parseSketch(CODE);
  if (!parsed.ok) throw new Error(parsed.errors[0]?.message);
  const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
  sim.start();
  sim.advance(300);
  return sim
    .getLogs()
    .map((l) => l.text)
    .find((t) => /^\d+$/.test(t));
}

const notGroundedWarning = (circuit: Circuit) =>
  validateCircuit(circuit).some((i) => i.message.includes("yerga ulanmagan"));

describe("sensorni yerga ulash usullari", () => {
  it("1) gnd pini bevosita GND ga", () => {
    const circuit: Circuit = {
      nodes: [uno, ldr],
      wires: [
        link("v", ["ldr", "vcc"], ["uno", "5V"]),
        link("g", ["ldr", "gnd"], ["uno", "GND1"]),
        link("s", ["ldr", "signal"], ["uno", "A0"]),
      ],
    };
    expect(reading(circuit)).toBe("640");
    expect(notGroundedWarning(circuit)).toBe(false);
  });

  it("2) rezistor SIGNAL tomonida (bo'luvchi)", () => {
    const circuit: Circuit = {
      nodes: [uno, ldr, res("r")],
      wires: [
        link("v", ["ldr", "vcc"], ["uno", "5V"]),
        link("s", ["ldr", "signal"], ["uno", "A0"]),
        link("r1", ["ldr", "signal"], ["r", "a"]),
        link("r2", ["r", "b"], ["uno", "GND1"]),
      ],
    };
    expect(reading(circuit)).toBe("640");
    expect(notGroundedWarning(circuit)).toBe(false);
  });

  it("3) rezistor GND tomonida", () => {
    const circuit: Circuit = {
      nodes: [uno, ldr, res("r")],
      wires: [
        link("v", ["ldr", "vcc"], ["uno", "5V"]),
        link("s", ["ldr", "signal"], ["uno", "A0"]),
        link("r1", ["ldr", "gnd"], ["r", "a"]),
        link("r2", ["r", "b"], ["uno", "GND1"]),
      ],
    };
    expect(reading(circuit)).toBe("640");
    expect(notGroundedWarning(circuit)).toBe(false);
  });

  it("4) rezistor GND tomonida, yo'l breadboard orqali", () => {
    const circuit: Circuit = {
      nodes: [uno, ldr, res("r"), bb],
      wires: [
        link("v", ["ldr", "vcc"], ["uno", "5V"]),
        link("s", ["ldr", "signal"], ["uno", "A0"]),
        link("r1", ["ldr", "gnd"], ["r", "a"]),
        link("r2", ["r", "b"], ["bb", "t5-1"]),
        link("r3", ["bb", "t5-4"], ["bb", "nt3"]),
        link("r4", ["bb", "nt20"], ["uno", "GND1"]),
      ],
    };
    expect(reading(circuit)).toBe("640");
    expect(notGroundedWarning(circuit)).toBe(false);
  });

  it("5) yerga umuman yo'l yo'q — 0 qaytaradi va ogohlantiradi", () => {
    /*
     * Aynan shu holat foydalanuvchida chiqqan edi: rezistor breadboard
     * ustuniga borgan, lekin ustundan GND ga sim tortilmagan. Zanjir ochiq,
     * shuning uchun natija 0 — bu to'g'ri xatti-harakat, muhimi buni
     * ogohlantirish orqali AYTIB berish.
     */
    const circuit: Circuit = {
      nodes: [uno, ldr, res("r"), bb],
      wires: [
        link("v", ["ldr", "vcc"], ["uno", "5V"]),
        link("s", ["ldr", "signal"], ["uno", "A0"]),
        link("r1", ["ldr", "gnd"], ["r", "a"]),
        link("r2", ["r", "b"], ["bb", "t5-1"]),
      ],
    };
    expect(reading(circuit)).toBe("0");
    expect(notGroundedWarning(circuit)).toBe(true);
  });
});
