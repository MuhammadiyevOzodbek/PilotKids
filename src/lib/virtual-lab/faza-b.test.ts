import { describe, expect, it } from "vitest";
import { CATALOG, getDefinition, KEYPAD_KEYS, SEGMENT_DIGITS } from "./catalog";
import { buildNetlist, netFor } from "./netlist";
import { parseSketch } from "./parser";
import { Simulator } from "./simulator";
import { sanitizeCircuit } from "./storage";
import { validateCircuit } from "./validator";
import type { Circuit, CircuitNode } from "./types";

/**
 * Faza B komponentlari — haqiqatan simulyatsiya qilinadimi.
 *
 * Bu to'plamning maqsadi bitta: har bir yangi komponent CHIZMA emas,
 * ishlaydigan model ekanini isbotlash. Shuning uchun tekshiruvlar
 * ko'rinishga emas, natijaga qaraydi — Serial'ga chiqqan son, motor
 * tezligi, yonayotgan segment, registrdagi bit.
 */

const w = (id: string, a: [string, string], b: [string, string]): Circuit["wires"][number] => ({
  id,
  from: { nodeId: a[0], pinId: a[1] },
  to: { nodeId: b[0], pinId: b[1] },
  color: "blue",
});

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

const uno = node("uno", "arduino-uno");

function run(circuit: Circuit, code: string, ms = 60, sensors: Record<string, number> = {}) {
  const parsed = parseSketch(code);
  if (!parsed.ok) throw new Error("PARSE: " + parsed.errors.map((e) => e.message).join("; "));
  const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors });
  sim.start();
  sim.advance(ms);
  if (sim.fatal) throw new Error("FATAL: " + sim.fatal);
  return sim;
}

/** Serial'ga oxirgi chiqqan son. */
function lastNumber(sim: Simulator): number {
  const text = sim.getLogs().at(-1)?.text ?? "";
  return Number(text);
}

const NEW_TYPES = [
  "diode",
  "capacitor",
  "npn-transistor",
  "joystick",
  "seven-segment",
  "shift-register",
  "l298n",
  "keypad-4x4",
] as const;

/* ═══════════════════ Umumiy: katalog, pinlar, saqlash ═══════════════════ */

describe("Faza B — katalog va saqlash", () => {
  it("laboratoriyada 30 ta komponent bor", () => {
    expect(CATALOG).toHaveLength(30);
  });

  const PIN_COUNTS: Record<string, number> = {
    diode: 2,
    capacitor: 2,
    "npn-transistor": 3,
    joystick: 5,
    "seven-segment": 9,
    "shift-register": 16,
    l298n: 13,
    "keypad-4x4": 8,
  };

  for (const type of NEW_TYPES) {
    it(`${type} — katalogda ro'yxatdan o'tgan va pinlari to'g'ri`, () => {
      const def = getDefinition(type);
      expect(def).not.toBeNull();
      expect(def!.pins).toHaveLength(PIN_COUNTS[type]!);
      // Har bir pin o'z joyida va noyob nomga ega.
      const ids = new Set(def!.pins.map((p) => p.id));
      expect(ids.size).toBe(def!.pins.length);
      for (const pin of def!.pins) {
        expect(pin.x).toBeGreaterThanOrEqual(0);
        expect(pin.x).toBeLessThanOrEqual(1);
        expect(pin.y).toBeGreaterThanOrEqual(0);
        expect(pin.y).toBeLessThanOrEqual(1);
        expect(pin.label.length).toBeGreaterThan(0);
      }
    });

    it(`${type} — saqlanadi va qayta o'qiladi (sozlamalar yo'qolmaydi)`, () => {
      const circuit: Circuit = { nodes: [node("x", type)], wires: [] };
      const restored = sanitizeCircuit(JSON.parse(JSON.stringify(circuit)) as Circuit);
      expect(restored.nodes).toHaveLength(1);
      expect(restored.nodes[0]!.type).toBe(type);
      expect(restored.nodes[0]!.settings).toEqual(getDefinition(type)!.defaults);
    });

    it(`${type} — pinlariga sim ulanadi va netlistga tushadi`, () => {
      const def = getDefinition(type)!;
      const first = def.pins[0]!;
      const circuit: Circuit = {
        nodes: [uno, node("x", type)],
        wires: [w("w1", ["x", first.id], ["uno", "GND1"])],
      };
      const net = buildNetlist(circuit);
      expect(netFor(net, "x", first.id)).toBe(netFor(net, "uno", "GND1"));
    });
  }
});

