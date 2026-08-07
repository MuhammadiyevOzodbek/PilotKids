import { describe, expect, it } from "vitest";
import { parseSketch } from "./parser";
import { Simulator } from "./simulator";
import { canConnect, validateCircuit } from "./validator";
import { checkLesson, getLesson } from "./lessons";
import { exportProject, importProject, sanitizeCircuit } from "./storage";
import { BATTERY_DEFAULT_VOLTAGE, BATTERY_PRESETS, CATALOG, batteryVoltage } from "./catalog";
import { boardPinFor, buildNetlist, netFor, supplyVoltage } from "./netlist";
import { pinPoint } from "./geometry";
import {
  UNO_BOARD,
  UNO_BRANDING,
  UNO_CAPS,
  UNO_GROUP_LABELS,
  UNO_HEADERS,
  UNO_ICSP,
  UNO_LEDS,
  UNO_MOUNTS,
  UNO_PARTS,
  UNO_PINS,
  UNO_PITCH,
  UNO_TEXT,
  UNO_VIEWBOX,
  unoOutlinePath,
  type UnoRect,
} from "./uno-layout";
import type { Circuit } from "./types";

/**
 * Virtual laboratoriya yadrosi testlari.
 *
 * UI sinalmaydi — bu yerda faqat "haqiqatan ishlaydimi" degan savolga javob
 * beradigan mantiq: kod tahlili, simulyatsiya, sxema tekshiruvi va saqlash.
 */

const BLINK_CODE = `
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;

/** D13 → rezistor → LED anod; LED katod → GND. */
function blinkCircuit(): Circuit {
  return {
    nodes: [
      { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
      { id: "r1", type: "resistor", x: 300, y: 0, rotation: 0, settings: { ohms: 220 } },
      { id: "led1", type: "led", x: 420, y: 0, rotation: 0, settings: { color: "red" } },
    ],
    wires: [
      {
        id: "w1",
        from: { nodeId: "uno", pinId: "D13" },
        to: { nodeId: "r1", pinId: "a" },
        color: "blue",
      },
      {
        id: "w2",
        from: { nodeId: "r1", pinId: "b" },
        to: { nodeId: "led1", pinId: "anode" },
        color: "blue",
      },
      {
        id: "w3",
        from: { nodeId: "led1", pinId: "cathode" },
        to: { nodeId: "uno", pinId: "GND1" },
        color: "black",
      },
    ],
  };
}

/* ─────────────────────────── Parser ─────────────────────────── */

describe("parser", () => {
  it("blink eskizini o'qiydi", () => {
    const result = parseSketch(BLINK_CODE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sketch.setup).toHaveLength(1);
    expect(result.sketch.loop).toHaveLength(4);
  });

  it("yopilmagan qavsni aniqlaydi", () => {
    const result = parseSketch("void setup() {\n  pinMode(13, OUTPUT);\n\nvoid loop() {}");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.message).toBeTruthy();
  });

  it("setup() bo'lmasa xato beradi", () => {
    const result = parseSketch("void loop() {}");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.message).toContain("setup");
  });

  it("if/for va o'zgaruvchilarni qo'llab-quvvatlaydi", () => {
    const result = parseSketch(`
      int sanoq = 0;
      void setup() { Serial.begin(9600); }
      void loop() {
        for (int i = 0; i < 3; i++) { sanoq = sanoq + 1; }
        if (sanoq > 2) { Serial.println("ko'p"); } else { Serial.println("kam"); }
        delay(10);
      }
    `);
    expect(result.ok).toBe(true);
  });

  it("bir qatordagi bir nechta o'zgaruvchi e'lonini bajaradi", () => {
    const result = parseSketch(`
      int a = 1, b = 2;
      void setup() {
        Serial.begin(9600);
        int c = 3, d = 4;
        Serial.println(a + b + c + d);
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "10")).toBe(true);
  });

  it("compound assignment operatorlarini qo'llab-quvvatlaydi", () => {
    const result = parseSketch(`
      int qiymat = 2;
      void setup() {
        Serial.begin(9600);
        qiymat *= 8;
        qiymat /= 4;
        qiymat %= 3;
        Serial.println(qiymat);
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "1")).toBe(true);
  });

  it("prefiks increment/decrement operatorlarini qo'llab-quvvatlaydi", () => {
    const result = parseSketch(`
      int qiymat = 0;
      void setup() {
        Serial.begin(9600);
        ++qiymat;
        --qiymat;
        Serial.println(qiymat);
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "0")).toBe(true);
  });

  it("return buyrug'ini erta chiqish sifatida bajaradi", () => {
    const result = parseSketch(`
      void setup() {
        pinMode(13, OUTPUT);
        digitalWrite(13, HIGH);
        return;
        digitalWrite(13, LOW);
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getBoard().digital[13]).toBe(1);
  });

  it("loop ichidagi return simulyatsiyani to'xtatmaydi", () => {
    const result = parseSketch(`
      void setup() { Serial.begin(9600); }
      void loop() {
        Serial.println("tick");
        return;
        Serial.println("after");
      }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(20);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "tick")).toBe(true);
    expect(sim.getLogs().some((entry) => entry.text === "after")).toBe(false);
  });

  it("break va continue loop boshqaruvlarini bajaradi", () => {
    const result = parseSketch(`
      int sum = 0;
      void setup() {
        Serial.begin(9600);
        for (int i = 0; i < 10; i++) {
          if (i == 2) { continue; }
          if (i == 5) { break; }
          sum += i;
        }
        Serial.println(sum);
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "8")).toBe(true);
  });

  it("loop tashqarisidagi break/continue uchun aniq xato beradi", () => {
    const breakSketch = parseSketch(`void setup(){ break; } void loop(){ delay(10); }`);
    const continueSketch = parseSketch(`void setup(){ continue; } void loop(){ delay(10); }`);
    if (!breakSketch.ok || !continueSketch.ok) throw new Error("parse xato");

    const breakSim = new Simulator({
      circuit: blinkCircuit(),
      sketch: breakSketch.sketch,
      sensors: {},
    });
    breakSim.start();
    breakSim.advance(20);
    expect(breakSim.fatal).toContain("break");
    expect(breakSim.fatal).toContain("for");

    const continueSim = new Simulator({
      circuit: blinkCircuit(),
      sketch: continueSketch.sketch,
      sensors: {},
    });
    continueSim.start();
    continueSim.advance(20);
    expect(continueSim.fatal).toContain("continue");
    expect(continueSim.fatal).toContain("while");
  });

  it("#include qatorini xavfsiz o'tkazib yuboradi va #define qiymatini o'qiydi", () => {
    const result = parseSketch(`
      #include <Servo.h>
      #define LED_PIN 13
      void setup() { pinMode(13, OUTPUT); }
      void loop() { digitalWrite(13, HIGH); delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sketch.defines.LED_PIN).toBe(13);
  });

  it("Servo kutubxonasi uslubidagi obyekt deklaratsiyasini qabul qiladi", () => {
    const result = parseSketch(`
      #include <Servo.h>
      Servo myservo;
      void setup() { myservo.attach(9); }
      void loop() { myservo.write(120); delay(20); }
    `);
    expect(result.ok).toBe(true);
  });

  it("parametrsiz yordamchi funksiyalarni saqlaydi", () => {
    const result = parseSketch(`
      void blinkOnce() { digitalWrite(13, HIGH); delay(10); digitalWrite(13, LOW); }
      void setup() { pinMode(13, OUTPUT); }
      void loop() { blinkOnce(); delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sketch.functions.blinkOnce?.body).toHaveLength(3);
    expect(result.sketch.functions.blinkOnce?.params).toEqual([]);
  });

  it("parametrli yordamchi funksiyalarni bajaradi", () => {
    const result = parseSketch(`
      void setLed(int pin, int value) {
        digitalWrite(pin, value);
      }
      void setup() {
        pinMode(13, OUTPUT);
        setLed(13, HIGH);
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getBoard().digital[13]).toBe(1);
  });

  it("parametrli yordamchi funksiya argument sonini tekshiradi", () => {
    const result = parseSketch(`
      void setLed(int pin, int value) {
        digitalWrite(pin, value);
      }
      void setup() { setLed(13); }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toContain("2 ta argument");
  });

  it("qiymat qaytaradigan yordamchi funksiyani ifoda ichida bajaradi", () => {
    const result = parseSketch(`
      int add(int a, int b) {
        return a + b;
      }
      void setup() {
        Serial.begin(9600);
        Serial.println(add(4, 6));
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "10")).toBe(true);
  });

  it("qiymat qaytaradigan yordamchi funksiya ichidagi delay uchun aniq xato beradi", () => {
    const result = parseSketch(`
      int slow() {
        delay(10);
        return 1;
      }
      void setup() { Serial.println(slow()); }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toContain("qiymat qaytarayotganda delay()");
  });

  it("mantiqiy && va || operatorlarini short-circuit qiladi", () => {
    const result = parseSketch(`
      int x = 0;
      void setup() {
        Serial.begin(9600);
        if (x != 0 && 10 / x > 1) { Serial.println("bad-and"); }
        if (x == 0 || 10 / x > 1) { Serial.println("ok"); }
      }
      void loop() { delay(10); }
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "bad-and")).toBe(false);
    expect(sim.getLogs().some((entry) => entry.text === "ok")).toBe(true);
  });

  it("eval() ga o'xshash xavfli kodni sintaksis sifatida rad etadi", () => {
    // Ruxsat etilmagan funksiya — parse bosqichida emas, bajarilishda rad etiladi.
    const result = parseSketch(`void setup(){ fetch("http://x"); } void loop(){}`);
    expect(result.ok).toBe(true); // sintaksis to'g'ri
    if (!result.ok) return;
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: result.sketch, sensors: {} });
    sim.start();
    sim.advance(50);
    expect(sim.fatal).toContain("qo'llab-quvvatlanmaydi");
  });
});

