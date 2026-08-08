import { describe, expect, it } from "vitest";
import { getDefinition } from "./catalog";
import { parseSketch } from "./parser";
import { Simulator } from "./simulator";
import type { Circuit, CircuitNode } from "./types";

/**
 * Auditda topilgan simulyator xatolari.
 *
 * Har bir test aynan bitta noto'g'ri xulqni qulflaydi. Ular muhim,
 * chunki bola simulyatorda ishlagan kodni HAQIQIY platada takrorlashi
 * kerak — bu yerdagi farq uni chalg'itadi.
 */

const node = (
  id: string,
  type: string,
  settings: Record<string, string | number | boolean> = {},
): CircuitNode => ({
  id,
  type,
  x: 0,
  y: 0,
  rotation: 0,
  settings: { ...(getDefinition(type)?.defaults ?? {}), ...settings },
});

const wire = (id: string, a: [string, string], b: [string, string]): Circuit["wires"][number] => ({
  id,
  from: { nodeId: a[0], pinId: a[1] },
  to: { nodeId: b[0], pinId: b[1] },
  color: "blue",
});

function run(circuit: Circuit, code: string, ms = 60) {
  const parsed = parseSketch(code);
  if (!parsed.ok) throw new Error("PARSE: " + parsed.errors.map((e) => e.message).join("; "));
  const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
  sim.start();
  sim.advance(ms);
  return sim;
}

const uno = node("uno", "arduino-uno");

/** 5V → rezistor → D2. Pin yuqori darajada bo'lishi kerak. */
function pulledHighCircuit(): Circuit {
  return {
    nodes: [uno, node("r1", "resistor", { ohms: 10000 })],
    wires: [wire("w1", ["uno", "5V"], ["r1", "a"]), wire("w2", ["r1", "b"], ["uno", "D2"])],
  };
}

describe("pinMode chaqirilmagan pin", () => {
  it("digitalRead sxemadagi kuchlanishni ko'radi", () => {
    /*
     * Haqiqiy Arduino'da pin sukut bo'yicha INPUT. Ilgari `pinMode`
     * yozilmagan pin uchun simulyator sxemani umuman ko'rmasdi va doim
     * 0 qaytarardi — bola sxemasi to'g'ri bo'lsa ham kod ishlamasdi.
     */
    const sim = run(
      pulledHighCircuit(),
      `void setup(){ Serial.begin(9600); }
       void loop(){ Serial.println(digitalRead(2)); }`,
    );
    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().at(-1)?.text).toBe("1");
  });

  it("pinMode(INPUT) bilan ham xuddi shunday", () => {
    const sim = run(
      pulledHighCircuit(),
      `void setup(){ Serial.begin(9600); pinMode(2, INPUT); }
       void loop(){ Serial.println(digitalRead(2)); }`,
    );
    expect(sim.getLogs().at(-1)?.text).toBe("1");
  });
});

describe("tashqi pull-up rezistorli tugma", () => {
  /** 5V → 10 kΩ → D2, va D2 → tugma → GND. */
  const circuit: Circuit = {
    nodes: [uno, node("r1", "resistor", { ohms: 10000 }), node("btn", "push-button")],
    wires: [
      wire("w1", ["uno", "5V"], ["r1", "a"]),
      wire("w2", ["r1", "b"], ["uno", "D2"]),
      wire("w3", ["uno", "D2"], ["btn", "a"]),
      wire("w4", ["btn", "b"], ["uno", "GND1"]),
    ],
  };

  const code = `void setup(){ Serial.begin(9600); pinMode(2, INPUT); }
                void loop(){ Serial.println(digitalRead(2)); }`;

  it("bosilmagan tugmada pin YUQORI", () => {
    /*
     * Ilgari bo'shatilgan tugma shoxida sxema o'rniga `board.digital`
     * qaytarilardi, ya'ni doim 0. Bola `if (digitalRead(2) == LOW)`
     * yozsa, kod tugmaga tegmasdan doim ishlab turardi.
     */
    const sim = run(circuit, code);
    expect(sim.getLogs().at(-1)?.text).toBe("1");
  });

  it("bosilgan tugmada pin PAST", () => {
    const pressed: Circuit = {
      ...circuit,
      nodes: circuit.nodes.map((n) =>
        n.id === "btn" ? { ...n, settings: { ...n.settings, pressed: true } } : n,
      ),
    };
    const sim = run(pressed, code);
    expect(sim.getLogs().at(-1)?.text).toBe("0");
  });
});

describe("PWM bo'lmagan pinda analogWrite", () => {
  it("oraliq qiymat bermaydi — to'liq yoqadi yoki o'chiradi", () => {
    /*
     * Haqiqiy platada 13-pin PWM emas: `analogWrite(13, 200)` uni
     * to'liq HIGH qiladi. Ilgari simulyator qiymatni saqlab, LEDni
     * 78% yorqinlikda yoqardi — bola simulyatorda ko'rgan natijani
     * platada takrorlay olmasdi.
     */
    const circuit: Circuit = { nodes: [uno], wires: [] };

    const high = run(circuit, `void setup(){ analogWrite(13, 200); } void loop(){}`);
    expect(high.getRuntimeState()["uno"]?.pins?.D13).toBe(1);

    const low = run(circuit, `void setup(){ analogWrite(13, 40); } void loop(){}`);
    expect(low.getRuntimeState()["uno"]?.pins?.D13).toBe(0);
  });

  it("PWM pinida oraliq qiymat saqlanadi", () => {
    const circuit: Circuit = { nodes: [uno], wires: [] };
    const sim = run(circuit, `void setup(){ analogWrite(9, 128); } void loop(){}`);
    // D9 — PWM pin, shuning uchun bu yerda qirqim bo'lmasligi kerak.
    expect(sim.fatal).toBeNull();
  });
});

describe("ogohlantirishlar takrorlanmaydi", () => {
  it("pinMode ogohlantirishi bir marta yoziladi", () => {
    /*
     * `digitalWrite` har `loop()` da chaqiriladi. Ilgari ogohlantirish
     * ham har safar takrorlanardi va 500 qatorlik chegara bolaning
     * `Serial.println()` xabarlarini o'chirib yuborardi.
     */
    const sim = run(
      { nodes: [uno], wires: [] },
      `void setup(){ Serial.begin(9600); }
       void loop(){ digitalWrite(13, HIGH); delay(1); digitalWrite(13, LOW); delay(1); }`,
      400,
    );

    const warnings = sim.getLogs().filter((log) => log.text.includes("OUTPUT qilib sozlanmagan"));
    expect(warnings).toHaveLength(1);
  });

  it("PWM ogohlantirishi ham bir marta", () => {
    const sim = run(
      { nodes: [uno], wires: [] },
      `void setup(){ Serial.begin(9600); }
       void loop(){ analogWrite(13, 100); delay(1); }`,
      400,
    );

    const warnings = sim.getLogs().filter((log) => log.text.includes("PWM emas"));
    expect(warnings).toHaveLength(1);
  });
});