/* ═══════════════════════════════ Diod ═══════════════════════════════ */

describe("Diod", () => {
  const circuit = (forward: boolean): Circuit => ({
    nodes: [uno, node("d", "diode"), node("r", "resistor", { ohms: 220 })],
    wires: [
      w("w1", ["uno", "D9"], ["d", forward ? "a" : "k"]),
      w("w2", ["d", forward ? "k" : "a"], ["r", "a"]),
      w("w3", ["r", "b"], ["uno", "GND1"]),
    ],
  });

  const code = `void setup(){ pinMode(9, OUTPUT); digitalWrite(9, HIGH); } void loop(){}`;

  it("to'g'ri yo'nalishda tok o'tkazadi", () => {
    const state = run(circuit(true), code).getRuntimeState().d!;
    expect(state.forward).toBe(true);
    expect(state.milliamps!).toBeGreaterThan(5);
  });

  it("teskari yo'nalishda tokni to'sadi", () => {
    const state = run(circuit(false), code).getRuntimeState().d!;
    expect(state.forward).toBe(false);
    expect(state.milliamps!).toBeLessThan(0.01);
  });

  it("ochilish kuchlanishi sozlamadan olinadi", () => {
    const high = { ...circuit(true) };
    high.nodes = high.nodes.map((n) => (n.id === "d" ? node("d", "diode", { vf: 1.1 }) : n));
    const a = run(circuit(true), code).getRuntimeState().d!.milliamps!;
    const b = run(high, code).getRuntimeState().d!.milliamps!;
    // Kattaroq ochilish kuchlanishi = kamroq tok.
    expect(b).toBeLessThan(a);
  });
});

/* ══════════════════════════ Kondensator ══════════════════════════ */

describe("Kondensator", () => {
  const circuit = (reversed: boolean): Circuit => ({
    nodes: [uno, node("c", "capacitor", { microfarads: 100, polarized: true })],
    wires: [
      w("w1", ["uno", "5V"], ["c", reversed ? "minus" : "plus"]),
      w("w2", ["c", reversed ? "plus" : "minus"], ["uno", "GND1"]),
    ],
  });

  it("o'rnashgan holatda tok o'tkazmaydi (uzilgan zanjir)", () => {
    const state = run(circuit(false), `void setup(){} void loop(){}`).getRuntimeState().c!;
    expect(state.milliamps).toBe(0);
    // "+" uchi yuqori kuchlanishda — qutblanish to'g'ri.
    expect(state.acrossVolts!).toBeGreaterThan(4);
    expect(state.forward).toBe(true);
  });

  it("teskari ulanganda qutblanish xatosi aniqlanadi", () => {
    const state = run(circuit(true), `void setup(){} void loop(){}`).getRuntimeState().c!;
    expect(state.acrossVolts!).toBeLessThan(-4);
    expect(state.forward).toBe(false);
  });

  it("teskari ulangan elektrolit uchun ogohlantirish beriladi", () => {
    const issues = validateCircuit(circuit(true));
    expect(issues.some((i) => /polarite|qutb/i.test(i.message))).toBe(true);
  });

  it("sig'im sozlamasi saqlanadi", () => {
    const c: Circuit = { nodes: [node("c", "capacitor", { microfarads: 470 })], wires: [] };
    expect(sanitizeCircuit(c).nodes[0]!.settings.microfarads).toBe(470);
  });
});

/* ══════════════════════════ NPN tranzistor ══════════════════════════ */