/* ─────────────────────────── Simulyator ─────────────────────────── */

describe("simulyator", () => {
  it("digitalWrite pin holatini o'zgartiradi", () => {
    const parsed = parseSketch(
      `void setup(){ pinMode(13, OUTPUT); digitalWrite(13, HIGH); } void loop(){ delay(100); }`,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(10);
    expect(sim.getBoard().digital[13]).toBe(1);
  });

  it("#define qilingan pin nomini bajarishda ishlatadi", () => {
    const parsed = parseSketch(
      `#define LED_PIN 13
       void setup(){ pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, HIGH); }
       void loop(){ delay(100); }`,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(10);
    expect(sim.getBoard().digital[13]).toBe(1);
  });

  it("hex va binary son literalini bajarishda ishlatadi", () => {
    const parsed = parseSketch(
      `void setup(){ pinMode(0x0D, OUTPUT); digitalWrite(0x0D, 0b1); }
       void loop(){ delay(100); }`,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(10);

    expect(sim.getBoard().modes[13]).toBe("output");
    expect(sim.getBoard().digital[13]).toBe(1);
  });

  it("bitwise operatorlarni va compound bitwise assignmentni bajaradi", () => {
    const parsed = parseSketch(`
      int mask = 0b0011;
      void setup(){
        Serial.begin(9600);
        mask |= 0b0100;
        mask <<= 1;
        mask ^= 0b0010;
        mask &= 0b1110;
        Serial.println(mask | (~0 & 0));
      }
      void loop(){ delay(100); }
    `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "12")).toBe(true);
  });

  it("abs/min/max Arduino helperlarini bajaradi", () => {
    const parsed = parseSketch(`
      void setup(){
        Serial.begin(9600);
        Serial.println(max(abs(-7), min(12, 4)));
      }
      void loop(){ delay(100); }
    `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "7")).toBe(true);
  });

  it("sq/sqrt/pow/round Arduino helperlarini bajaradi", () => {
    const parsed = parseSketch(`
      void setup(){
        Serial.begin(9600);
        Serial.println(round(sqrt(sq(3) + pow(4, 2))));
      }
      void loop(){ delay(100); }
    `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((entry) => entry.text === "5")).toBe(true);
  });

  it("editor tavsiya qiladigan Arduino helperlari bajariladi", () => {
    const parsed = parseSketch(`
      int value = 0;
      void setup(){
        pinMode(LED_BUILTIN, OUTPUT);
        value = constrain(map(512, 0, 1023, 0, 255), 0, 255);
        digitalWrite(LED_BUILTIN, value > random(0, 10));
      }
      void loop(){ delayMicroseconds(500); }
    `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(10);

    expect(sim.getBoard().modes[13]).toBe("output");
    expect(sim.getBoard().digital[13]).toBe(1);
    expect(sim.time).toBeGreaterThan(0);
  });

  it("Serial.print qatorni tugatmaydi, Serial.println tugatadi", () => {
    const parsed = parseSketch(`
      void setup(){
        Serial.begin(9600);
        Serial.print("A");
        Serial.print("B");
        Serial.println("C");
        Serial.println("D");
      }
      void loop(){ delay(100); }
    `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);

    const info = sim
      .getLogs()
      .filter((entry) => entry.level === "info")
      .map((entry) => entry.text);
    expect(info).toContain("ABC");
    expect(info).toContain("D");
    expect(info).not.toContain("A");
    expect(info).not.toContain("B");
  });

  it("LED blink simulyatsiyasi — 1s yonadi, 1s o'chadi", () => {
    const parsed = parseSketch(BLINK_CODE);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();

    const samples: boolean[] = [];
    for (let i = 0; i < 40; i++) {
      sim.advance(100);
      samples.push((sim.getRuntimeState()["led1"]?.brightness ?? 0) > 0);
    }

    // Birinchi soniya — yoniq, ikkinchisi — o'chiq.
    expect(samples.slice(0, 9).every(Boolean)).toBe(true);
    expect(samples.slice(11, 19).every((v) => !v)).toBe(true);
    expect(sim.observed.ledToggles).toBeGreaterThanOrEqual(2);
  });

  it("analogWrite orqali LED miltillashi kuzatuvga yoziladi", () => {
    const parsed = parseSketch(`
      void setup() { pinMode(13, OUTPUT); }
      void loop() {
        analogWrite(13, 128);
        delay(100);
        analogWrite(13, 0);
        delay(100);
      }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(450);

    expect(sim.getRuntimeState().led1?.brightness).toBeGreaterThanOrEqual(0);
    expect(sim.observed.pinsDrivenHigh).toContain(13);
    expect(sim.observed.pinsDrivenLow).toContain(13);
    expect(sim.observed.ledToggles).toBeGreaterThanOrEqual(2);
  });

  it("LED mustaqil 5V va GND bilan yonadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 120, rotation: 0, settings: {} },
        { id: "led", type: "led", x: 220, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "led", pinId: "anode" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "gnd", pinId: "out" },
          to: { nodeId: "led", pinId: "cathode" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`void setup(){} void loop(){ delay(100); }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().led?.brightness).toBe(1);
  });

  it("LED mustaqil 5V va GND bilan rezistor orqali yonadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 120, rotation: 0, settings: {} },
        { id: "r1", type: "resistor", x: 120, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "led", type: "led", x: 260, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "r1", pinId: "a" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "r1", pinId: "b" },
          to: { nodeId: "led", pinId: "anode" },
          color: "red",
        },
        {
          id: "w3",
          from: { nodeId: "gnd", pinId: "out" },
          to: { nodeId: "led", pinId: "cathode" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`void setup(){} void loop(){ delay(100); }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);

    expect(sim.getRuntimeState().led?.brightness).toBe(1);
  });

  it("delay event queue virtual vaqtni to'g'ri suradi", () => {
    const parsed = parseSketch(`void setup(){} void loop(){ delay(500); }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(1000);
    // Virtual soat real vaqtdan mustaqil — 1000ms so'ralgan, 1000ms o'tgan.
    expect(Math.round(sim.time)).toBe(1000);
  });

  it("cheksiz while brauzerni qotirmaydi", () => {
    const parsed = parseSketch(`void setup(){} void loop(){ while(1) { } }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    const started = Date.now();
    sim.advance(1000);
    // Amal chegarasi tufayli tez qaytadi (yoki xato beradi), osilib qolmaydi.
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("analogRead potensiometr qiymatini o'qiydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "pot", type: "potentiometer", x: 300, y: 0, rotation: 0, settings: { value: 512 } },
      ],
      wires: [
        {
          id: "w0",
          from: { nodeId: "pot", pinId: "vcc" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "w-gnd",
          from: { nodeId: "pot", pinId: "gnd" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
        {
          id: "w1",
          from: { nodeId: "pot", pinId: "wiper" },
          to: { nodeId: "uno", pinId: "A0" },
          color: "blue",
        },
      ],
    };
    const parsed = parseSketch(`
      int v = 0;
      void setup(){ Serial.begin(9600); }
      void loop(){ v = analogRead(A0); Serial.println(v); delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: { pot: 750 } });
    sim.start();
    sim.advance(150);
    expect(sim.getLogs().some((l) => l.text === "750")).toBe(true);
  });

  it("quvvatlanmagan analog sensor 0 qaytaradi va validator ogohlantiradi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "pot", type: "potentiometer", x: 300, y: 0, rotation: 0, settings: { value: 512 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "pot", pinId: "wiper" },
          to: { nodeId: "uno", pinId: "A0" },
          color: "blue",
        },
      ],
    };
    const parsed = parseSketch(`
      int v = 0;
      void setup(){ Serial.begin(9600); }
      void loop(){ v = analogRead(A0); Serial.println(v); delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: { pot: 750 } });
    sim.start();
    sim.advance(150);

    const issues = validateCircuit(circuit);
    expect(sim.getLogs().some((l) => l.text === "0")).toBe(true);
    expect(issues.some((i) => i.message.includes("VCC/5V"))).toBe(true);
    expect(issues.some((i) => i.message.includes("GND pini"))).toBe(true);
  });

  it("yordamchi funksiyani bajaradi", () => {
    const parsed = parseSketch(`
      void blinkOnce() { digitalWrite(13, HIGH); delay(10); digitalWrite(13, LOW); delay(10); }
      void setup(){ pinMode(13, OUTPUT); }
      void loop(){ blinkOnce(); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(35);
    expect(sim.observed.pinsDrivenHigh).toContain(13);
    expect(sim.observed.pinsDrivenLow).toContain(13);
  });

  it("Serial Monitor'dan yuborilgan matnni sketch o'qiy oladi", () => {
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); }
      void loop(){
        if (Serial.available() > 0) {
          Serial.println(Serial.readString());
        }
        delay(10);
      }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.pushSerialInput("salom");
    sim.advance(30);

    expect(sim.getLogs().some((l) => l.text === "salom\n")).toBe(true);
  });

  it("Serial.readString matnini literal bilan to'g'ri solishtiradi", () => {
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); }
      void loop(){
        if (Serial.available() > 0) {
          String cmd = Serial.readString();
          cmd.trim();
          if (cmd == "on") { Serial.println("matched"); }
          if (cmd == "off") { Serial.println("wrong"); }
          if (cmd != "off") { Serial.println("not-off"); }
        }
        delay(10);
      }
    `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.pushSerialInput("on");
    sim.advance(30);

    expect(sim.fatal).toBeNull();
    expect(sim.getLogs().some((l) => l.text === "matched")).toBe(true);
    expect(sim.getLogs().some((l) => l.text === "wrong")).toBe(false);
    expect(sim.getLogs().some((l) => l.text === "not-off")).toBe(true);
  });

  it("Serial.parseInt yuborilgan sondan foydalanadi", () => {
    const parsed = parseSketch(`
      int v = 0;
      void setup(){ Serial.begin(9600); }
      void loop(){
        if (Serial.available() > 0) {
          v = Serial.parseInt();
          Serial.println(v);
        }
        delay(10);
      }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.pushSerialInput("42");
    sim.advance(30);

    expect(sim.getLogs().some((l) => l.text === "42")).toBe(true);
  });

  it("Serial.read() natijasini char literal bilan solishtiradi", () => {
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); pinMode(13, OUTPUT); }
      void loop(){
        if (Serial.available() > 0) {
          if (Serial.read() == 'A') { digitalWrite(13, HIGH); }
        }
        delay(10);
      }
    `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.pushSerialInput("A");
    sim.advance(30);

    expect(sim.getBoard().digital[13]).toBe(1);
  });

  it("INPUT_PULLUP tugma GND ga ulangan bo'lsa bosilganda LOW qaytaradi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "btn", type: "push-button", x: 260, y: 0, rotation: 0, settings: { pressed: true } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "btn", pinId: "a" },
          to: { nodeId: "uno", pinId: "D2" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "btn", pinId: "b" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); pinMode(2, INPUT_PULLUP); }
      void loop(){ Serial.println(digitalRead(2)); delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(120);

    expect(sim.getLogs().some((l) => l.text === "0")).toBe(true);
  });

  it("ishlayotgan simulyatsiyada tugma holati sensor override orqali yangilanadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "btn", type: "push-button", x: 260, y: 0, rotation: 0, settings: { pressed: false } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "btn", pinId: "a" },
          to: { nodeId: "uno", pinId: "D2" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "btn", pinId: "b" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); pinMode(2, INPUT_PULLUP); }
      void loop(){ Serial.println(digitalRead(2)); delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(120);
    sim.updateSensors({ btn: 1 });
    sim.advance(120);

    expect(sim.getLogs().some((l) => l.text === "1")).toBe(true);
    expect(sim.getLogs().some((l) => l.text === "0")).toBe(true);
  });

  it("floating INPUT_PULLUP tugma bosilganda ham LOW deb o'qilmaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "btn", type: "push-button", x: 260, y: 0, rotation: 0, settings: { pressed: true } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "btn", pinId: "a" },
          to: { nodeId: "uno", pinId: "D2" },
          color: "blue",
        },
      ],
    };
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); pinMode(2, INPUT_PULLUP); }
      void loop(){ Serial.println(digitalRead(2)); delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(120);

    expect(sim.getLogs().some((l) => l.text === "1")).toBe(true);
    expect(sim.getLogs().some((l) => l.text === "0")).toBe(false);
  });

  it("ultrasonic sensor pulseIn() orqali masofani qaytaradi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "us", type: "ultrasonic", x: 300, y: 0, rotation: 0, settings: { distance: 30 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "us", pinId: "vcc" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "us", pinId: "gnd" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
        {
          id: "w3",
          from: { nodeId: "us", pinId: "echo" },
          to: { nodeId: "uno", pinId: "D8" },
          color: "blue",
        },
      ],
    };
    const parsed = parseSketch(`
      long duration = 0;
      void setup(){ Serial.begin(9600); }
      void loop(){ duration = pulseIn(8, HIGH); Serial.println(duration); delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: { us: 50 } });
    sim.start();
    sim.advance(120);
    expect(sim.getLogs().some((l) => l.text === String(Math.round(50 * 58.2)))).toBe(true);
  });

  it("RGB LED PWM chiqishlardan rang hisoblaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "rgb", type: "rgb-led", x: 300, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "rgb", pinId: "r" },
          to: { nodeId: "uno", pinId: "D9" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "rgb", pinId: "g" },
          to: { nodeId: "uno", pinId: "D10" },
          color: "blue",
        },
        {
          id: "w3",
          from: { nodeId: "rgb", pinId: "b" },
          to: { nodeId: "uno", pinId: "D11" },
          color: "blue",
        },
        {
          id: "w4",
          from: { nodeId: "rgb", pinId: "common" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`
      void setup(){
        pinMode(9, OUTPUT); pinMode(10, OUTPUT); pinMode(11, OUTPUT);
        analogWrite(9, 255); analogWrite(10, 128); analogWrite(11, 0);
      }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().rgb).toMatchObject({ brightness: 1, color: "#ff8000" });
  });

  it("tone/noTone buzzer holatini boshqaradi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "buzz", type: "buzzer", x: 300, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "buzz", pinId: "plus" },
          to: { nodeId: "uno", pinId: "D3" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "buzz", pinId: "minus" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`void setup(){ tone(3, 440); } void loop(){ delay(100); }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().buzz?.buzzing).toBe(true);
  });

  it("buzzer mustaqil 5V va GND bilan chalinadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 120, rotation: 0, settings: {} },
        { id: "buzz", type: "buzzer", x: 220, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "buzz", pinId: "plus" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "gnd", pinId: "out" },
          to: { nodeId: "buzz", pinId: "minus" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`void setup(){} void loop(){ delay(100); }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().buzz?.buzzing).toBe(true);
  });

  it("servo.attach(pin) va servo.write(angle) signal piniga bog'lanadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "servo", type: "servo", x: 300, y: 0, rotation: 0, settings: { angle: 90 } },
      ],
      wires: [
        {
          id: "w-vcc",
          from: { nodeId: "servo", pinId: "vcc" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "w-gnd",
          from: { nodeId: "servo", pinId: "gnd" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
        {
          id: "w1",
          from: { nodeId: "servo", pinId: "signal" },
          to: { nodeId: "uno", pinId: "D9" },
          color: "blue",
        },
      ],
    };
    const parsed = parseSketch(`
      #include <Servo.h>
      Servo myservo;
      void setup(){ myservo.attach(9); myservo.write(135); }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().servo?.angle).toBe(135);
  });

  it("quvvatlanmagan servo kodga qaramay boshlang'ich burchakda qoladi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "servo", type: "servo", x: 300, y: 0, rotation: 0, settings: { angle: 90 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "servo", pinId: "signal" },
          to: { nodeId: "uno", pinId: "D9" },
          color: "blue",
        },
      ],
    };
    const parsed = parseSketch(`
      #include <Servo.h>
      Servo myservo;
      void setup(){ myservo.attach(9); myservo.write(135); }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().servo?.angle).toBe(90);
  });

  it("multimeter 5V va GND orasidagi kuchlanishni ko'rsatadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 120, rotation: 0, settings: {} },
        { id: "meter", type: "multimeter", x: 220, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "meter", pinId: "probe-plus" },
          to: { nodeId: "vcc", pinId: "out" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "meter", pinId: "probe-minus" },
          to: { nodeId: "gnd", pinId: "out" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`void setup(){} void loop(){ delay(100); }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().meter?.voltage).toBe(5);
  });

  it("multimeter rezistor orqali kelgan 5V kuchlanishni ko'rsatadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 120, rotation: 0, settings: {} },
        { id: "r1", type: "resistor", x: 120, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "meter", type: "multimeter", x: 260, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "r1", pinId: "a" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "r1", pinId: "b" },
          to: { nodeId: "meter", pinId: "probe-plus" },
          color: "red",
        },
        {
          id: "w3",
          from: { nodeId: "meter", pinId: "probe-minus" },
          to: { nodeId: "gnd", pinId: "out" },
          color: "black",
        },
      ],
    };
    const parsed = parseSketch(`void setup(){} void loop(){ delay(100); }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getRuntimeState().meter?.voltage).toBe(5);
  });
});

/* ─────────────────────────── Validator ─────────────────────────── */

describe("sxema validatori", () => {
  it("rezistorsiz LEDni aniqlaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "led1", type: "led", x: 300, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "uno", pinId: "D13" },
          to: { nodeId: "led1", pinId: "anode" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "led1", pinId: "cathode" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("rezistor"))).toBe(true);
  });

  it("mustaqil 5V/GND bilan ulangan LEDni Arduino piniga ulanmagan deb belgilamaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "vcc", type: "power-5v", x: 0, y: 170, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 240, rotation: 0, settings: {} },
        { id: "led1", type: "led", x: 300, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "led1", pinId: "anode" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "led1", pinId: "cathode" },
          to: { nodeId: "gnd", pinId: "out" },
          color: "black",
        },
      ],
    };
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("Arduino GND pini sxemaga ulanmagan"))).toBe(
      false,
    );
    expect(issues.some((i) => i.message.includes("Arduino piniga ulanmagan"))).toBe(false);
    expect(issues.some((i) => i.message.includes("katodi GND ga ulanmagan"))).toBe(false);
  });

  it("rezistor orqali quvvatlangan LEDni Arduino piniga ulanmagan deb belgilamaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "vcc", type: "power-5v", x: 0, y: 170, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 240, rotation: 0, settings: {} },
        { id: "r1", type: "resistor", x: 160, y: 170, rotation: 0, settings: { ohms: 220 } },
        { id: "led1", type: "led", x: 300, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "r1", pinId: "a" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "r1", pinId: "b" },
          to: { nodeId: "led1", pinId: "anode" },
          color: "red",
        },
        {
          id: "w3",
          from: { nodeId: "led1", pinId: "cathode" },
          to: { nodeId: "gnd", pinId: "out" },
          color: "black",
        },
      ],
    };
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("Arduino piniga ulanmagan"))).toBe(false);
    expect(issues.some((i) => i.message.includes("rezistor ulanmagan"))).toBe(false);
  });

  it("ultrasonic Trig va Echo pinlari ulanmaganini aniqlaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "us", type: "ultrasonic", x: 300, y: 0, rotation: 0, settings: { distance: 30 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "us", pinId: "vcc" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "us", pinId: "gnd" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("Trig"))).toBe(true);
    expect(issues.some((i) => i.message.includes("Echo"))).toBe(true);
  });

  it("Arduino piniga ulangan floating tugmani aniqlaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "btn", type: "push-button", x: 240, y: 0, rotation: 0, settings: { pressed: true } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "btn", pinId: "a" },
          to: { nodeId: "uno", pinId: "D2" },
          color: "blue",
        },
      ],
    };

    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("GND yoki 5V"))).toBe(true);
  });

  it("GND ga ulangan tugmani floating deb belgilamaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "btn", type: "push-button", x: 240, y: 0, rotation: 0, settings: { pressed: true } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "btn", pinId: "a" },
          to: { nodeId: "uno", pinId: "D2" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "btn", pinId: "b" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };

    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("GND yoki 5V"))).toBe(false);
  });

  it("5V va GND qisqa tutashuvini aniqlaydi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "led1", type: "led", x: 300, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "uno", pinId: "5V" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "red",
        },
      ],
    };
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.severity === "error" && i.message.includes("qisqa tutashuv"))).toBe(
      true,
    );
  });

  it("Arduino yo'qligini aniqlaydi", () => {
    const issues = validateCircuit({
      nodes: [{ id: "servo", type: "servo", x: 0, y: 0, rotation: 0, settings: { angle: 90 } }],
      wires: [],
    });
    expect(issues.some((i) => i.message.includes("Arduino plata yo'q"))).toBe(true);
  });

  it("mustaqil quvvat sxemasida Arduino talab qilmaydi", () => {
    const issues = validateCircuit({
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 100, rotation: 0, settings: {} },
        { id: "meter", type: "multimeter", x: 200, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "meter", pinId: "probe-plus" },
          to: { nodeId: "vcc", pinId: "out" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "meter", pinId: "probe-minus" },
          to: { nodeId: "gnd", pinId: "out" },
          color: "black",
        },
      ],
    });
    expect(issues.some((i) => i.message.includes("Arduino plata yo'q"))).toBe(false);
  });

  it("Arduino bo'lmasa ham 5V va GND qisqa tutashuvini aniqlaydi", () => {
    const issues = validateCircuit({
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 100, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "gnd", pinId: "out" },
          color: "red",
        },
      ],
    });
    expect(issues.some((i) => i.severity === "error" && i.message.includes("qisqa tutashuv"))).toBe(
      true,
    );
  });

  it("rezistor 5V va GND orasida bo'lsa qisqa tutashuv deb hisoblamaydi", () => {
    const issues = validateCircuit({
      nodes: [
        { id: "vcc", type: "power-5v", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "gnd", type: "ground", x: 0, y: 100, rotation: 0, settings: {} },
        { id: "r1", type: "resistor", x: 160, y: 40, rotation: 0, settings: { ohms: 220 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "vcc", pinId: "out" },
          to: { nodeId: "r1", pinId: "a" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "r1", pinId: "b" },
          to: { nodeId: "gnd", pinId: "out" },
          color: "black",
        },
      ],
    });
    expect(issues.some((i) => i.severity === "error" && i.message.includes("qisqa tutashuv"))).toBe(
      false,
    );
  });

  it("rezistor ikki tomonini bitta netga aylantirmaydi, lekin pin manbasini topadi", () => {
    const net = buildNetlist(blinkCircuit());

    expect(netFor(net, "r1", "a")).not.toBe(netFor(net, "r1", "b"));
    expect(boardPinFor(net, "led1", "anode")).toBe(13);
  });

  it("to'g'ri yig'ilgan blink sxemasida xato topmaydi", () => {
    const issues = validateCircuit(blinkCircuit());
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

/* ─────────────────────────── Dars tekshiruvi ─────────────────────────── */

describe("dars tekshiruvi", () => {
  it("to'liq bajarilgan blink darsi 100% beradi", () => {
    const lesson = getLesson("miltillovchi-led");
    expect(lesson).not.toBeNull();
    if (!lesson) return;

    const parsed = parseSketch(BLINK_CODE);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    for (let i = 0; i < 40; i++) sim.advance(100);

    const result = checkLesson(lesson, {
      circuit: blinkCircuit(),
      code: BLINK_CODE,
      sketch: parsed.sketch,
      observed: sim.observed,
    });
    expect(result.percent).toBe(100);
    expect(result.failed).toHaveLength(0);
  });

  it("bo'sh sxemada past foiz va maslahat beradi", () => {
    const lesson = getLesson("miltillovchi-led");
    if (!lesson) return;

    const result = checkLesson(lesson, {
      circuit: { nodes: [], wires: [] },
      code: "",
      sketch: null,
      observed: { pinsDrivenHigh: [], pinsDrivenLow: [], ledToggles: 0, usedDelay: false },
    });
    expect(result.percent).toBe(0);
    expect(result.failed[0]?.hint).toBeTruthy();
  });

  it("helper funksiyaga chiqarilgan blink kodini ham tan oladi", () => {
    const lesson = getLesson("miltillovchi-led");
    if (!lesson) return;

    const code = `
      void blinkOnce() {
        digitalWrite(13, HIGH);
        delay(1000);
        digitalWrite(13, LOW);
        delay(1000);
      }

      void setup() { pinMode(13, OUTPUT); }
      void loop() { blinkOnce(); }
    `;
    const parsed = parseSketch(code);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    for (let i = 0; i < 40; i++) sim.advance(100);

    const result = checkLesson(lesson, {
      circuit: blinkCircuit(),
      code,
      sketch: parsed.sketch,
      observed: sim.observed,
    });
    expect(result.failed.map((f) => f.id)).not.toContain("digitalwrite-both");
    expect(result.failed.map((f) => f.id)).not.toContain("delay");
  });
});

/* ─────────────────────────── Import / eksport ─────────────────────────── */

describe("loyiha importi", () => {
  it("eksport qilinadigan loyiha ham sanitizatsiyadan o'tadi", () => {
    const json = exportProject({
      id: "p1",
      name: "  Test  ",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      circuit: {
        nodes: [
          { id: "uno", type: "arduino-uno", x: 0.4, y: 0.6, rotation: 7, settings: {} },
          { id: "led", type: "led", x: 100, y: 0, rotation: 0, settings: { color: "purple" } },
        ],
        wires: [
          {
            id: "w1",
            from: { nodeId: "uno", pinId: "D13__source" },
            to: { nodeId: "led", pinId: "anode__target" },
            color: "blue",
          },
          {
            id: "bad",
            from: { nodeId: "missing", pinId: "out" },
            to: { nodeId: "led", pinId: "cathode" },
            color: "red",
          },
        ],
      },
      code: BLINK_CODE,
      lessonSlug: null,
      sensors: { led: Number.NaN, pot: 512 },
    });

    const exported = JSON.parse(json);
    expect(exported.name).toBe("Test");
    expect(exported.circuit.nodes[0]).toMatchObject({ x: 0, y: 1, rotation: 0 });
    expect(exported.circuit.nodes[1].settings).toEqual({ color: "red" });
    expect(exported.circuit.wires).toEqual([
      {
        id: "w1",
        from: { nodeId: "uno", pinId: "D13" },
        to: { nodeId: "led", pinId: "anode" },
        color: "blue",
      },
    ]);
    expect(exported.sensors).toEqual({ pot: 512 });
    expect(importProject(json).ok).toBe(true);
  });

  it("to'g'ri JSON qabul qilinadi", () => {
    const project = {
      id: "p1",
      name: "Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      circuit: blinkCircuit(),
      code: BLINK_CODE,
      lessonSlug: null,
      sensors: {},
    };
    const result = importProject(JSON.stringify(project));
    expect(result.ok).toBe(true);
  });

  it("noto'g'ri JSON rad etiladi", () => {
    expect(importProject("{buzuq").ok).toBe(false);
  });

  it("tuzilishi mos kelmasa rad etiladi", () => {
    const result = importProject(JSON.stringify({ id: "x", name: "y" }));
    expect(result.ok).toBe(false);
  });

  it("mavjud bo'lmagan komponentga ulangan sim rad etiladi", () => {
    const project = {
      id: "p1",
      name: "Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      circuit: {
        nodes: [{ id: "a", type: "led", x: 0, y: 0, rotation: 0, settings: {} }],
        wires: [
          {
            id: "w",
            from: { nodeId: "a", pinId: "anode" },
            to: { nodeId: "yoq", pinId: "x" },
            color: "red",
          },
        ],
      },
      code: "",
      lessonSlug: null,
      sensors: {},
    };
    const result = importProject(JSON.stringify(project));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("mavjud bo'lmagan");
  });

  it("noma'lum komponent turi importda rad etiladi", () => {
    const project = {
      id: "p1",
      name: "Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      circuit: {
        nodes: [{ id: "x", type: "unknown-part", x: 0, y: 0, rotation: 0, settings: {} }],
        wires: [],
      },
      code: "",
      lessonSlug: null,
      sensors: {},
    };

    const result = importProject(JSON.stringify(project));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("noma'lum komponent");
  });

  it("mavjud bo'lmagan pin importda rad etiladi", () => {
    const project = {
      id: "p1",
      name: "Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      circuit: {
        nodes: [
          { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
          { id: "led", type: "led", x: 100, y: 0, rotation: 0, settings: {} },
        ],
        wires: [
          {
            id: "w",
            from: { nodeId: "uno", pinId: "D99" },
            to: { nodeId: "led", pinId: "anode" },
            color: "blue",
          },
        ],
      },
      code: "",
      lessonSlug: null,
      sensors: {},
    };

    const result = importProject(JSON.stringify(project));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("mavjud bo'lmagan pin");
  });

  it("takrorlangan sim ID importda rad etiladi", () => {
    const project = {
      id: "p1",
      name: "Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      circuit: {
        nodes: [
          { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
          { id: "led", type: "led", x: 100, y: 0, rotation: 0, settings: {} },
        ],
        wires: [
          {
            id: "w",
            from: { nodeId: "uno", pinId: "D13" },
            to: { nodeId: "led", pinId: "anode" },
            color: "blue",
          },
          {
            id: "w",
            from: { nodeId: "uno", pinId: "GND1" },
            to: { nodeId: "led", pinId: "cathode" },
            color: "black",
          },
        ],
      },
      code: "",
      lessonSlug: null,
      sensors: {},
    };

    const result = importProject(JSON.stringify(project));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("takrorlangan sim ID");
  });

  it("eski React Flow handle suffixlarini tozalaydi", () => {
    const circuit = sanitizeCircuit({
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "led", type: "led", x: 100, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "uno", pinId: "D13__source" },
          to: { nodeId: "led", pinId: "anode__target" },
          color: "blue",
        },
      ],
    });

    expect(circuit.wires[0]?.from.pinId).toBe("D13");
    expect(circuit.wires[0]?.to.pinId).toBe("anode");
  });

  it("buzuq localStorage sxemasida takrorlangan node va wire IDlarni xavfsizlaydi", () => {
    const circuit = sanitizeCircuit({
      nodes: [
        { id: "dup", type: "led", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "dup", type: "buzzer", x: 100, y: 0, rotation: 0, settings: {} },
        { id: "uno", type: "arduino-uno", x: 200, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w",
          from: { nodeId: "uno", pinId: "D13" },
          to: { nodeId: "dup", pinId: "anode" },
          color: "blue",
        },
        {
          id: "w",
          from: { nodeId: "uno", pinId: "GND1" },
          to: { nodeId: "dup", pinId: "cathode" },
          color: "black",
        },
      ],
    });

    expect(circuit.nodes.map((n) => n.id)).toEqual(["dup", "uno"]);
    expect(new Set(circuit.wires.map((w) => w.id)).size).toBe(circuit.wires.length);
    expect(circuit.wires.map((w) => w.id)).toEqual(["w", "w-2"]);
  });
});

/* ─────────────────────────── Xavfsizlik / chidamlilik ─────────────────────────── */

describe("xavfsizlik", () => {
  it("prototip ifloslanishiga yo'l qo'ymaydi", () => {
    const payload = JSON.stringify({
      id: "p",
      name: "n",
      createdAt: "a",
      updatedAt: "b",
      code: "",
      lessonSlug: null,
      sensors: JSON.parse('{"__proto__": {"polluted": true}}'),
      circuit: { nodes: [], wires: [] },
    });
    importProject(payload);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("juda katta faylni rad etadi", () => {
    const big = JSON.stringify({
      id: "p",
      name: "n",
      createdAt: "a",
      updatedAt: "b",
      code: "x".repeat(600_000),
      lessonSlug: null,
      sensors: {},
      circuit: { nodes: [], wires: [] },
    });
    const result = importProject(big);
    expect(result.ok).toBe(false);
  });

  it("chegaradan ortiq komponentli sxemani rad etadi", () => {
    const many = JSON.stringify({
      id: "p",
      name: "n",
      createdAt: "a",
      updatedAt: "b",
      code: "",
      lessonSlug: null,
      sensors: {},
      circuit: {
        nodes: Array.from({ length: 500 }, (_, i) => ({
          id: `n${i}`,
          type: "led",
          x: 0,
          y: 0,
          rotation: 0,
          settings: {},
        })),
        wires: [],
      },
    });
    expect(importProject(many).ok).toBe(false);
  });

  it("ruxsat etilmagan funksiyani bajarmaydi", () => {
    const parsed = parseSketch(`void setup(){ fetch("http://evil"); } void loop(){}`);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(50);
    expect(sim.fatal).toContain("qo'llab-quvvatlanmaydi");
  });

  it("process.env kabi tashqi obyektlarga kirishga yo'l qo'ymaydi", () => {
    const parsed = parseSketch(
      `void setup(){ Serial.begin(9600); Serial.println(process.env); } void loop(){}`,
    );
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(50);
    expect(sim.fatal).toBeTruthy();
  });

  it("virtual soat siljimaydigan cheksiz siklni aniqlaydi", () => {
    // Shart hech qachon bajarilmaydi va `delay` yo'q — soat turib qoladi.
    const parsed = parseSketch(`void setup(){} void loop(){ for(int i=0;i<1;i=0){ } }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    // Bir necha kadr — aniqlash uchun yetarli.
    for (let i = 0; i < 20 && !sim.fatal; i++) sim.advance(16);

    /*
     * Ikki himoya bor va ikkalasi ham to'g'ri: sikl ichidagi amallar chegarasi
     * (`MAX_OPS_PER_LOOP`) va virtual soat siljimasligini kuzatish
     * (`MAX_STALLED_TICKS`). Qaysi biri birinchi ishlashi kodga bog'liq —
     * muhimi, foydalanuvchi tushunarli xato oladi va brauzer qotmaydi.
     */
    expect(sim.fatal).toBeTruthy();
    expect(sim.fatal).toMatch(/sikl|cheksiz aylanyapti/);
  });

  it("cheksiz sikl bo'lsa ham simulyatsiya tez qaytadi (brauzer qotmaydi)", () => {
    const parsed = parseSketch(`void setup(){} void loop(){ while(1){ } }`);
    if (!parsed.ok) throw new Error("parse xato");

    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();

    const started = Date.now();
    for (let i = 0; i < 20 && !sim.fatal; i++) sim.advance(16);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});

