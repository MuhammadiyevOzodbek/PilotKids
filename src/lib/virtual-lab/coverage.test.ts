import { describe, expect, it } from "vitest";
import { CATALOG, getDefinition } from "./catalog";
import { parseSketch } from "./parser";
import { Simulator } from "./simulator";
import { validateCircuit } from "./validator";
import { LESSONS, checkLesson, getLesson } from "./lessons";
import { readFileSync } from "node:fs";
import type { Circuit, CircuitNode } from "./types";

/** Audit: har bir komponent haqiqatan javob beradimi. */

const w = (id: string, a: [string, string], b: [string, string]): Circuit["wires"][number] => ({
  id,
  from: { nodeId: a[0], pinId: a[1] },
  to: { nodeId: b[0], pinId: b[1] },
  color: "blue",
});

function run(circuit: Circuit, code: string, ms = 60, sensors: Record<string, number> = {}) {
  const parsed = parseSketch(code);
  if (!parsed.ok) throw new Error("PARSE: " + parsed.errors.map((e) => e.message).join("; "));
  const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors });
  sim.start();
  sim.advance(ms);
  if (sim.fatal) throw new Error("FATAL: " + sim.fatal);
  return sim;
}

const uno = { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} };
const power = (n: string) => [
  w(`${n}v`, [n, "vcc"], ["uno", "5V"]),
  w(`${n}g`, [n, "gnd"], ["uno", "GND1"]),
];