describe("NPN tranzistor", () => {
  /** Arduino → baza rezistori → tranzistor → motor → batareya. */
  const circuit = (): Circuit => ({
    nodes: [
      uno,
      node("q", "npn-transistor", { beta: 100 }),
      node("rb", "resistor", { ohms: 1000 }),
      node("m", "dc-motor"),
      node("bat", "battery", { voltage: 9, enabled: true, polarity: "normal" }),
    ],
    wires: [
      w("w1", ["uno", "D5"], ["rb", "a"]),
      w("w2", ["rb", "b"], ["q", "b"]),
      w("w3", ["bat", "plus"], ["m", "t1"]),
      w("w4", ["m", "t2"], ["q", "c"]),
      w("w5", ["q", "e"], ["bat", "minus"]),
      w("w6", ["bat", "minus"], ["uno", "GND1"]),
    ],
  });

  const sketch = (level: string) =>
    `void setup(){ pinMode(5, OUTPUT); digitalWrite(5, ${level}); } void loop(){}`;

  it("baza toki bo'lmasa yopiq — motor aylanmaydi", () => {
    const sim = run(circuit(), sketch("LOW"));
    expect(sim.getRuntimeState().q!.transistor).toBe("off");
    expect(sim.getRuntimeState().m!.speed ?? 0).toBeLessThan(0.05);
  });

  it("baza qo'zg'atilganda ochiladi va motor aylanadi", () => {
    const sim = run(circuit(), sketch("HIGH"));
    const q = sim.getRuntimeState().q!;
    expect(q.transistor).not.toBe("off");
    expect(q.baseMilliamps!).toBeGreaterThan(1);
    expect(q.milliamps!).toBeGreaterThan(10);
    expect(sim.getRuntimeState().m!.speed!).toBeGreaterThan(0.3);
  });

  it("kollektor toki baza tokidan ancha katta (kuchaytirish)", () => {
    const q = run(circuit(), sketch("HIGH")).getRuntimeState().q!;
    expect(q.milliamps!).toBeGreaterThan(q.baseMilliamps! * 3);
  });
});

/* ══════════════════════════════ Joystik ══════════════════════════════ */

describe("Joystik moduli", () => {
  const circuit = (settings: Record<string, string | number | boolean>): Circuit => ({
    nodes: [uno, node("j", "joystick", settings)],
    wires: [
      w("w1", ["j", "vcc"], ["uno", "5V"]),
      w("w2", ["j", "gnd"], ["uno", "GND1"]),
      w("w3", ["j", "vrx"], ["uno", "A0"]),
      w("w4", ["j", "vry"], ["uno", "A1"]),
      w("w5", ["j", "sw"], ["uno", "D2"]),
    ],
  });

  const readX = `void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(20); }`;

  it("markazda ≈512 (ya'ni ≈2.5 V)", () => {
    const value = lastNumber(run(circuit({ x: 0, y: 0 }), readX));
    expect(value).toBeGreaterThan(470);
    expect(value).toBeLessThan(555);
  });

  it("chetki holatlarda 0 va 1023 ga yaqin", () => {
    expect(lastNumber(run(circuit({ x: -100 }), readX))).toBeLessThan(40);
    expect(lastNumber(run(circuit({ x: 100 }), readX))).toBeGreaterThan(985);
  });

  it("ikkinchi o'q mustaqil o'qiladi", () => {
    const readY = `void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A1)); delay(20); }`;
    const sim = run(circuit({ x: -100, y: 100 }), readY);
    expect(lastNumber(sim)).toBeGreaterThan(985);
  });

  it("SW tugmasi INPUT_PULLUP bilan o'qiladi", () => {
    const readSw = `void setup(){ pinMode(2, INPUT_PULLUP); Serial.begin(9600); } void loop(){ Serial.println(digitalRead(2)); delay(20); }`;
    expect(lastNumber(run(circuit({ pressed: false }), readSw))).toBe(1);
    expect(lastNumber(run(circuit({ pressed: true }), readSw))).toBe(0);
  });
});

/* ══════════════════════════ 7-segment ══════════════════════════ */