/* ─────────────────── Plata chizmasi ─────────────────── */

describe("Arduino Uno chizmasi va katalogi", () => {
  const board = CATALOG.find((c) => c.type === "arduino-uno")!;

  it("har bir pin identifikatori yagona", () => {
    const ids = UNO_PINS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("katalog pinlari chizmadan olinadi — soni va joyi mos", () => {
    expect(board.pins).toHaveLength(UNO_PINS.length);
    for (const spec of UNO_PINS) {
      const pin = board.pins.find((p) => p.id === spec.id);
      expect(pin, `${spec.id} katalogda yo'q`).toBeTruthy();
      // 0–1 nisbat: SVG o'lchami o'zgarsa ham sim joyida qoladi.
      expect(pin!.x).toBeCloseTo(spec.x / UNO_VIEWBOX.width, 5);
      expect(pin!.y).toBeCloseTo(spec.y / UNO_VIEWBOX.height, 5);
    }
  });

  it("barcha pinlar plata gabariti ichida", () => {
    for (const p of UNO_PINS) {
      expect(p.x).toBeGreaterThanOrEqual(UNO_BOARD.x);
      expect(p.x).toBeLessThanOrEqual(UNO_BOARD.x + UNO_BOARD.w);
      expect(p.y).toBeGreaterThanOrEqual(UNO_BOARD.y);
      expect(p.y).toBeLessThanOrEqual(UNO_BOARD.y + UNO_BOARD.h);
    }
  });

  it("qo'shni pinlar bir-birining ustiga tushmaydi", () => {
    const rows = new Map<number, number[]>();
    for (const p of UNO_PINS) {
      const row = rows.get(p.y);
      if (row) row.push(p.x);
      else rows.set(p.y, [p.x]);
    }
    for (const xs of rows.values()) {
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(UNO_PITCH);
      }
    }
  });

  it("eski loyihalardagi pin nomlari saqlangan", () => {
    // Bu identifikatorlar saqlangan sxemalarda uchraydi — o'zgarsa,
    // foydalanuvchilarning ishlari buziladi.
    for (const id of ["D2", "D13", "5V", "3V3", "GND1", "GND2", "A0", "A5"]) {
      expect(
        board.pins.some((p) => p.id === id),
        `${id} yo'qolgan`,
      ).toBe(true);
    }
  });

  it("yuqori qatordagi GND ham yer sifatida qabul qilinadi", () => {
    // Validator GND pinlarini katalogdan oladi: yangi GND3 qo'shilganda
    // "GND ulanmagan" degan noto'g'ri xato chiqmasligi kerak.
    const circuit = blinkCircuit();
    const gnd = circuit.wires.find((w) => w.to.pinId === "GND1" || w.from.pinId === "GND1");
    expect(gnd, "test sxemasida GND1 simi yo'q").toBeTruthy();
    if (gnd!.from.pinId === "GND1") gnd!.from.pinId = "GND3";
    else gnd!.to.pinId = "GND3";

    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("GND pini sxemaga ulanmagan"))).toBe(false);
  });
});