describe("MVP audit — har bir komponent", () => {
  it("katalogdagi HAMMA komponentda o'z chizmasi bor", () => {
    /*
     * `ComponentSymbol` turini topa olmasa oddiy kulrang quti chizadi —
     * foydalanuvchi uchun bu "komponent bor, lekin ko'rinishi yo'q" degani.
     * Ro'yxat chizma faylidan o'qiladi, shuning uchun yangi komponent
     * qo'shilib chizmasi unutilsa, test darhol aytadi.
     */
    const source = readFileSync("src/components/virtual-lab/symbols.tsx", "utf8");
    const block = source.slice(source.indexOf("const SYMBOLS"));
    const registered = new Set(
      [...block.matchAll(/^\s{2}"?([a-z0-9-]+)"?:/gm)].map((m) => m[1] as string),
    );
    const missing = CATALOG.filter((c) => !registered.has(c.type)).map((c) => c.type);
    expect(missing).toEqual([]);
  });

  it("HAR BIR komponent uchun simulyatsiya testi bor", () => {
    /*
     * Chizma bo'lishi yetarli emas — komponent haqiqatan ishlashi kerak.
     * Test fayllari matn sifatida o'qiladi va har bir katalog turi ulardan
     * birida tilga olinganmi tekshiriladi. Yangi komponent qo'shib testini
     * unutgan odam shu yerda to'xtatiladi.
     */
    const sources = [
      "src/lib/virtual-lab/coverage.test.ts",
      "src/lib/virtual-lab/faza-b.test.ts",
      "src/lib/virtual-lab/virtual-lab.test.ts",
      "src/lib/virtual-lab/wiring.test.ts",
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    const untested = CATALOG.filter((c) => !sources.includes(`"${c.type}"`)).map((c) => c.type);
    expect(untested).toEqual([]);
  });

  it("LDR yorug'likka javob beradi", () => {
    const c: Circuit = {
      nodes: [uno, { id: "s", type: "ldr", x: 0, y: 0, rotation: 0, settings: { light: 900 } }],
      wires: [...power("s"), w("sig", ["s", "signal"], ["uno", "A0"])],
    };
    const sim = run(
      c,
      `void setup(){Serial.begin(9600);Serial.println(analogRead(A0));} void loop(){}`,
    );
    expect(sim.getLogs().map((l) => l.text)).toContain("900");
  });

  it("TMP36 haroratga javob beradi", () => {
    const c: Circuit = {
      nodes: [
        uno,
        { id: "s", type: "tmp36", x: 0, y: 0, rotation: 0, settings: { temperature: 25 } },
      ],
      wires: [...power("s"), w("sig", ["s", "signal"], ["uno", "A0"])],
    };
    const sim = run(
      c,
      `void setup(){Serial.begin(9600);Serial.println(analogRead(A0));} void loop(){}`,
    );
    const v = Number(sim.getLogs().at(-1)?.text);
    expect(v).toBeGreaterThan(100);
  });

  it("tuproq namligi sensori javob beradi", () => {
    const c: Circuit = {
      nodes: [
        uno,
        { id: "s", type: "soil-moisture", x: 0, y: 0, rotation: 0, settings: { moisture: 50 } },
      ],
      wires: [...power("s"), w("sig", ["s", "signal"], ["uno", "A0"])],
    };
    const sim = run(
      c,
      `void setup(){Serial.begin(9600);Serial.println(analogRead(A0));} void loop(){}`,
    );
    expect(Number(sim.getLogs().at(-1)?.text)).toBeGreaterThan(400);
  });

  it("PIR harakatni beradi", () => {
    const c: Circuit = {
      nodes: [uno, { id: "s", type: "pir", x: 0, y: 0, rotation: 0, settings: { motion: true } }],
      wires: [...power("s"), w("sig", ["s", "out"], ["uno", "D2"])],
    };
    const sim = run(
      c,
      `void setup(){Serial.begin(9600);pinMode(2,INPUT);Serial.println(digitalRead(2));} void loop(){}`,
    );
    expect(sim.getLogs().map((l) => l.text)).toContain("1");
  });

  it("HC-SR04 masofani beradi", () => {
    const c: Circuit = {
      nodes: [
        uno,
        { id: "s", type: "ultrasonic", x: 0, y: 0, rotation: 0, settings: { distance: 30 } },
      ],
      wires: [
        ...power("s"),
        w("t", ["s", "trig"], ["uno", "D9"]),
        w("e", ["s", "echo"], ["uno", "D10"]),
      ],
    };
    const sim = run(
      c,
      `void setup(){Serial.begin(9600);pinMode(9,OUTPUT);pinMode(10,INPUT);
       digitalWrite(9,HIGH);delayMicroseconds(10);digitalWrite(9,LOW);
       long d = pulseIn(10,HIGH)/58; Serial.println(d);} void loop(){}`,
    );
    expect(Number(sim.getLogs().at(-1)?.text)).toBeGreaterThan(20);
  });

  it("servo burchakka boradi", () => {
    const c: Circuit = {
      nodes: [uno, { id: "s", type: "servo", x: 0, y: 0, rotation: 0, settings: { angle: 90 } }],
      wires: [...power("s"), w("sig", ["s", "signal"], ["uno", "D9"])],
    };
    const sim = run(
      c,
      `#include <Servo.h>\nServo sv;\nvoid setup(){sv.attach(9);sv.write(140);} void loop(){}`,
    );
    expect(sim.getRuntimeState().s?.angle).toBe(140);
  });

  it("buzzer tone() bilan chaladi", () => {
    const c: Circuit = {
      nodes: [uno, { id: "b", type: "buzzer", x: 0, y: 0, rotation: 0, settings: {} }],
      wires: [w("p", ["b", "plus"], ["uno", "D8"]), w("m", ["b", "minus"], ["uno", "GND1"])],
    };
    const sim = run(c, `void setup(){pinMode(8,OUTPUT);tone(8,440);} void loop(){}`);
    expect(sim.getRuntimeState().b?.buzzing).toBe(true);
  });

  it("RGB LED rang beradi", () => {
    const c: Circuit = {
      nodes: [uno, { id: "r", type: "rgb-led", x: 0, y: 0, rotation: 0, settings: {} }],
      wires: [
        w("r1", ["r", "r"], ["uno", "D9"]),
        w("g1", ["r", "g"], ["uno", "D10"]),
        w("b1", ["r", "b"], ["uno", "D11"]),
        w("c1", ["r", "common"], ["uno", "GND1"]),
      ],
    };
    const sim = run(
      c,
      `void setup(){pinMode(9,OUTPUT);pinMode(10,OUTPUT);pinMode(11,OUTPUT);analogWrite(9,255);analogWrite(10,128);analogWrite(11,0);} void loop(){}`,
    );
    expect(sim.getRuntimeState().r?.color).toBe("#ff8000");
  });

  it("potensiometr analogRead beradi", () => {
    const c: Circuit = {
      nodes: [
        uno,
        { id: "p", type: "potentiometer", x: 0, y: 0, rotation: 0, settings: { value: 700 } },
      ],
      wires: [...power("p"), w("sig", ["p", "wiper"], ["uno", "A0"])],
    };
    const sim = run(
      c,
      `void setup(){Serial.begin(9600);Serial.println(analogRead(A0));} void loop(){}`,
    );
    expect(sim.getLogs().map((l) => l.text)).toContain("700");
  });

  it("tugma INPUT_PULLUP bilan o'qiladi", () => {
    const c: Circuit = {
      nodes: [
        uno,
        { id: "b", type: "push-button", x: 0, y: 0, rotation: 0, settings: { pressed: true } },
      ],
      wires: [w("a", ["b", "a"], ["uno", "D2"]), w("g", ["b", "b"], ["uno", "GND1"])],
    };
    const sim = run(
      c,
      `void setup(){Serial.begin(9600);pinMode(2,INPUT_PULLUP);Serial.println(digitalRead(2));} void loop(){}`,
    );
    expect(sim.getLogs().map((l) => l.text)).toContain("0");
  });

  it("5V manba va GND belgisi zanjirni yopadi", () => {
    const c: Circuit = {
      nodes: [
        { id: "p5", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "g", type: "ground", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "r", type: "resistor", x: 0, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "led", type: "led", x: 0, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        w("w1", ["p5", "out"], ["r", "a"]),
        w("w2", ["r", "b"], ["led", "anode"]),
        w("w3", ["led", "cathode"], ["g", "out"]),
      ],
    };
    const sim = run(c, `void setup(){} void loop(){}`);
    expect(sim.getRuntimeState().led?.brightness ?? 0).toBeGreaterThan(0.9);
  });

  it("har bir komponent uchun sozlama chegaralari to'g'ri", () => {
    const bad: string[] = [];
    for (const c of CATALOG) {
      for (const s of c.settings) {
        if (s.kind !== "number") continue;
        const def = c.defaults[s.key];
        if (typeof def !== "number") {
          bad.push(`${c.type}.${s.key}: default yo'q`);
          continue;
        }
        if (def < s.min || def > s.max)
          bad.push(`${c.type}.${s.key}: default oraliqdan tashqarida`);
      }
      for (const s of c.settings) {
        if (s.kind === "select" && !s.options.some((o) => o.value === c.defaults[s.key])) {
          bad.push(`${c.type}.${s.key}: default variantlar ichida yo'q`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("hamma pin identifikatorlari noyob", () => {
    const bad: string[] = [];
    for (const c of CATALOG) {
      const seen = new Set<string>();
      for (const p of c.pins) {
        if (seen.has(p.id)) bad.push(`${c.type}: ${p.id} takrorlangan`);
        seen.add(p.id);
      }
    }
    expect(bad).toEqual([]);
  });

  it("har bir komponentda musbat o'lcham bor", () => {
    /*
     * O'lcham nafaqat chizma uchun kerak: pin koordinatalari 0–1 nisbatda
     * saqlanadi va ish maydonidagi joyi shu o'lchamga ko'paytiriladi.
     */
    const bad = CATALOG.filter((c) => !(c.width > 0) || !(c.height > 0)).map((c) => c.type);
    expect(bad).toEqual([]);
  });

  it("hamma komponent 0-1 oraligida pinga ega", () => {
    const bad: string[] = [];
    for (const c of CATALOG) {
      for (const p of c.pins) {
        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) bad.push(`${c.type}.${p.id}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("validator hech qanday sxemada qulab tushmaydi", () => {
    for (const c of CATALOG) {
      const circuit: Circuit = {
        nodes: [{ id: "x", type: c.type, x: 0, y: 0, rotation: 0, settings: { ...c.defaults } }],
        wires: [],
      };
      expect(() => validateCircuit(circuit)).not.toThrow();
    }
  });

  it("simulyator hech qanday yakka komponentda qulab tushmaydi", () => {
    for (const c of CATALOG) {
      const circuit: Circuit = {
        nodes: [
          uno,
          { id: "x", type: c.type, x: 0, y: 0, rotation: 0, settings: { ...c.defaults } },
        ],
        wires: [],
      };
      expect(() => run(circuit, "void setup(){} void loop(){}"), c.type).not.toThrow();
    }
  });

  it("getDefinition katalogdagi hamma turni topadi", () => {
    for (const c of CATALOG) expect(getDefinition(c.type)).toBeTruthy();
  });
});

describe("darslar", () => {
  it("har bir darsda to'liq mazmun bor", () => {
    const bad: string[] = [];
    for (const l of LESSONS) {
      if (!l.theory || l.theory.length < 80) bad.push(`${l.slug}: nazariya qisqa`);
      if (l.steps.length < 3) bad.push(`${l.slug}: qadamlar kam`);
      if (l.rules.length < 3) bad.push(`${l.slug}: qoidalar kam`);
      if (!l.starterCode.includes("void setup")) bad.push(`${l.slug}: boshlang'ich kod noto'g'ri`);
      if (l.starterCircuit.nodes.length === 0) bad.push(`${l.slug}: boshlang'ich sxema bo'sh`);
    }
    expect(bad).toEqual([]);
  });

  it("dars slug'lari noyob va getLesson topadi", () => {
    const slugs = LESSONS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(getLesson(s)?.slug).toBe(s);
  });

  it("boshlang'ich sxemadagi komponentlar katalogda bor", () => {
    const bad: string[] = [];
    for (const l of LESSONS) {
      for (const n of l.starterCircuit.nodes) {
        if (!getDefinition(n.type)) bad.push(`${l.slug}: ${n.type}`);
      }
      for (const t of l.requiredComponents) {
        if (!getDefinition(t)) bad.push(`${l.slug}: required ${t}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("boshlang'ich kod tahlil qilinadi", () => {
    for (const l of LESSONS) {
      const parsed = parseSketch(l.starterCode);
      expect(parsed.ok, `${l.slug}: ${parsed.ok ? "" : parsed.errors[0]?.message}`).toBe(true);
    }
  });

  it("to'liq yechim har bir darsda 100% beradi", () => {
    /*
     * Eng muhim tekshiruv: dars qoidalari HAQIQATAN bajarilishi mumkinmi.
     * Yechim — boshlang'ich sxemaning to'g'ri simlangan varianti va
     * boshlang'ich kod. Agar biror qoida bajarib bo'lmaydigan bo'lsa,
     * bola uni hech qachon yopa olmaydi va dars tugamaydi.
     */
    for (const l of LESSONS) {
      const circuit = solveLesson(l.slug, l.starterCircuit);
      const parsed = parseSketch(l.starterCode);
      if (!parsed.ok) throw new Error(`${l.slug}: kod tahlil qilinmadi`);
      const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
      sim.start();
      for (let i = 0; i < 160; i++) sim.advance(50);
      /*
       * "Tungi chiroq" darsida bola slayderni surishi TALAB QILINADI —
       * usiz shart hech qachon bajarilmaydi. Shu harakatni modellaymiz:
       * agar buni qilmasak, dars bajarilmas bo'lib qolgan bo'lardi va
       * test aynan shuni ushlab qoldi.
       */
      if (l.slug === "tungi-chiroq") {
        sim.updateSensors({ ldr: 80 });
        for (let i = 0; i < 160; i++) sim.advance(50);
      }
      const result = checkLesson(l, {
        circuit,
        code: l.starterCode,
        sketch: parsed.sketch,
        observed: sim.observed,
      });
      expect(result.percent, `${l.slug}: ${result.failed.map((f) => f.id).join(", ")}`).toBe(100);
    }
  });
});

/** Dars sxemasini to'g'ri simlab, "tugallangan ish" holatiga keltiradi. */
function solveLesson(slug: string, base: Circuit): Circuit {
  const c: Circuit = { nodes: base.nodes.map((n) => ({ ...n })), wires: [] };
  const wire = (id: string, a: [string, string], b: [string, string]) =>
    c.wires.push({
      id,
      from: { nodeId: a[0], pinId: a[1] },
      to: { nodeId: b[0], pinId: b[1] },
      color: "blue",
    });

  if (slug === "miltillovchi-led") {
    wire("w1", ["uno", "D13"], ["r1", "a"]);
    wire("w2", ["r1", "b"], ["led1", "anode"]);
    wire("w3", ["led1", "cathode"], ["uno", "GND1"]);
  }
  if (slug === "tugma-bilan-led") {
    wire("w1", ["uno", "D2"], ["btn", "a"]);
    wire("w2", ["btn", "b"], ["uno", "GND1"]);
    wire("w3", ["uno", "D9"], ["r1", "a"]);
    wire("w4", ["r1", "b"], ["led1", "anode"]);
    wire("w5", ["led1", "cathode"], ["uno", "GND2"]);
  }
  if (slug === "svetofor") {
    const map: [string, string, string][] = [
      ["D11", "r1", "led-r"],
      ["D10", "r2", "led-y"],
      ["D9", "r3", "led-g"],
    ];
    map.forEach(([pin, res, led], i) => {
      wire(`a${i}`, ["uno", pin], [res, "a"]);
      wire(`b${i}`, [res, "b"], [led, "anode"]);
      wire(`c${i}`, [led, "cathode"], ["uno", "GND1"]);
    });
  }
  if (slug === "tungi-chiroq") {
    wire("w1", ["ldr", "vcc"], ["uno", "5V"]);
    wire("w2", ["ldr", "gnd"], ["uno", "GND1"]);
    wire("w3", ["ldr", "signal"], ["uno", "A0"]);
    wire("w4", ["uno", "D9"], ["r1", "a"]);
    wire("w5", ["r1", "b"], ["led1", "anode"]);
    wire("w6", ["led1", "cathode"], ["uno", "GND2"]);
  }
  return c;
}

describe("sensorni ulash usullari", () => {
  const SENSOR_CODE = `int led = 9;
int ldr = A0;
void setup() { pinMode(led, OUTPUT); Serial.begin(9600); }
void loop() {
  int yoruglik = analogRead(ldr);
  Serial.println(yoruglik);
  if (yoruglik < 500) { digitalWrite(led, HIGH); } else { digitalWrite(led, LOW); }
  delay(100);
}`;

  const board: CircuitNode = {
    id: "uno",
    type: "arduino-uno",
    x: 0,
    y: 0,
    rotation: 0,
    settings: {},
  };
  const sensor: CircuitNode = {
    id: "ldr",
    type: "ldr",
    x: 400,
    y: 0,
    rotation: 0,
    settings: { light: 700 },
  };

  const link = (
    id: string,
    a: [string, string],
    b: [string, string],
  ): Circuit["wires"][number] => ({
    id,
    from: { nodeId: a[0]!, pinId: a[1]! },
    to: { nodeId: b[0]!, pinId: b[1]! },
    color: "blue",
  });

  const firstReading = (circuit: Circuit): string | undefined => {
    const parsed = parseSketch(SENSOR_CODE);
    if (!parsed.ok) throw new Error(parsed.errors[0]?.message);
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(300);
    return sim
      .getLogs()
      .map((l) => l.text)
      .find((t) => /^\d+$/.test(t));
  };

  it("modul sifatida: vcc → 5V, gnd → GND, signal → A0", () => {
    expect(
      firstReading({
        nodes: [board, sensor],
        wires: [
          link("v", ["ldr", "vcc"], ["uno", "5V"]),
          link("g", ["ldr", "gnd"], ["uno", "GND1"]),
          link("s", ["ldr", "signal"], ["uno", "A0"]),
        ],
      }),
    ).toBe("700");
  });

  it("breadboard orqali o'tgan signal ham o'qiladi", () => {
    expect(
      firstReading({
        nodes: [
          board,
          sensor,
          { id: "bb", type: "breadboard", x: 0, y: 400, rotation: 0, settings: {} },
        ],
        wires: [
          link("p1", ["uno", "5V"], ["bb", "pt1"]),
          link("p2", ["uno", "GND1"], ["bb", "nt1"]),
          link("v", ["ldr", "vcc"], ["bb", "pt6"]),
          link("g", ["ldr", "gnd"], ["bb", "nt6"]),
          link("s1", ["ldr", "signal"], ["bb", "t3-1"]),
          link("s2", ["bb", "t3-4"], ["uno", "A0"]),
        ],
      }),
    ).toBe("700");
  });

  it("kuchlanish bo'luvchi sifatida ulanganda ham o'qiladi", () => {
    /*
     * Darsliklardagi klassik ulash: 5V → LDR → rezistor → GND, o'rtadan
     * A0 ga. Sensorning O'Z `gnd` pini bo'sh qoladi. Ilgari bunda
     * `analogRead()` jimgina 0 qaytarardi va bola nima qilganini
     * tushunmasdi — sxema esa mutlaqo to'g'ri edi.
     */
    const circuit: Circuit = {
      nodes: [
        board,
        sensor,
        { id: "r", type: "resistor", x: 700, y: 0, rotation: 0, settings: { ohms: 10000 } },
      ],
      wires: [
        link("v", ["ldr", "vcc"], ["uno", "5V"]),
        link("s", ["ldr", "signal"], ["uno", "A0"]),
        link("r1", ["ldr", "signal"], ["r", "a"]),
        link("r2", ["r", "b"], ["uno", "GND1"]),
      ],
    };
    expect(firstReading(circuit)).toBe("700");
    // Ishlaydigan sxemaga "yerga ulanmagan" ogohlantirishi chiqmasligi kerak.
    expect(validateCircuit(circuit).some((i) => i.message.includes("yerga ulanmagan"))).toBe(false);
  });

  it("yerga umuman yo'l bo'lmasa 0 qaytaradi va ogohlantiradi", () => {
    const circuit: Circuit = {
      nodes: [board, sensor],
      wires: [
        link("v", ["ldr", "vcc"], ["uno", "5V"]),
        link("s", ["ldr", "signal"], ["uno", "A0"]),
      ],
    };
    expect(firstReading(circuit)).toBe("0");
    expect(validateCircuit(circuit).some((i) => i.message.includes("yerga ulanmagan"))).toBe(true);
  });
});