describe("7-segmentli indikator", () => {
  const SEGMENT_PINS: Record<string, number> = { a: 2, b: 3, c: 4, d: 5, e: 6, f: 7, g: 8 };

  /** Umumiy katod: har bir segment o'z rezistori orqali pinga ulanadi. */
  function circuit(): Circuit {
    const nodes: CircuitNode[] = [uno, node("s", "seven-segment", { common: "cathode" })];
    const wires: Circuit["wires"] = [w("gnd", ["s", "com"], ["uno", "GND1"])];
    for (const [segment, pin] of Object.entries(SEGMENT_PINS)) {
      nodes.push(node(`r${segment}`, "resistor", { ohms: 220 }));
      wires.push(w(`a${segment}`, ["uno", `D${pin}`], [`r${segment}`, "a"]));
      wires.push(w(`b${segment}`, [`r${segment}`, "b"], ["s", segment]));
    }
    return { nodes, wires };
  }

  function showDigit(digit: string) {
    const pattern = SEGMENT_DIGITS[digit]!;
    const setup = Object.entries(SEGMENT_PINS)
      .map(
        ([segment, pin]) =>
          `pinMode(${pin}, OUTPUT); digitalWrite(${pin}, ${pattern.includes(segment) ? "HIGH" : "LOW"});`,
      )
      .join(" ");
    return run(circuit(), `void setup(){ ${setup} } void loop(){}`);
  }

  it("0 raqami — oltita segment yonadi", () => {
    const state = showDigit("0").getRuntimeState().s!;
    expect(state.digit).toBe("0");
    expect(state.segments!.g).toBe(false);
    expect(state.segments!.a).toBe(true);
  });

  it("8 raqami — hamma segment yonadi", () => {
    const state = showDigit("8").getRuntimeState().s!;
    expect(state.digit).toBe("8");
    for (const segment of "abcdefg") expect(state.segments![segment]).toBe(true);
  });

  it("bitta segment alohida boshqariladi", () => {
    const setup = `pinMode(4, OUTPUT); digitalWrite(4, HIGH);`;
    const state = run(circuit(), `void setup(){ ${setup} } void loop(){}`).getRuntimeState().s!;
    expect(state.segments!.c).toBe(true);
    expect(state.segments!.a).toBe(false);
    // Bitta segment hech qanday raqamga mos kelmaydi.
    expect(state.digit).toBeNull();
  });

  it("hech narsa qo'zg'atilmasa segmentlar o'chiq", () => {
    const state = run(circuit(), `void setup(){} void loop(){}`).getRuntimeState().s!;
    expect(Object.values(state.segments!).every((on) => on === false)).toBe(true);
  });

  it("umumiy anod rejimida COM 5V ga ulanadi", () => {
    const c = circuit();
    c.nodes = c.nodes.map((n) =>
      n.id === "s" ? node("s", "seven-segment", { common: "anode" }) : n,
    );
    c.wires = c.wires.map((wire) =>
      wire.id === "gnd" ? w("gnd", ["s", "com"], ["uno", "5V"]) : wire,
    );
    // Umumiy anodda segment pini LOW bo'lganda yonadi.
    const setup = `pinMode(2, OUTPUT); digitalWrite(2, LOW);`;
    const state = run(c, `void setup(){ ${setup} } void loop(){}`).getRuntimeState().s!;
    expect(state.segments!.a).toBe(true);
  });
});

/* ══════════════════════════ 74HC595 ══════════════════════════ */