/* ─────────────────── Plata kompozitsiyasi ─────────────────── */

/**
 * Chizma "ko'zga chiroyli ko'rinishi" — bu sinab bo'lmaydigan narsa. Lekin
 * uning ostidagi kompozitsiya qoidalari o'lchanadi: hech narsa bir-birining
 * ustiga tushmasligi, hamma narsa plata ichida qolishi va yozuvlar uchun
 * ajratilgan yo'laklar bo'sh turishi kerak. Aynan shu qoidalar buzilgani
 * uchun avvalgi chizmada o'ng chekka siqilib, "IOREF" va "RESET" yozuvlari
 * bir-biriga urilardi.
 */
describe("PilotKids UNO kompozitsiyasi", () => {
  const overlaps = (a: UnoRect, b: UnoRect): boolean =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  /** Yirik qismlar — nomi bilan, xato xabari tushunarli bo'lsin. */
  const parts: Array<[string, UnoRect]> = [
    ["usb", UNO_PARTS.usb],
    ["dcJack", UNO_PARTS.dcJack],
    ["usbChip", UNO_PARTS.usbChip],
    ["crystal", UNO_PARTS.crystal],
    ["regulator", UNO_PARTS.regulator],
    ["mcu", UNO_PARTS.mcu],
    ["reset", UNO_PARTS.reset],
    ...UNO_CAPS.map(
      (c, i) =>
        [`cap${i}`, { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 }] as [string, UnoRect],
    ),
    ...UNO_ICSP.map((h) => [h.id, { x: h.x, y: h.y, w: h.w, h: h.h }] as [string, UnoRect]),
  ];

  it("plata nisbati haqiqiy Uno gabaritiga mos", () => {
    // 68.58 / 53.34 = 1.2857. Chetlanish 2% dan oshmasin.
    expect(UNO_BOARD.w / UNO_BOARD.h).toBeCloseTo(68.58 / 53.34, 1);
  });

  it("qadam plataning enida haqiqiy sondagi uyaga to'g'ri keladi", () => {
    // 68.58 mm / 2.54 mm = 27 qadam. Avvalgi chizmada atigi 20 ta edi —
    // shuning uchun hamma narsa siqilgandek ko'rinardi.
    expect(UNO_BOARD.w / UNO_PITCH).toBeGreaterThan(25);
    expect(UNO_BOARD.w / UNO_PITCH).toBeLessThan(29);
  });

  it("chizmadagi hamma narsa viewBox ichida", () => {
    for (const [name, r] of parts) {
      expect(r.x, `${name} chapdan chiqib ketdi`).toBeGreaterThanOrEqual(0);
      expect(r.y, `${name} yuqoridan chiqib ketdi`).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, `${name} o'ngdan chiqib ketdi`).toBeLessThanOrEqual(UNO_VIEWBOX.width);
      expect(r.y + r.h, `${name} pastdan chiqib ketdi`).toBeLessThanOrEqual(UNO_VIEWBOX.height);
    }
  });

  it("yirik qismlar bir-birining ustiga tushmaydi", () => {
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const [aName, a] = parts[i]!;
        const [bName, b] = parts[j]!;
        expect(overlaps(a, b), `${aName} va ${bName} kesishadi`).toBe(false);
      }
    }
  });

  it("qismlar header uyalari zonasiga kirmaydi", () => {
    for (const h of UNO_HEADERS) {
      for (const [name, r] of parts) {
        expect(overlaps(r, h), `${name} ${h.id} headeriga tegib turibdi`).toBe(false);
      }
    }
  });

  /*
   * Silkscreen uchun ikkita yo'lak ajratilgan: yuqorida pin nomlari va
   * "DIGITAL (PWM ~)", pastda pin nomlari va POWER/ANALOG IN. Hech qanday
   * detal bu yo'laklarga kirmasligi kerak, aks holda yozuv o'qilmay qoladi.
   */
  it("silkscreen yo'laklari bo'sh", () => {
    const bands: Array<[string, UnoRect]> = [
      ["yuqori yozuvlar", { x: 124, y: UNO_TEXT.topPinLabelY - 8, w: 208, h: 22 }],
      ["pastki yozuvlar", { x: 145, y: 226, w: 187, h: 20 }],
    ];
    for (const [bandName, band] of bands) {
      for (const [name, r] of parts) {
        expect(overlaps(r, band), `${name} "${bandName}" yo'lagiga kirdi`).toBe(false);
      }
    }
  });

  it("brend yozuvi chip va yo'laklarga tegmaydi", () => {
    // Yozuv kengligini shrift o'lchamidan taxminlaymiz (14px, ~0.62 em kenglik).
    const width = UNO_BRANDING.title.length * 14 * 0.62;
    const brand: UnoRect = {
      x: UNO_BRANDING.x - width / 2,
      y: UNO_BRANDING.titleY - 12,
      w: width,
      h: UNO_BRANDING.subtitleY - UNO_BRANDING.titleY + 16,
    };
    for (const [name, r] of parts) {
      expect(overlaps(r, brand), `brend yozuvi ${name} ustiga chiqdi`).toBe(false);
    }
  });

  it("indikator LED'lar va ularning yozuvlari qismlarga tegmaydi", () => {
    for (const led of UNO_LEDS) {
      const box: UnoRect = { x: led.x - 7, y: led.y - 6, w: 14, h: 22 };
      for (const [name, r] of parts) {
        expect(overlaps(box, r), `${led.id} indikatori ${name} ustida`).toBe(false);
      }
    }
  });

  it("mahkamlash teshiklari pin bilan chalkashmaydi", () => {
    for (const m of UNO_MOUNTS) {
      expect(m.x).toBeGreaterThanOrEqual(UNO_BOARD.x);
      expect(m.x).toBeLessThanOrEqual(UNO_BOARD.x + UNO_BOARD.w);
      for (const p of UNO_PINS) {
        const dx = Math.abs(p.x - m.x);
        const dy = Math.abs(p.y - m.y);
        // Teshik radiusi 6, uya yarim eni 4.4 — 11 birlik yetarli tafovut.
        expect(dx > 11 || dy > 11, `teshik (${m.x},${m.y}) uya bilan ustma-ust`).toBe(true);
      }
    }
  });

  it("header korpusi barcha uyalarni to'liq qoplaydi", () => {
    for (const p of UNO_PINS) {
      const host = UNO_HEADERS.find(
        (h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h,
      );
      expect(host, `${p.id} hech qaysi header ichida emas`).toBeTruthy();
    }
  });

  it("har bir header uyalar soniga mos kenglikda", () => {
    for (const h of UNO_HEADERS) {
      const inside = UNO_PINS.filter(
        (p) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h,
      );
      expect(inside, `${h.id} uyalari soni`).toHaveLength(h.slots);
    }
  });

  it("guruh yozuvlari pin yozuvlari bilan bir chiziqqa tushmaydi", () => {
    for (const g of UNO_GROUP_LABELS) {
      const pinRow = g.y < 100 ? UNO_TEXT.topPinLabelY : UNO_TEXT.bottomPinLabelY;
      expect(Math.abs(g.y - pinRow), `"${g.text}" pin yozuvlariga juda yaqin`).toBeGreaterThan(9);
    }
  });

  it("kontur yopiq va o'ng chekkadagi o'yiqni o'z ichiga oladi", () => {
    const d = unoOutlinePath();
    expect(d.trim().endsWith("Z")).toBe(true);
    // O'yiq — konturdagi ichkariga kirgan gorizontal qadam.
    expect(d).toContain(`H${UNO_BOARD.x + UNO_BOARD.w - 8}`);
  });
});