describe("74HC595 siljitish registri", () => {
  /** DS=8, SH_CP=12, ST_CP=11 — keng tarqalgan ulanish. */
  const circuit = (): Circuit => ({
    nodes: [uno, node("sr", "shift-register")],
    wires: [
      w("w1", ["sr", "vcc"], ["uno", "5V"]),
      w("w2", ["sr", "gnd"], ["uno", "GND1"]),
      w("w3", ["sr", "ser"], ["uno", "D8"]),
      w("w4", ["sr", "srclk"], ["uno", "D12"]),
      w("w5", ["sr", "rclk"], ["uno", "D11"]),
    ],
  });

  const header = `void setup(){ pinMode(8, OUTPUT); pinMode(12, OUTPUT); pinMode(11, OUTPUT);`;

  it("shiftOut baytni registrga yozadi", () => {
    const sim = run(
      circuit(),
      `${header} digitalWrite(11, LOW); shiftOut(8, 12, MSBFIRST, 0b10100000); digitalWrite(11, HIGH); } void loop(){}`,
    );
    const state = sim.getRuntimeState().sr!;
    // MSBFIRST: birinchi yuborilgan bit Q7 ga tushadi.
    expect(state.latchBits).toEqual([false, false, false, false, false, true, false, true]);
  });

  it("latch bo'lmasa chiqish o'zgarmaydi", () => {
    const sim = run(circuit(), `${header} shiftOut(8, 12, MSBFIRST, 0b11111111); } void loop(){}`);
    const state = sim.getRuntimeState().sr!;
    expect(state.shiftBits!.every((b) => b === true)).toBe(true);
    // RCLK ko'tarilmagan — chiqish hali eski.
    expect(state.latchBits!.every((b) => b === false)).toBe(true);
  });

  it("qo'lda takt berish ham ishlaydi (shiftOut'siz)", () => {
    const sim = run(
      circuit(),
      `${header}
         digitalWrite(8, HIGH);
         digitalWrite(12, LOW); digitalWrite(12, HIGH);
         digitalWrite(11, LOW); digitalWrite(11, HIGH);
       } void loop(){}`,
    );
    // Bitta bit kirdi — u eng birinchi chiqishda (Q0).
    expect(sim.getRuntimeState().sr!.latchBits![0]).toBe(true);
  });

  it("SRCLR past bo'lsa registr tozalanadi", () => {
    const c = circuit();
    c.wires.push(w("w6", ["sr", "srclr"], ["uno", "D7"]));
    const sim = run(
      c,
      `${header} pinMode(7, OUTPUT); digitalWrite(7, HIGH);
         shiftOut(8, 12, MSBFIRST, 0b11111111);
         digitalWrite(7, LOW);
       } void loop(){}`,
    );
    expect(sim.getRuntimeState().sr!.shiftBits!.every((b) => b === false)).toBe(true);
  });

  it("OE yuqori bo'lsa chiqish o'chadi", () => {
    const c = circuit();
    c.wires.push(w("w6", ["sr", "oe"], ["uno", "D6"]));
    const sim = run(
      c,
      `${header} pinMode(6, OUTPUT);
         digitalWrite(11, LOW); shiftOut(8, 12, MSBFIRST, 0b11111111); digitalWrite(11, HIGH);
         digitalWrite(6, HIGH);
       } void loop(){}`,
    );
    expect(sim.getRuntimeState().sr!.active).toBe(false);
  });

  it("chiqishga ulangan LED registr bitidan yonadi", () => {
    const c = circuit();
    c.nodes.push(node("led", "led"), node("r", "resistor", { ohms: 220 }));
    c.wires.push(
      w("q0", ["sr", "q0"], ["r", "a"]),
      w("q1", ["r", "b"], ["led", "anode"]),
      w("q2", ["led", "cathode"], ["uno", "GND1"]),
    );
    const sim = run(
      c,
      `${header} digitalWrite(11, LOW); shiftOut(8, 12, MSBFIRST, 0b00000001); digitalWrite(11, HIGH); } void loop(){}`,
    );
    expect(sim.getRuntimeState().led!.brightness!).toBeGreaterThan(0.3);
  });
});

/* ══════════════════════════ L298N ══════════════════════════ */

describe("L298N motor drayveri", () => {
  const circuit = (): Circuit => ({
    nodes: [
      uno,
      node("drv", "l298n", { supplyVoltage: 12 }),
      node("m", "dc-motor", { nominalVoltage: 12 }),
      node("bat", "battery", { voltage: 12, enabled: true, polarity: "normal" }),
    ],
    wires: [
      w("p1", ["bat", "plus"], ["drv", "vin"]),
      w("p2", ["bat", "minus"], ["drv", "gnd"]),
      w("p3", ["drv", "gnd"], ["uno", "GND1"]),
      w("m1", ["drv", "out1"], ["m", "t1"]),
      w("m2", ["drv", "out2"], ["m", "t2"]),
      w("c1", ["drv", "in1"], ["uno", "D7"]),
      w("c2", ["drv", "in2"], ["uno", "D8"]),
      w("c3", ["drv", "ena"], ["uno", "D9"]),
    ],
  });

  const sketch = (in1: string, in2: string, ena: string) =>
    `void setup(){ pinMode(7, OUTPUT); pinMode(8, OUTPUT); pinMode(9, OUTPUT);
       digitalWrite(7, ${in1}); digitalWrite(8, ${in2}); ${ena}
     } void loop(){}`;

  it("oldinga: IN1=HIGH, IN2=LOW", () => {
    const sim = run(circuit(), sketch("HIGH", "LOW", "digitalWrite(9, HIGH);"));
    const a = sim.getRuntimeState().drv!.channelA!;
    expect(a.mode).toBe("forward");
    expect(a.direction).toBe(1);
    expect(a.speed).toBeGreaterThan(0.5);
    // Motorning o'zi ham aylanayotgan bo'lishi kerak.
    expect(sim.getRuntimeState().m!.speed!).toBeGreaterThan(0.5);
  });

  it("orqaga: IN1=LOW, IN2=HIGH — motor teskari aylanadi", () => {
    const sim = run(circuit(), sketch("LOW", "HIGH", "digitalWrite(9, HIGH);"));
    const a = sim.getRuntimeState().drv!.channelA!;
    expect(a.mode).toBe("reverse");
    expect(a.direction).toBe(-1);
    expect(a.speed).toBeGreaterThan(0.5);
    expect(sim.getRuntimeState().m!.direction).toBe(-1);
  });

  it("ENA LOW bo'lsa motor to'xtaydi", () => {
    const sim = run(circuit(), sketch("HIGH", "LOW", "digitalWrite(9, LOW);"));
    expect(sim.getRuntimeState().drv!.channelA!.mode).toBe("stop");
    expect(sim.getRuntimeState().m!.speed ?? 0).toBeLessThan(0.05);
  });

  it("ikkala kirish bir xil bo'lsa — tormoz", () => {
    const sim = run(circuit(), sketch("HIGH", "HIGH", "digitalWrite(9, HIGH);"));
    expect(sim.getRuntimeState().drv!.channelA!.mode).toBe("brake");
    expect(sim.getRuntimeState().m!.speed ?? 0).toBeLessThan(0.05);
  });

  it("PWM tezlikni kamaytiradi", () => {
    const full = run(circuit(), sketch("HIGH", "LOW", "analogWrite(9, 255);"));
    const half = run(circuit(), sketch("HIGH", "LOW", "analogWrite(9, 100);"));
    const fullSpeed = full.getRuntimeState().drv!.channelA!.speed;
    const halfSpeed = half.getRuntimeState().drv!.channelA!.speed;
    expect(halfSpeed).toBeLessThan(fullSpeed);
    expect(halfSpeed).toBeGreaterThan(0);
  });

  it("motor kuchlanishi zanjirdan olinadi — 6 V da tezlik kamroq", () => {
    const low = circuit();
    low.nodes = low.nodes.map((n) =>
      n.id === "bat" ? node("bat", "battery", { voltage: 6, enabled: true }) : n,
    );
    const strong = run(circuit(), sketch("HIGH", "LOW", "digitalWrite(9, HIGH);"));
    const weak = run(low, sketch("HIGH", "LOW", "digitalWrite(9, HIGH);"));
    expect(weak.getRuntimeState().m!.speed!).toBeLessThan(strong.getRuntimeState().m!.speed!);
  });

  it("quvvat ulanmagan bo'lsa ogohlantiradi", () => {
    const c = circuit();
    c.wires = c.wires.filter((wire) => wire.id !== "p1");
    const issues = validateCircuit(c);
    expect(issues.some((i) => /L298N.*quvvat|quvvat.*ulanmagan/i.test(i.message))).toBe(true);
  });

  it("ikkinchi kanal mustaqil ishlaydi", () => {
    const c = circuit();
    c.nodes.push(node("m2", "dc-motor", { nominalVoltage: 12 }));
    c.wires.push(
      w("n1", ["drv", "out3"], ["m2", "t1"]),
      w("n2", ["drv", "out4"], ["m2", "t2"]),
      w("n3", ["drv", "in3"], ["uno", "D4"]),
      w("n4", ["drv", "in4"], ["uno", "D5"]),
    );
    const sim = run(
      c,
      `void setup(){
         pinMode(7, OUTPUT); pinMode(8, OUTPUT); pinMode(9, OUTPUT);
         pinMode(4, OUTPUT); pinMode(5, OUTPUT);
         digitalWrite(7, LOW); digitalWrite(8, LOW); digitalWrite(9, HIGH);
         digitalWrite(4, HIGH); digitalWrite(5, LOW);
       } void loop(){}`,
    );
    // A kanali to'xtagan (ikkalasi LOW = tormoz), B kanali oldinga.
    expect(sim.getRuntimeState().drv!.channelB!.mode).toBe("forward");
    expect(sim.getRuntimeState().m2!.speed!).toBeGreaterThan(0.5);
  });
});