/* ─────────────────── Batareya ─────────────────── */

/**
 * Batareya — birinchi mustaqil quvvat manbai: uning bilan yig'ilgan sxema
 * Arduino'siz ham ishlashi kerak. Shuning uchun testlar nafaqat katalogni,
 * balki elektr modelini ham tekshiradi: kuchlanish qayerdan kelib, qayerga
 * yetib boradi va nima uchun LED yonadi yoki yonmaydi.
 */
describe("Batareya", () => {
  const def = CATALOG.find((c) => c.type === "battery")!;

  /** Batareya → rezistor → LED → batareya: eng oddiy yopiq zanjir. */
  function batteryCircuit(settings: Record<string, string | number | boolean> = {}): Circuit {
    return {
      nodes: [
        {
          id: "bat",
          type: "battery",
          x: 0,
          y: 0,
          rotation: 0,
          settings: { voltage: 9, enabled: true, polarity: "normal", ...settings },
        },
        { id: "r1", type: "resistor", x: 200, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "led", type: "led", x: 400, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "bat", pinId: "plus" },
          to: { nodeId: "r1", pinId: "a" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "r1", pinId: "b" },
          to: { nodeId: "led", pinId: "anode" },
          color: "blue",
        },
        {
          id: "w3",
          from: { nodeId: "led", pinId: "cathode" },
          to: { nodeId: "bat", pinId: "minus" },
          color: "black",
        },
      ],
    };
  }

  /**
   * Batareya sxemasida kod ishtirok etmaydi — bo'sh eskiz yetarli, chunki
   * zanjir Arduino'siz ham yopiq. Shuning uchun bitta yordamchi.
   */
  const simulate = (circuit: Circuit): Simulator => {
    const parsed = parseSketch("void setup() {} void loop() {}");
    if (!parsed.ok) throw new Error("bo'sh eskiz tahlil qilinmadi");
    return new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
  };

  const brightnessOf = (circuit: Circuit): number =>
    simulate(circuit).getRuntimeState().led?.brightness ?? 0;

  it("katalogda to'g'ri e'lon qilingan", () => {
    expect(def).toBeTruthy();
    expect(def.name).toBe("Batareya");
    expect(def.category).toBe("power");
    expect(def.defaults.voltage).toBe(BATTERY_DEFAULT_VOLTAGE);
    // Pin identifikatorlari saqlangan sxemalarda uchraydi — o'zgarmasligi shart.
    expect(def.pins.map((p) => p.id).sort()).toEqual(["minus", "plus"]);
  });

  it("terminallar chap va o'ng chetda, o'rta chiziqda turadi", () => {
    const minus = def.pins.find((p) => p.id === "minus")!;
    const plus = def.pins.find((p) => p.id === "plus")!;
    expect(minus.x).toBeLessThan(0.1);
    expect(plus.x).toBeGreaterThan(0.9);
    expect(minus.y).toBeCloseTo(0.5, 2);
    expect(plus.y).toBeCloseTo(0.5, 2);
    expect(minus.polarity).toBe("negative");
    expect(plus.polarity).toBe("positive");
  });

  it("barcha tayyor kuchlanishlar ruxsat etilgan oraliqda", () => {
    const setting = def.settings.find((s) => s.key === "voltage")!;
    if (setting.kind !== "number") throw new Error("kuchlanish raqamli sozlama bo'lishi kerak");
    for (const volts of BATTERY_PRESETS) {
      expect(volts).toBeGreaterThanOrEqual(setting.min);
      expect(volts).toBeLessThanOrEqual(setting.max);
    }
  });

  it("kuchlanish sozlamalardan o'qiladi va chegaralanadi", () => {
    expect(batteryVoltage({ voltage: 9, enabled: true, polarity: "normal" })).toBe(9);
    expect(batteryVoltage({ voltage: 100, enabled: true, polarity: "normal" })).toBe(24);
    expect(batteryVoltage({ voltage: 9, enabled: false, polarity: "normal" })).toBe(0);
    expect(batteryVoltage({ voltage: 9, enabled: true, polarity: "reversed" })).toBe(-9);
  });

  it("musbat qutb tanlangan kuchlanishni beradi, manfiysi — sanoq nuqtasi", () => {
    const net = buildNetlist(batteryCircuit({ voltage: 12 }));
    const plusNet = netFor(net, "bat", "plus")!;
    const minusNet = netFor(net, "bat", "minus")!;
    expect(net.sourceNets.get(plusNet)).toBe(12);
    expect(net.groundNets.has(minusNet)).toBe(true);
    // Rezistor orqali ham kuchlanish LED anodiga yetib boradi.
    expect(supplyVoltage(net, "led", "anode")).toBe(12);
  });

  it("teskari solinganda qutblar almashadi", () => {
    const net = buildNetlist(batteryCircuit({ polarity: "reversed" }));
    expect(net.groundNets.has(netFor(net, "bat", "plus")!)).toBe(true);
    expect(net.sourceNets.get(netFor(net, "bat", "minus")!)).toBe(9);
  });

  it("o'chirilgan batareya zanjirga kuchlanish bermaydi", () => {
    const net = buildNetlist(batteryCircuit({ enabled: false }));
    expect(net.sourceNets.size).toBe(0);
    expect(net.powerNets.size).toBe(0);
  });

  it("9V batareya LEDni yoqadi, 1.5V esa yoqmaydi", () => {
    expect(brightnessOf(batteryCircuit({ voltage: 9 }))).toBe(1);
    // Qizil LEDning ochilish kuchlanishi ~1.8 V — bu haqiqiy hayotdagi hol.
    expect(brightnessOf(batteryCircuit({ voltage: 1.5 }))).toBe(0);
  });

  it("teskari solingan yoki o'chirilgan batareyada LED yonmaydi", () => {
    expect(brightnessOf(batteryCircuit({ polarity: "reversed" }))).toBe(0);
    expect(brightnessOf(batteryCircuit({ enabled: false }))).toBe(0);
  });

  it("multimetr batareyaning aniq kuchlanishini ko'rsatadi", () => {
    const circuit = batteryCircuit({ voltage: 12 });
    circuit.nodes.push({
      id: "meter",
      type: "multimeter",
      x: 600,
      y: 0,
      rotation: 0,
      settings: {},
    });
    circuit.wires.push(
      {
        id: "w4",
        from: { nodeId: "meter", pinId: "probe-plus" },
        to: { nodeId: "bat", pinId: "plus" },
        color: "red",
      },
      {
        id: "w5",
        from: { nodeId: "meter", pinId: "probe-minus" },
        to: { nodeId: "bat", pinId: "minus" },
        color: "black",
      },
    );
    expect(simulate(circuit).getRuntimeState().meter?.voltage).toBe(12);
  });

  it("batareyali sxemada Arduino talab qilinmaydi", () => {
    const issues = validateCircuit(batteryCircuit());
    expect(issues.some((i) => i.message.includes("Arduino plata yo'q"))).toBe(false);
    expect(issues.some((i) => i.severity === "error")).toBe(false);
  });

  it("qutblarni bevosita ulash qisqa tutashuv deb topiladi", () => {
    const issues = validateCircuit({
      nodes: [
        {
          id: "bat",
          type: "battery",
          x: 0,
          y: 0,
          rotation: 0,
          settings: { voltage: 9, enabled: true, polarity: "normal" },
        },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "bat", pinId: "plus" },
          to: { nodeId: "bat", pinId: "minus" },
          color: "red",
        },
      ],
    });
    expect(
      issues.some((i) => i.severity === "error" && i.message.includes("qisqa tutashgan")),
    ).toBe(true);
  });

  it("qutblarni sim bilan ulashga ruxsat bermaydi", () => {
    const circuit: Circuit = {
      nodes: [
        {
          id: "bat",
          type: "battery",
          x: 0,
          y: 0,
          rotation: 0,
          settings: { voltage: 9, enabled: true, polarity: "normal" },
        },
      ],
      wires: [],
    };
    const result = canConnect(
      circuit,
      { nodeId: "bat", pinId: "plus" },
      { nodeId: "bat", pinId: "minus" },
    );
    expect(result.ok).toBe(false);
  });

  it("Arduino 5V piniga yuqori kuchlanish berilsa xato beradi", () => {
    const issues = validateCircuit({
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        {
          id: "bat",
          type: "battery",
          x: 400,
          y: 0,
          rotation: 0,
          settings: { voltage: 12, enabled: true, polarity: "normal" },
        },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "bat", pinId: "plus" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "bat", pinId: "minus" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    });
    expect(issues.some((i) => i.severity === "error" && i.message.includes("5V piniga"))).toBe(
      true,
    );
  });

  it("o'chirilgan va teskari batareya haqida ogohlantiradi", () => {
    expect(
      validateCircuit(batteryCircuit({ enabled: false })).some((i) =>
        i.message.includes("o'chirilgan"),
      ),
    ).toBe(true);
    expect(
      validateCircuit(batteryCircuit({ polarity: "reversed" })).some((i) =>
        i.message.includes("teskari solingan"),
      ),
    ).toBe(true);
  });

  it("turli kuchlanishdagi batareyalarni parallel ulashni taqiqlaydi", () => {
    const issues = validateCircuit({
      nodes: [
        {
          id: "b1",
          type: "battery",
          x: 0,
          y: 0,
          rotation: 0,
          settings: { voltage: 9, enabled: true, polarity: "normal" },
        },
        {
          id: "b2",
          type: "battery",
          x: 0,
          y: 200,
          rotation: 0,
          settings: { voltage: 3, enabled: true, polarity: "normal" },
        },
        { id: "r1", type: "resistor", x: 300, y: 0, rotation: 0, settings: { ohms: 220 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "b1", pinId: "plus" },
          to: { nodeId: "b2", pinId: "plus" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "b1", pinId: "plus" },
          to: { nodeId: "r1", pinId: "a" },
          color: "red",
        },
        {
          id: "w3",
          from: { nodeId: "r1", pinId: "b" },
          to: { nodeId: "b1", pinId: "minus" },
          color: "black",
        },
      ],
    });
    expect(
      issues.some((i) => i.severity === "error" && i.message.includes("Turli kuchlanishdagi")),
    ).toBe(true);
  });

  it("saqlab-ochilganda sozlamalar yo'qolmaydi", () => {
    const circuit = sanitizeCircuit(
      batteryCircuit({ voltage: 3, enabled: false, polarity: "reversed" }),
    );
    const battery = circuit.nodes.find((n) => n.id === "bat")!;
    expect(battery.settings.voltage).toBe(3);
    expect(battery.settings.enabled).toBe(false);
    expect(battery.settings.polarity).toBe("reversed");
  });

  it("noto'g'ri saqlangan qiymatlar chegaraga qaytariladi", () => {
    const circuit = sanitizeCircuit(batteryCircuit({ voltage: 999, polarity: "qandaydir-qiymat" }));
    const battery = circuit.nodes.find((n) => n.id === "bat")!;
    expect(battery.settings.voltage).toBe(24);
    expect(battery.settings.polarity).toBe("normal");
  });
});

describe("canvas geometriyasi", () => {
  it("aylantirilgan komponent pin nuqtasini markaz atrofida hisoblaydi", () => {
    const led = CATALOG.find((c) => c.type === "led");
    const anode = led?.pins.find((p) => p.id === "anode");
    if (!led || !anode) throw new Error("LED katalogda topilmadi");

    const normal = pinPoint(led, anode, 0);
    const rotated = pinPoint(led, anode, 180);

    expect(normal.x).toBeCloseTo(19.2);
    expect(normal.y).toBeCloseTo(76);
    expect(rotated.x).toBeCloseTo(40.8);
    expect(rotated.y).toBeCloseTo(4);
  });
});