/* ══════════════════════════ 4×4 klaviatura ══════════════════════════ */

describe("4×4 klaviatura", () => {
  const ROW_PINS = [2, 3, 4, 5];
  const COL_PINS = [6, 7, 8, 9];

  function circuit(key: string): Circuit {
    const nodes: CircuitNode[] = [uno, node("kp", "keypad-4x4", { key })];
    const wires: Circuit["wires"] = [];
    ROW_PINS.forEach((pin, i) => wires.push(w(`r${i}`, ["kp", `r${i + 1}`], ["uno", `D${pin}`])));
    COL_PINS.forEach((pin, i) => wires.push(w(`c${i}`, ["kp", `c${i + 1}`], ["uno", `D${pin}`])));
    return { nodes, wires };
  }

  /** Haqiqiy skanerlash: bitta qatorni LOW qilib, ustunlarni o'qiydi. */
  const scanner = `
    int rows[4] = {2, 3, 4, 5};
    int cols[4] = {6, 7, 8, 9};
    void setup() {
      Serial.begin(9600);
      for (int i = 0; i < 4; i++) { pinMode(rows[i], OUTPUT); digitalWrite(rows[i], HIGH); }
      for (int i = 0; i < 4; i++) { pinMode(cols[i], INPUT_PULLUP); }
    }
    void loop() {
      for (int r = 0; r < 4; r++) {
        digitalWrite(rows[r], LOW);
        for (int c = 0; c < 4; c++) {
          if (digitalRead(cols[c]) == LOW) { Serial.println(r * 4 + c); }
        }
        digitalWrite(rows[r], HIGH);
      }
      delay(20);
    }`;

  it("bosilgan tugma qator va ustunni elektr jihatdan tutashtiradi", () => {
    const net = buildNetlist(circuit("5"));
    // "5" — 2-qator, 2-ustun.
    expect(netFor(net, "kp", "r2")).toBe(netFor(net, "kp", "c2"));
    // Boshqa qator tutashmagan.
    expect(netFor(net, "kp", "r1")).not.toBe(netFor(net, "kp", "c2"));
  });

  it("hech narsa bosilmasa hech bir kontakt yopilmaydi", () => {
    const net = buildNetlist(circuit(""));
    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= 4; c++) {
        expect(netFor(net, "kp", `r${r}`)).not.toBe(netFor(net, "kp", `c${c}`));
      }
    }
  });

  it("Arduino skanerlash kodi bosilgan tugmani topadi", () => {
    // "5" → indeks 1*4 + 1 = 5.
    expect(lastNumber(run(circuit("5"), scanner, 120))).toBe(5);
    // "A" → 0-qator, 3-ustun → 3.
    expect(lastNumber(run(circuit("A"), scanner, 120))).toBe(3);
    // "D" → 3-qator, 3-ustun → 15.
    expect(lastNumber(run(circuit("D"), scanner, 120))).toBe(15);
  });

  it("hech narsa bosilmasa skanerlash hech nima topmaydi", () => {
    const sim = run(circuit(""), scanner, 120);
    expect(sim.getLogs().filter((l) => /^\d+$/.test(l.text))).toHaveLength(0);
  });

  it("har bir tugma o'z qator/ustuniga ega", () => {
    for (const row of KEYPAD_KEYS) {
      for (const key of row) {
        const net = buildNetlist(circuit(key));
        const closed: string[] = [];
        for (let r = 1; r <= 4; r++) {
          for (let c = 1; c <= 4; c++) {
            if (netFor(net, "kp", `r${r}`) === netFor(net, "kp", `c${c}`)) closed.push(`${r}${c}`);
          }
        }
        expect(closed).toHaveLength(1);
      }
    }
  });
});
