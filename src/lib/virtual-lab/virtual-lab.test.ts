import { describe, expect, it } from "vitest";
import { parseSketch } from "./parser";
import { Simulator } from "./simulator";
import { canConnect, validateCircuit } from "./validator";
import { checkLesson, getLesson } from "./lessons";
import { exportProject, importProject, sanitizeCircuit } from "./storage";
import {
  BATTERY_DEFAULT_VOLTAGE,
  BATTERY_PRESETS,
  CATALOG,
  DHT11_RANGE,
  LCD_COLUMNS,
  RESISTOR_PRESETS,
  batteryVoltage,
  formatOhms,
  getDefinition,
  resistorOhms,
} from "./catalog";
import { boardPinFor, buildNetlist, netFor, resistanceToSource, supplyVoltage } from "./netlist";
import { solveCircuit } from "./solver";
import { BB_VIEWBOX, breadboardHoles } from "./breadboard-layout";
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
    // Xabar matni aniqlashtirildi: endi natijasi ham aytiladi.
    expect(issues.some((i) => i.message.includes("yerga ulanmagan"))).toBe(true);
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

/* ─────────────────── Rezistor qarshiligi ─────────────────── */

/**
 * Ilgari `ohms` sozlamasi faqat yozuv sifatida ishlatilardi: elektr modelga
 * ham, chizmadagi rang halqalariga ham ta'sir qilmasdi. Ya'ni 220 Ω va
 * 10 kΩ bir xil natija berardi. Quyidagi testlar aynan shuni qo'riqlaydi.
 */
describe("Rezistor qarshiligi", () => {
  /** Batareya → rezistor → LED → batareya. */
  function circuitWith(ohms: number, voltage = 5): Circuit {
    return {
      nodes: [
        {
          id: "bat",
          type: "battery",
          x: 0,
          y: 0,
          rotation: 0,
          settings: { voltage, enabled: true, polarity: "normal" },
        },
        { id: "r1", type: "resistor", x: 200, y: 0, rotation: 0, settings: { ohms } },
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

  const brightness = (ohms: number, voltage = 5): number => {
    const parsed = parseSketch("void setup() {} void loop() {}");
    if (!parsed.ok) throw new Error("bo'sh eskiz tahlil qilinmadi");
    const sim = new Simulator({
      circuit: circuitWith(ohms, voltage),
      sketch: parsed.sketch,
      sensors: {},
    });
    return sim.getRuntimeState().led?.brightness ?? 0;
  };

  it("qiymat chegaralarga tushiriladi", () => {
    expect(resistorOhms({ ohms: 270 })).toBe(270);
    expect(resistorOhms({ ohms: 1 })).toBe(10);
    expect(resistorOhms({ ohms: 999999 })).toBe(100000);
    expect(resistorOhms({})).toBe(220);
  });

  it("qiymat o'qishga qulay yoziladi", () => {
    expect(formatOhms(220)).toBe("220 Ω");
    expect(formatOhms(1000)).toBe("1 kΩ");
    expect(formatOhms(4700)).toBe("4.7 kΩ");
  });

  it("netlistda qarshilik saqlanadi va yig'iladi", () => {
    const net = buildNetlist(circuitWith(470));
    expect(net.passiveLinks[0]?.ohms).toBe(470);
    // LED anodidan manbagacha aynan shu rezistor turadi.
    expect(resistanceToSource(net, "led", "anode")).toBe(470);
  });

  it("ketma-ket ikki rezistorning qarshiligi qo'shiladi", () => {
    const circuit = circuitWith(220);
    circuit.nodes.push({
      id: "r2",
      type: "resistor",
      x: 300,
      y: 0,
      rotation: 0,
      settings: { ohms: 330 },
    });
    // r1 → r2 → LED
    circuit.wires = circuit.wires.filter((w) => w.id !== "w2");
    circuit.wires.push(
      {
        id: "w2a",
        from: { nodeId: "r1", pinId: "b" },
        to: { nodeId: "r2", pinId: "a" },
        color: "blue",
      },
      {
        id: "w2b",
        from: { nodeId: "r2", pinId: "b" },
        to: { nodeId: "led", pinId: "anode" },
        color: "blue",
      },
    );
    expect(resistanceToSource(buildNetlist(circuit), "led", "anode")).toBe(550);
  });

  it("qarshilik ortganda LED xiralashadi", () => {
    // 5 V va 220 Ω — darsliklardagi standart juftlik, to'liq yorqinlik.
    expect(brightness(220)).toBe(1);
    const dim = brightness(1000);
    const dimmer = brightness(10000);
    expect(dim).toBeGreaterThan(0);
    expect(dim).toBeLessThan(0.35);
    expect(dimmer).toBeLessThan(dim);
    expect(dimmer).toBeLessThan(0.05);
  });

  it("qarshilik kamayganda yorqinlik ortadi", () => {
    expect(brightness(470)).toBeLessThan(brightness(220));
    expect(brightness(100)).toBe(1);
  });

  it("yuqori kuchlanish katta qarshilikni qoplaydi", () => {
    // 9 V bilan 1 kΩ, 5 V bilan 1 kΩ dan yorqinroq.
    expect(brightness(1000, 9)).toBeGreaterThan(brightness(1000, 5));
  });

  it("juda kichik qarshilik haqida ogohlantiradi", () => {
    const issues = validateCircuit(circuitWith(10, 9));
    expect(issues.some((i) => i.message.includes("juda kichik"))).toBe(true);
  });

  it("juda katta qarshilik haqida ogohlantiradi", () => {
    const issues = validateCircuit(circuitWith(100000));
    expect(issues.some((i) => i.message.includes("juda katta"))).toBe(true);
  });

  it("to'g'ri tanlangan qarshilikda ogohlantirish bermaydi", () => {
    const issues = validateCircuit(circuitWith(220));
    expect(issues.some((i) => i.message.includes("juda kichik"))).toBe(false);
    expect(issues.some((i) => i.message.includes("juda katta"))).toBe(false);
  });

  it("barcha standart nominal qiymatlar oraliqda", () => {
    for (const ohms of RESISTOR_PRESETS) expect(resistorOhms({ ohms })).toBe(ohms);
  });

  it("saqlab-ochilganda qarshilik yo'qolmaydi", () => {
    const restored = sanitizeCircuit(circuitWith(270));
    expect(restored.nodes.find((n) => n.id === "r1")?.settings.ohms).toBe(270);
  });
});

/* ─────────────────── Audit tuzatishlari (regressiya) ─────────────────── */

describe("audit tuzatishlari", () => {
  /** blinkCircuit'ni berilgan rezistor bilan qaytaradi. */
  function circuitOhms(ohms: number): Circuit {
    const circuit = blinkCircuit();
    const r = circuit.nodes.find((n) => n.id === "r1");
    if (r) r.settings = { ohms };
    return circuit;
  }

  /** D13 HIGH bo'lganda Arduino boshqargan LED yorqinligi. */
  function drivenBrightness(ohms: number): number {
    const parsed = parseSketch(
      `void setup(){ pinMode(13, OUTPUT); digitalWrite(13, HIGH); } void loop(){ delay(100); }`,
    );
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: circuitOhms(ohms), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    return sim.getRuntimeState().led1?.brightness ?? 0;
  }

  it("Arduino boshqargan LEDda rezistor qiymati yorqinlikka ta'sir qiladi", () => {
    // Ilgari 220 Ω ham, 10 kΩ ham bir xil to'liq yorqinlik berardi — rezistor
    // darsining butun mazmuni yo'qolardi.
    expect(drivenBrightness(220)).toBe(1);
    const dim = drivenBrightness(10000);
    expect(dim).toBeGreaterThan(0);
    expect(dim).toBeLessThan(0.05);
    expect(drivenBrightness(1000)).toBeLessThan(drivenBrightness(220));
  });

  it("delay'siz loop cheksiz sikl deb noto'g'ri o'ldirilmaydi", () => {
    const parsed = parseSketch(
      `void setup(){ pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, HIGH); }`,
    );
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    for (let i = 0; i < 20 && !sim.fatal; i++) sim.advance(16);
    expect(sim.fatal).toBeNull();
    expect(sim.getRuntimeState().led1?.brightness).toBe(1);
    // Virtual soat delay'siz loop'da ham oldinga siljiydi.
    expect(sim.time).toBeGreaterThan(0);
  });

  it("delay'siz millis() asosidagi bloklanmaydigan miltillash ishlaydi", () => {
    const parsed = parseSketch(`
      unsigned long oxirgi = 0;
      int holat = 0;
      void setup(){ pinMode(13, OUTPUT); }
      void loop(){
        if (millis() - oxirgi >= 200) {
          oxirgi = millis();
          holat = holat == 0 ? 1 : 0;
          digitalWrite(13, holat);
        }
      }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    for (let i = 0; i < 200 && !sim.fatal; i++) sim.advance(16);
    expect(sim.fatal).toBeNull();
    // Bir necha marta yonib-o'chgan bo'lishi kerak.
    expect(sim.observed.ledToggles).toBeGreaterThanOrEqual(2);
  });

  it("butun sonli bo'lish C kabi qirqiladi", () => {
    const parsed = parseSketch(`
      void setup(){
        Serial.begin(9600);
        Serial.println(7 / 2);
        Serial.println(9 / 2);
        Serial.println(7 / 2.5);
      }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const texts = sim.getLogs().map((l) => l.text);
    expect(texts).toContain("3"); // 7/2 → 3, not 3.5
    expect(texts).toContain("4"); // 9/2 → 4
    expect(texts).toContain("2.8"); // kasr bo'luvchi bilan haqiqiy bo'lish
  });

  it("map() butun son qaytaradi", () => {
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); Serial.println(map(512, 0, 1023, 0, 255)); }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getLogs().some((l) => l.text === "127")).toBe(true);
  });

  it("uchlik operator (?:) ni qo'llab-quvvatlaydi", () => {
    const parsed = parseSketch(`
      void setup(){ Serial.begin(9600); Serial.println(1 ? 10 : 20); Serial.println(0 ? 10 : 20); }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const texts = sim.getLogs().map((l) => l.text);
    expect(texts).toContain("10");
    expect(texts).toContain("20");
  });

  it("sonli qo'shimchalar (L, UL, f) qabul qilinadi", () => {
    expect(parseSketch(`void setup(){ delay(1000L); } void loop(){}`).ok).toBe(true);
    expect(parseSketch(`unsigned long t = 60000UL; void setup(){} void loop(){}`).ok).toBe(true);
    expect(parseSketch(`void setup(){ float k = 1.5f; } void loop(){}`).ok).toBe(true);
  });

  it("#define konstantaga (A0) ishora qilsa yechiladi", () => {
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
          id: "wg",
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
      #define SENSOR A0
      void setup(){ Serial.begin(9600); Serial.println(analogRead(SENSOR)); }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: { pot: 750 } });
    sim.start();
    sim.advance(20);
    expect(sim.getLogs().some((l) => l.text === "750")).toBe(true);
  });

  it("#define qavs ichidagi sonni (13) o'qiydi", () => {
    const parsed = parseSketch(`
      #define LED_PIN (13)
      void setup(){ pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, HIGH); }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.fatal).toBeNull();
    expect(sim.getRuntimeState().led1?.brightness).toBe(1);
  });

  it("noto'g'ri analog pin uchun aniq xato beradi", () => {
    const parsed = parseSketch(`void setup(){ analogRead(999); } void loop(){ delay(100); }`);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.fatal).toContain("noto'g'ri pin");
  });

  it("qochirish belgisi \\r matnda saqlanadi", () => {
    const code =
      'void setup(){ Serial.begin(9600); Serial.print("A\\rB"); } void loop(){ delay(100); }';
    const parsed = parseSketch(code);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.getLogs().some((l) => l.text === "A\rB")).toBe(true);
  });

  it("batareya + Arduino sxemasida soxta 3V3 xatosi bo'lmaydi", () => {
    // Batareya plataga UMUMAN ulanmagan — yonida turibdi.
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        {
          id: "bat",
          type: "battery",
          x: 0,
          y: 300,
          rotation: 0,
          settings: { voltage: 9, enabled: true, polarity: "normal" },
        },
        { id: "r1", type: "resistor", x: 200, y: 300, rotation: 0, settings: { ohms: 470 } },
        { id: "led", type: "led", x: 400, y: 300, rotation: 0, settings: { color: "red" } },
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
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("3V3"))).toBe(false);
    expect(issues.some((i) => i.severity === "error")).toBe(false);
  });

  it("batareya haqiqatan 3V3 ga ulansa xato beradi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        {
          id: "bat",
          type: "battery",
          x: 0,
          y: 300,
          rotation: 0,
          settings: { voltage: 9, enabled: true, polarity: "normal" },
        },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "bat", pinId: "plus" },
          to: { nodeId: "uno", pinId: "3V3" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "bat", pinId: "minus" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.severity === "error" && i.message.includes("3V3"))).toBe(true);
  });

  it("rezistor katod tomonida bo'lsa ham 'rezistor yo'q' ogohlantirishi bermaydi", () => {
    // D13 → anod; katod → rezistor → GND (rezistor katod tomonida).
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "led", type: "led", x: 300, y: 0, rotation: 0, settings: { color: "red" } },
        { id: "r1", type: "resistor", x: 450, y: 0, rotation: 0, settings: { ohms: 220 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "uno", pinId: "D13" },
          to: { nodeId: "led", pinId: "anode" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "led", pinId: "cathode" },
          to: { nodeId: "r1", pinId: "a" },
          color: "blue",
        },
        {
          id: "w3",
          from: { nodeId: "r1", pinId: "b" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const issues = validateCircuit(circuit);
    expect(issues.some((i) => i.message.includes("rezistor ulanmagan"))).toBe(false);
  });

  it("massivlarni e'lon qiladi, o'qiydi va yozadi", () => {
    const parsed = parseSketch(`
      int leds[] = {13, 12, 11};
      int buf[3];
      void setup(){
        Serial.begin(9600);
        for (int i = 0; i < 3; i++) { pinMode(leds[i], OUTPUT); }
        Serial.println(leds[0]);
        Serial.println(leds[2]);
        buf[0] = 5;
        buf[1] = buf[0] * 2;
        Serial.println(buf[1]);
      }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error(parsed.ok ? "" : parsed.errors[0]?.message);
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const texts = sim.getLogs().map((l) => l.text);
    expect(sim.fatal).toBeNull();
    expect(texts).toContain("13");
    expect(texts).toContain("11");
    expect(texts).toContain("10");
  });

  it("massiv chegarasidan tashqari indeks uchun aniq xato beradi", () => {
    const parsed = parseSketch(`
      int a[2];
      void setup(){ a[5] = 1; }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    expect(sim.fatal).toContain("chegaradan tashqarida");
  });

  it("Serial.print sanoq tizimi (HEX/BIN) va Serial.write bilan ishlaydi", () => {
    const parsed = parseSketch(`
      void setup(){
        Serial.begin(9600);
        Serial.println(255, HEX);
        Serial.println(5, BIN);
        Serial.println(3.14159, 2);
        Serial.write(65);
        Serial.println("");
      }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const texts = sim.getLogs().map((l) => l.text);
    expect(texts).toContain("FF");
    expect(texts).toContain("101");
    expect(texts).toContain("3.14");
    expect(texts.some((t) => t.includes("A"))).toBe(true);
  });

  it("switch/case ni fallthrough bilan qo'llab-quvvatlaydi", () => {
    const parsed = parseSketch(`
      void setup(){
        Serial.begin(9600);
        int mode = 2;
        switch (mode) {
          case 1: Serial.println("bir"); break;
          case 2: Serial.println("ikki"); break;
          case 3: Serial.println("uch"); break;
          default: Serial.println("boshqa");
        }
        int x = 1;
        switch (x) {
          case 1:
          case 2:
            Serial.println("bir-yoki-ikki");
            break;
          default:
            Serial.println("yoq");
        }
      }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error(parsed.ok ? "" : parsed.errors[0]?.message);
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const texts = sim.getLogs().map((l) => l.text);
    expect(sim.fatal).toBeNull();
    expect(texts).toContain("ikki");
    expect(texts).toContain("bir-yoki-ikki");
    expect(texts).not.toContain("bir");
    expect(texts).not.toContain("uch");
    expect(texts).not.toContain("boshqa");
    expect(texts).not.toContain("yoq");
  });

  it("String metodlarini qo'llab-quvvatlaydi", () => {
    const parsed = parseSketch(`
      void setup(){
        Serial.begin(9600);
        String s = "  Salom  ";
        s.trim();
        Serial.println(s.length());
        Serial.println(s.equals("Salom"));
        String n = "42";
        Serial.println(n.toInt() + 8);
      }
      void loop(){ delay(100); }
    `);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit: blinkCircuit(), sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const texts = sim.getLogs().map((l) => l.text);
    expect(texts).toContain("5");
    expect(texts).toContain("1");
    expect(texts).toContain("50");
  });
});

/* ─────────────────── Yangi komponentlar ─────────────────── */

describe("yangi komponentlar", () => {
  function analogSensorCircuit(type: string): Circuit {
    return {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "s", type, x: 300, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w0",
          from: { nodeId: "s", pinId: "vcc" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "wg",
          from: { nodeId: "s", pinId: "gnd" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
        {
          id: "w1",
          from: { nodeId: "s", pinId: "signal" },
          to: { nodeId: "uno", pinId: "A0" },
          color: "blue",
        },
      ],
    };
  }

  const readA0 = `
    void setup(){ Serial.begin(9600); Serial.println(analogRead(A0)); }
    void loop(){ delay(100); }
  `;

  it("TMP36 haroratni analog qiymatga aylantiradi", () => {
    const parsed = parseSketch(readA0);
    if (!parsed.ok) throw new Error("parse xato");
    // 25°C → (10·25+500)/5000·1023 ≈ 153
    const sim = new Simulator({
      circuit: analogSensorCircuit("tmp36"),
      sketch: parsed.sketch,
      sensors: { s: 25 },
    });
    sim.start();
    sim.advance(20);
    expect(sim.getLogs().some((l) => l.text === "153")).toBe(true);
  });

  it("Tuproq namligi sensori foizni analog qiymatga aylantiradi", () => {
    const parsed = parseSketch(readA0);
    if (!parsed.ok) throw new Error("parse xato");
    // 60% → 60/100·1023 ≈ 614
    const sim = new Simulator({
      circuit: analogSensorCircuit("soil-moisture"),
      sketch: parsed.sketch,
      sensors: { s: 60 },
    });
    sim.start();
    sim.advance(20);
    expect(sim.getLogs().some((l) => l.text === "614")).toBe(true);
  });

  it("quvvatlanmagan analog sensor 0 qaytaradi", () => {
    const circuit = analogSensorCircuit("tmp36");
    circuit.wires = circuit.wires.filter((w) => w.id === "w1"); // faqat signal, vcc/gnd yo'q
    const parsed = parseSketch(readA0);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: { s: 25 } });
    sim.start();
    sim.advance(20);
    expect(sim.getLogs().some((l) => l.text === "0")).toBe(true);
  });

  it("PIR harakat sensori digitalRead orqali holatini beradi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "p", type: "pir", x: 300, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w0",
          from: { nodeId: "p", pinId: "vcc" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "wg",
          from: { nodeId: "p", pinId: "gnd" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
        {
          id: "w1",
          from: { nodeId: "p", pinId: "out" },
          to: { nodeId: "uno", pinId: "D2" },
          color: "blue",
        },
      ],
    };
    const code = `
      void setup(){ Serial.begin(9600); pinMode(2, INPUT); Serial.println(digitalRead(2)); }
      void loop(){ delay(100); }
    `;
    const on = parseSketch(code);
    if (!on.ok) throw new Error("parse xato");
    const simOn = new Simulator({ circuit, sketch: on.sketch, sensors: { p: 1 } });
    simOn.start();
    simOn.advance(20);
    expect(simOn.getLogs().some((l) => l.text === "1")).toBe(true);

    const simOff = new Simulator({ circuit, sketch: on.sketch, sensors: { p: 0 } });
    simOff.start();
    simOff.advance(20);
    expect(simOff.getLogs().some((l) => l.text === "0")).toBe(true);
  });

  it("DC motor haydalganda aylanadi va driver ogohlantirishi chiqadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "mot", type: "dc-motor", x: 300, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "uno", pinId: "D9" },
          to: { nodeId: "mot", pinId: "t1" },
          color: "red",
        },
        {
          id: "w2",
          from: { nodeId: "mot", pinId: "t2" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const code = `
      void setup(){ pinMode(9, OUTPUT); digitalWrite(9, HIGH); }
      void loop(){ delay(100); }
    `;
    const parsed = parseSketch(code);
    if (!parsed.ok) throw new Error("parse xato");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const motor = sim.getRuntimeState().mot;
    expect(motor?.active).toBe(true);
    /*
     * Aylanadi, lekin to'liq tezlikda EMAS. Arduino pinining ichki
     * qarshiligi (~25 Ω) motorning qarshiligi bilan bir tartibda, shuning
     * uchun kuchlanishning bir qismi pinning o'zida yo'qoladi. Aynan shu
     * sabab quyidagi "motor drayveri ishlating" ogohlantirishini keltirib
     * chiqaradi — endi ogohlantirish ham, raqam ham bir xil narsani aytadi.
     */
    expect(motor?.speed).toBeGreaterThan(0.3);
    expect(motor?.speed).toBeLessThan(0.9);

    const issues = validateCircuit(circuit);
    expect(
      issues.some(
        (i) => i.message.includes("motor drayveri") || i.message.includes("Arduino piniga ulangan"),
      ),
    ).toBe(true);
  });

  it("barcha yangi komponentlar katalogda va simvol tizimida bor", () => {
    for (const type of ["tmp36", "soil-moisture", "pir", "dc-motor"]) {
      expect(CATALOG.some((c) => c.type === type)).toBe(true);
    }
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

/* ═══════════════════ Faza A — komponent kutubxonasi ═══════════════════ */

/** Kod bilan ishlaydigan sxemani bir necha kadr davomida yuritadi. */
function runSketch(circuit: Circuit, code: string, ms = 60): Simulator {
  const parsed = parseSketch(code);
  if (!parsed.ok) {
    throw new Error(`kod tahlil qilinmadi: ${parsed.errors.map((e) => e.message).join("; ")}`);
  }
  const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
  sim.start();
  sim.advance(ms);
  return sim;
}

/** Komponentni Arduino'ning 5V va GND piniga ulaydigan ikkita sim. */
function powerWires(nodeId: string): Circuit["wires"] {
  return [
    {
      id: `${nodeId}-v`,
      from: { nodeId, pinId: "vcc" },
      to: { nodeId: "uno", pinId: "5V" },
      color: "red",
    },
    {
      id: `${nodeId}-g`,
      from: { nodeId, pinId: "gnd" },
      to: { nodeId: "uno", pinId: "GND1" },
      color: "black",
    },
  ];
}

describe("breadboard", () => {
  const def = getDefinition("breadboard")!;

  it("ustundagi besh teshik bir tugunda, kanalning ikki tomoni ajratilgan", () => {
    const circuit: Circuit = {
      nodes: [{ id: "bb", type: "breadboard", x: 0, y: 0, rotation: 0, settings: {} }],
      wires: [],
    };
    const net = buildNetlist(circuit);

    expect(netFor(net, "bb", "t7-1")).toBe(netFor(net, "bb", "t7-5"));
    // Kanal ajratadi: yuqori yarim va pastki yarim bir ustunda ham alohida.
    expect(netFor(net, "bb", "t7-1")).not.toBe(netFor(net, "bb", "b7-1"));
    // Qo'shni ustunlar ham alohida.
    expect(netFor(net, "bb", "t7-1")).not.toBe(netFor(net, "bb", "t8-1"));
  });

  it("quvvat relsi butun uzunligi bo'ylab ulangan", () => {
    const circuit: Circuit = {
      nodes: [{ id: "bb", type: "breadboard", x: 0, y: 0, rotation: 0, settings: {} }],
      wires: [],
    };
    const net = buildNetlist(circuit);

    expect(netFor(net, "bb", "pt1")).toBe(netFor(net, "bb", "pt24"));
    // Musbat va manfiy relslar bir-biriga ulanmagan — aks holda har bir
    // sxema qisqa tutashuv bo'lardi.
    expect(netFor(net, "bb", "pt1")).not.toBe(netFor(net, "bb", "nt1"));
    // Yuqori va pastki relslar ham alohida (haqiqiy taxtadagidek).
    expect(netFor(net, "bb", "pt1")).not.toBe(netFor(net, "bb", "pb1"));
  });

  it("relsga ulangan 5V butun rels bo'ylab tarqaladi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "bb", type: "breadboard", x: 0, y: 400, rotation: 0, settings: {} },
        { id: "led", type: "led", x: 600, y: 400, rotation: 0, settings: { color: "red" } },
        { id: "r", type: "resistor", x: 500, y: 400, rotation: 0, settings: { ohms: 220 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "uno", pinId: "5V" },
          to: { nodeId: "bb", pinId: "pt1" },
          color: "red",
        },
        // Rezistor relsning boshqa uchidan oziqlanadi.
        {
          id: "w2",
          from: { nodeId: "bb", pinId: "pt20" },
          to: { nodeId: "r", pinId: "a" },
          color: "red",
        },
        {
          id: "w3",
          from: { nodeId: "r", pinId: "b" },
          to: { nodeId: "led", pinId: "anode" },
          color: "red",
        },
        {
          id: "w4",
          from: { nodeId: "led", pinId: "cathode" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const sim = runSketch(circuit, "void setup() {} void loop() {}");
    expect(sim.getRuntimeState().led?.brightness).toBeGreaterThan(0.9);
  });

  it("chizma va pinlar bitta geometriyadan olinadi", () => {
    // Teshik markazi 0–1 nisbatga o'girilganda chizmadagi joyiga tushishi
    // kerak: aks holda sim ko'rinib turgan teshikdan chetga tushardi.
    const holes = breadboardHoles();
    expect(holes).toHaveLength(def.pins.length);
    const first = holes[0]!;
    const pin = def.pins.find((p) => p.id === first.id)!;
    expect(pin.x).toBeCloseTo(first.x / BB_VIEWBOX.width, 6);
    expect(pin.y).toBeCloseTo(first.y / BB_VIEWBOX.height, 6);
  });
});

describe("DHT11 sensori", () => {
  const circuit = (): Circuit => ({
    nodes: [
      { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
      {
        id: "dht",
        type: "dht11",
        x: 400,
        y: 0,
        rotation: 0,
        settings: { temperature: 31, humidity: 72 },
      },
    ],
    wires: [
      ...powerWires("dht"),
      {
        id: "w-data",
        from: { nodeId: "dht", pinId: "data" },
        to: { nodeId: "uno", pinId: "D2" },
        color: "green",
      },
    ],
  });

  const CODE = `
#include <DHT.h>
DHT dht(2, DHT11);
void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println(dht.readTemperature());
  Serial.println(dht.readHumidity());
}
void loop() {}
`;

  it("katalogda haqiqiy o'lchov chegaralari bilan e'lon qilingan", () => {
    const def = getDefinition("dht11")!;
    expect(def.category).toBe("sensor");
    expect(def.pins.map((p) => p.id)).toEqual(["vcc", "data", "gnd"]);
    const temp = def.settings.find((s) => s.key === "temperature")!;
    if (temp.kind !== "number") throw new Error("harorat raqamli sozlama bo'lishi kerak");
    expect(temp.min).toBe(DHT11_RANGE.temperature.min);
    expect(temp.max).toBe(DHT11_RANGE.temperature.max);
  });

  it("kod sensordan harorat va namlikni o'qiydi", () => {
    const sim = runSketch(circuit(), CODE);
    const text = sim.getLogs().map((l) => l.text);
    // Simulyator sonlarni butun ko'rinishda chiqaradi (Arduino float emas).
    expect(text).toContain("31");
    expect(text).toContain("72");
  });

  it("quvvatsiz sensordan o'qilganda ogohlantiradi", () => {
    const unpowered = circuit();
    // 5V simini olib tashlaymiz — haqiqiy sensor ham javob bermaydi.
    unpowered.wires = unpowered.wires.filter((w) => w.id !== "dht-v");
    const sim = runSketch(unpowered, CODE);
    expect(sim.getLogs().some((l) => l.level === "warning" && l.text.includes("DHT11"))).toBe(true);
  });
});

describe("LCD 16×2 displey", () => {
  const circuit = (): Circuit => ({
    nodes: [
      { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
      { id: "lcd", type: "lcd1602", x: 400, y: 0, rotation: 0, settings: { backlight: true } },
    ],
    wires: [
      ...powerWires("lcd"),
      ...(
        [
          ["rs", "D12"],
          ["e", "D11"],
          ["d4", "D5"],
          ["d5", "D4"],
          ["d6", "D3"],
          ["d7", "D2"],
        ] as const
      ).map(([pinId, boardPin]) => ({
        id: `w-${pinId}`,
        from: { nodeId: "lcd", pinId },
        to: { nodeId: "uno", pinId: boardPin },
        color: "green" as const,
      })),
    ],
  });

  const CODE = `
#include <LiquidCrystal.h>
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
void setup() {
  lcd.begin(16, 2);
  lcd.print("Salom");
  lcd.setCursor(0, 1);
  lcd.print("PilotKids");
}
void loop() {}
`;

  it("konstruktorli e'lonni tahlil qiladi", () => {
    const parsed = parseSketch(CODE);
    expect(parsed.ok).toBe(true);
  });

  it("yozilgan matn ekranda ko'rinadi", () => {
    const lines = runSketch(circuit(), CODE).getRuntimeState().lcd?.lines ?? [];
    expect(lines[0]?.trimEnd()).toBe("Salom");
    expect(lines[1]?.trimEnd()).toBe("PilotKids");
  });

  it("setCursor matnni to'g'ri ustundan boshlaydi", () => {
    const code = CODE.replace("lcd.setCursor(0, 1);", "lcd.setCursor(3, 1);");
    const lines = runSketch(circuit(), code).getRuntimeState().lcd?.lines ?? [];
    expect(lines[1]).toBe("   PilotKids    ");
  });

  it("clear() ekranni bo'shatadi", () => {
    const code = CODE.replace('lcd.print("PilotKids");', "lcd.clear();");
    const lines = runSketch(circuit(), code).getRuntimeState().lcd?.lines ?? [];
    expect(lines.every((l) => l.trim() === "")).toBe(true);
  });

  it("qatordan oshib ketgan matn kesiladi", () => {
    const code = CODE.replace('lcd.print("Salom");', 'lcd.print("0123456789ABCDEFGHIJ");');
    const lines = runSketch(circuit(), code).getRuntimeState().lcd?.lines ?? [];
    expect(lines[0]).toHaveLength(LCD_COLUMNS);
    expect(lines[0]).toBe("0123456789ABCDEF");
  });

  it("simi yetishmagan displey uchun ogohlantiradi", () => {
    const partial = circuit();
    partial.wires = partial.wires.filter((w) => w.id !== "w-d7");
    const issues = validateCircuit(partial);
    expect(issues.some((i) => i.message.includes("D7"))).toBe(true);
  });

  /* ───────── Haqiqiy moduldagi o'n olti oyoq ───────── */

  it("katalogda haqiqiy moduldagi 16 oyoq bor", () => {
    const ids = getDefinition("lcd1602")!.pins.map((p) => p.id);
    // VSS va VDD ning ID'lari eski sxemalar uchun `gnd`/`vcc` bo'lib qoladi.
    expect(ids).toEqual([
      "gnd",
      "vcc",
      "vo",
      "rs",
      "rw",
      "e",
      "d0",
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
      "d6",
      "d7",
      "a",
      "k",
    ]);
    expect(getDefinition("lcd1602")!.pins.every((p) => p.connectable)).toBe(true);
  });

  it("yangi oyoqlarga tortilgan sim saqlashdan keyin ham qoladi", () => {
    const withExtras = circuit();
    withExtras.wires.push(
      {
        id: "w-rw",
        from: { nodeId: "lcd", pinId: "rw" },
        to: { nodeId: "uno", pinId: "GND2" },
        color: "black",
      },
      {
        id: "w-a",
        from: { nodeId: "lcd", pinId: "a" },
        to: { nodeId: "uno", pinId: "5V" },
        color: "red",
      },
      {
        id: "w-k",
        from: { nodeId: "lcd", pinId: "k" },
        to: { nodeId: "uno", pinId: "GND1" },
        color: "black",
      },
    );
    const restored = sanitizeCircuit(JSON.parse(JSON.stringify(withExtras)));
    for (const id of ["w-rw", "w-a", "w-k"]) {
      expect(restored.wires.some((w) => w.id === id)).toBe(true);
    }
  });

  /* ───────── Kod va sxema mosligi ───────── */

  it("koddagi pinlar sxemaga mos kelmasa ekran jim qoladi", () => {
    // E simi D11 o'rniga D10 ga ketgan — haqiqiy modul ham ishlamaydi.
    const wrong = circuit();
    wrong.wires = wrong.wires.map((w) =>
      w.id === "w-e" ? { ...w, to: { nodeId: "uno", pinId: "D10" } } : w,
    );
    const sim = runSketch(wrong, CODE);
    expect(sim.getRuntimeState().lcd?.lines ?? []).toEqual([]);
    expect(sim.getLogs().some((l) => l.level === "warning" && l.text.includes("mos emas"))).toBe(
      true,
    );
  });

  it("quvvat simi uzilsa ekran o'chadi", () => {
    const unpowered = circuit();
    unpowered.wires = unpowered.wires.filter((w) => w.id !== "lcd-v");
    const state = runSketch(unpowered, CODE).getRuntimeState().lcd;
    expect(state?.powered).toBe(false);
    expect(state?.lines).toEqual([]);
  });

  /* ───────── Orqa yoritish A/K orqali ───────── */

  it("A/K ulanmaganda yoritish sozlamadan olinadi", () => {
    const dark = circuit();
    dark.nodes = dark.nodes.map((n) =>
      n.id === "lcd" ? { ...n, settings: { backlight: false } } : n,
    );
    expect(runSketch(dark, CODE).getRuntimeState().lcd?.backlight).toBe(false);
  });

  it("A 5V ga, K GND ga ulansa yoritish sozlamadan qat'i nazar yonadi", () => {
    const lit = circuit();
    lit.nodes = lit.nodes.map((n) =>
      n.id === "lcd" ? { ...n, settings: { backlight: false } } : n,
    );
    lit.wires.push(
      {
        id: "w-a",
        from: { nodeId: "lcd", pinId: "a" },
        to: { nodeId: "uno", pinId: "5V" },
        color: "red",
      },
      {
        id: "w-k",
        from: { nodeId: "lcd", pinId: "k" },
        to: { nodeId: "uno", pinId: "GND1" },
        color: "black",
      },
    );
    expect(runSketch(lit, CODE).getRuntimeState().lcd?.backlight).toBe(true);
  });

  it("K ulanmagan bo'lsa yoritish yonmaydi", () => {
    const half = circuit();
    half.wires.push({
      id: "w-a",
      from: { nodeId: "lcd", pinId: "a" },
      to: { nodeId: "uno", pinId: "5V" },
      color: "red",
    });
    expect(runSketch(half, CODE).getRuntimeState().lcd?.backlight).toBe(false);
  });

  /* ───────── Kontrast (VO) ───────── */

  it("VO to'g'ridan-to'g'ri GND da bo'lsa kontrast eng yuqori", () => {
    const grounded = circuit();
    grounded.wires.push({
      id: "w-vo",
      from: { nodeId: "lcd", pinId: "vo" },
      to: { nodeId: "uno", pinId: "GND2" },
      color: "black",
    });
    expect(runSketch(grounded, CODE).getRuntimeState().lcd?.contrast).toBeCloseTo(1, 2);
  });

  it("VO 5V ga ulansa kontrast nolga tushadi — matn ko'rinmaydi", () => {
    const washed = circuit();
    washed.wires.push({
      id: "w-vo",
      from: { nodeId: "lcd", pinId: "vo" },
      to: { nodeId: "uno", pinId: "5V" },
      color: "red",
    });
    expect(runSketch(washed, CODE).getRuntimeState().lcd?.contrast).toBeCloseTo(0, 2);
  });

  it("VO ga ulangan potensiometr kontrastni boshqaradi", () => {
    /** VO → potensiometr o'rta oyog'i; potensiometr 5V va GND orasida. */
    const withPot = (value: number): Circuit => {
      const base = circuit();
      base.nodes.push({
        id: "pot",
        type: "potentiometer",
        x: 200,
        y: 200,
        rotation: 0,
        settings: { value },
      });
      base.wires.push(
        {
          id: "p-v",
          from: { nodeId: "pot", pinId: "vcc" },
          to: { nodeId: "uno", pinId: "5V" },
          color: "red",
        },
        {
          id: "p-g",
          from: { nodeId: "pot", pinId: "gnd" },
          to: { nodeId: "uno", pinId: "GND2" },
          color: "black",
        },
        {
          id: "p-w",
          from: { nodeId: "pot", pinId: "wiper" },
          to: { nodeId: "lcd", pinId: "vo" },
          color: "blue",
        },
      );
      return base;
    };

    const low = runSketch(withPot(20), CODE).getRuntimeState().lcd?.contrast ?? 0;
    const high = runSketch(withPot(1000), CODE).getRuntimeState().lcd?.contrast ?? 0;
    // Murvat yerga yaqin uchda — belgilar to'q; 5V uchida — ekran bo'shdek.
    expect(low).toBeGreaterThan(0.8);
    expect(high).toBeLessThan(0.2);
  });

  it("VO ulanmagan bo'lsa matn baribir o'qiladi", () => {
    const contrast = runSketch(circuit(), CODE).getRuntimeState().lcd?.contrast ?? 0;
    expect(contrast).toBeGreaterThan(0.5);
  });

  /* ───────── Ko'rinish buyruqlari ───────── */

  it("noDisplay() matnni berkitadi, display() qaytaradi", () => {
    const hidden = CODE.replace("void loop() {}", "void loop() { lcd.noDisplay(); }");
    expect(runSketch(circuit(), hidden).getRuntimeState().lcd?.lines).toEqual([]);

    const shown = CODE.replace("void loop() {}", "void loop() { lcd.noDisplay(); lcd.display(); }");
    expect(runSketch(circuit(), shown).getRuntimeState().lcd?.lines?.[0]?.trimEnd()).toBe("Salom");
  });

  it("cursor() va blink() holati ko'rinadi", () => {
    const code = CODE.replace("void loop() {}", "void loop() { lcd.cursor(); lcd.blink(); }");
    const state = runSketch(circuit(), code).getRuntimeState().lcd;
    expect(state?.cursorVisible).toBe(true);
    expect(state?.cursorBlink).toBe(true);
  });

  it("home() kursorni boshiga qaytaradi", () => {
    const code = CODE.replace("void loop() {}", 'void loop() { lcd.home(); lcd.print("X"); }');
    const lines = runSketch(circuit(), code).getRuntimeState().lcd?.lines ?? [];
    expect(lines[0]?.startsWith("X")).toBe(true);
  });

  /* ───────── Ulanish tekshiruvi ───────── */

  it("RW va VO ulanmagani uchun ogohlantiradi", () => {
    const issues = validateCircuit(circuit());
    expect(issues.some((i) => i.message.includes("RW"))).toBe(true);
    expect(issues.some((i) => i.message.includes("VO"))).toBe(true);
  });

  it("RW GND ga ulansa ogohlantirish yo'qoladi", () => {
    const fixed = circuit();
    fixed.wires.push({
      id: "w-rw",
      from: { nodeId: "lcd", pinId: "rw" },
      to: { nodeId: "uno", pinId: "GND2" },
      color: "black",
    });
    expect(validateCircuit(fixed).some((i) => i.message.includes("RW"))).toBe(false);
  });
});

describe("rele", () => {
  /** IN → D8; COM → 5V; NO → LED anodi; LED katodi → GND. */
  const circuit = (): Circuit => ({
    nodes: [
      { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
      { id: "rl", type: "relay", x: 400, y: 0, rotation: 0, settings: {} },
      { id: "r", type: "resistor", x: 600, y: 0, rotation: 0, settings: { ohms: 220 } },
      { id: "led", type: "led", x: 700, y: 0, rotation: 0, settings: { color: "red" } },
    ],
    wires: [
      ...powerWires("rl"),
      {
        id: "w-in",
        from: { nodeId: "rl", pinId: "in" },
        to: { nodeId: "uno", pinId: "D8" },
        color: "green",
      },
      {
        id: "w-com",
        from: { nodeId: "rl", pinId: "com" },
        to: { nodeId: "uno", pinId: "5V" },
        color: "red",
      },
      {
        id: "w-no",
        from: { nodeId: "rl", pinId: "no" },
        to: { nodeId: "r", pinId: "a" },
        color: "red",
      },
      {
        id: "w-r",
        from: { nodeId: "r", pinId: "b" },
        to: { nodeId: "led", pinId: "anode" },
        color: "red",
      },
      {
        id: "w-gnd",
        from: { nodeId: "led", pinId: "cathode" },
        to: { nodeId: "uno", pinId: "GND2" },
        color: "black",
      },
    ],
  });

  const withPin = (level: "HIGH" | "LOW") => `
void setup() {
  pinMode(8, OUTPUT);
  digitalWrite(8, ${level});
}
void loop() {}
`;

  it("IN LOW bo'lganda COM–NO uzilgan, LED yonmaydi", () => {
    const sim = runSketch(circuit(), withPin("LOW"));
    expect(sim.getRuntimeState().rl?.active).toBe(false);
    expect(sim.getRuntimeState().led?.brightness ?? 0).toBe(0);
  });

  it("IN HIGH bo'lganda kontakt NO ga o'tadi va LED yonadi", () => {
    const sim = runSketch(circuit(), withPin("HIGH"));
    expect(sim.getRuntimeState().rl?.active).toBe(true);
    expect(sim.getRuntimeState().led?.brightness ?? 0).toBeGreaterThan(0.9);
  });

  it("quvvatlanmagan rele kontaktni almashtirmaydi", () => {
    const noPower = circuit();
    noPower.wires = noPower.wires.filter((w) => w.id !== "rl-v");
    const sim = runSketch(noPower, withPin("HIGH"));
    expect(sim.getRuntimeState().rl?.active).toBe(false);
  });

  it("chulg'am tortmaganda COM NC kontaktida turadi", () => {
    const net = buildNetlist({
      nodes: [{ id: "rl", type: "relay", x: 0, y: 0, rotation: 0, settings: {} }],
      wires: [],
    });
    expect(netFor(net, "rl", "com")).toBe(netFor(net, "rl", "nc"));
    expect(netFor(net, "rl", "com")).not.toBe(netFor(net, "rl", "no"));
  });

  it("COM ulanmagan bo'lsa ogohlantiradi", () => {
    const open = circuit();
    open.wires = open.wires.filter((w) => w.id !== "w-com");
    const issues = validateCircuit(open);
    expect(issues.some((i) => i.hint.includes("COM"))).toBe(true);
  });
});

/* ═══════════════════ Faza B — sim tortish tajribasi ═══════════════════ */

describe("tok o'tayotgan simlar", () => {
  const wire = (
    id: string,
    a: [string, string],
    b: [string, string],
  ): Circuit["wires"][number] => ({
    id,
    from: { nodeId: a[0], pinId: a[1] },
    to: { nodeId: b[0], pinId: b[1] },
    color: "blue",
  });

  /** Batareya → rezistor → LED → batareya. Arduino ishtirok etmaydi. */
  const loop = (ohms = 220): Circuit => ({
    nodes: [
      { id: "bat", type: "battery", x: 0, y: 0, rotation: 0, settings: { voltage: 5 } },
      { id: "r", type: "resistor", x: 200, y: 0, rotation: 0, settings: { ohms } },
      { id: "led", type: "led", x: 400, y: 0, rotation: 0, settings: { color: "red" } },
    ],
    wires: [
      wire("w1", ["bat", "plus"], ["r", "a"]),
      wire("w2", ["r", "b"], ["led", "anode"]),
      wire("w3", ["led", "cathode"], ["bat", "minus"]),
    ],
  });

  const liveOf = (circuit: Circuit): string[] => {
    const parsed = parseSketch("void setup() {} void loop() {}");
    if (!parsed.ok) throw new Error("bo'sh eskiz tahlil qilinmadi");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(30);
    return Object.keys(sim.getWireFlow()).sort();
  };

  it("yopiq zanjirdagi HAMMA sim jonli bo'ladi", () => {
    // Yer tomonidagi sim ham tok o'tkazadi — bola zanjirni butun halqa
    // sifatida ko'rishi kerak, faqat "musbat tomon" emas.
    expect(liveOf(loop())).toEqual(["w1", "w2", "w3"]);
  });

  it("zanjir uzilgan bo'lsa hech bir sim jonli emas", () => {
    const open = loop();
    open.wires = open.wires.filter((w) => w.id !== "w3");
    expect(liveOf(open)).toEqual([]);
  });

  it("LED teskari ulanganda tok yurmaydi", () => {
    const reversed = loop();
    reversed.wires = [
      wire("w1", ["bat", "plus"], ["r", "a"]),
      wire("w2", ["r", "b"], ["led", "cathode"]),
      wire("w3", ["led", "anode"], ["bat", "minus"]),
    ];
    expect(liveOf(reversed)).toEqual([]);
  });

  it("o'chirilgan batareya zanjirni jonlantirmaydi", () => {
    const off = loop();
    off.nodes = off.nodes.map((n) =>
      n.id === "bat" ? { ...n, settings: { ...n.settings, enabled: false } } : n,
    );
    expect(liveOf(off)).toEqual([]);
  });

  it("Arduino pini LOW bo'lsa sim jonli emas, HIGH bo'lsa jonli", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "r", type: "resistor", x: 300, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "led", type: "led", x: 500, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        wire("w1", ["uno", "D13"], ["r", "a"]),
        wire("w2", ["r", "b"], ["led", "anode"]),
        wire("w3", ["led", "cathode"], ["uno", "GND1"]),
      ],
    };

    const run = (level: "HIGH" | "LOW") => {
      const sim = runSketch(
        circuit,
        `void setup() { pinMode(13, OUTPUT); digitalWrite(13, ${level}); } void loop() {}`,
      );
      return Object.keys(sim.getWireFlow()).sort();
    };

    expect(run("LOW")).toEqual([]);
    expect(run("HIGH")).toEqual(["w1", "w2", "w3"]);
  });

  it("breadboard relsi orqali yig'ilgan zanjir ham jonli bo'ladi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "bat", type: "battery", x: 0, y: 0, rotation: 0, settings: { voltage: 5 } },
        { id: "bb", type: "breadboard", x: 0, y: 300, rotation: 0, settings: {} },
        { id: "r", type: "resistor", x: 600, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "led", type: "led", x: 800, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        // Batareya relsning bir uchiga, yuk esa boshqa uchiga ulangan.
        wire("w1", ["bat", "plus"], ["bb", "pt1"]),
        wire("w2", ["bb", "pt20"], ["r", "a"]),
        wire("w3", ["r", "b"], ["led", "anode"]),
        wire("w4", ["led", "cathode"], ["bat", "minus"]),
      ],
    };
    expect(liveOf(circuit)).toEqual(["w1", "w2", "w3", "w4"]);
  });

  it("rele ochiq bo'lsa yuk zanjiri jonli emas", () => {
    const build = (): Circuit => ({
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "rl", type: "relay", x: 400, y: 0, rotation: 0, settings: {} },
        { id: "r", type: "resistor", x: 700, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "led", type: "led", x: 900, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        ...powerWires("rl"),
        wire("w-in", ["rl", "in"], ["uno", "D8"]),
        wire("w-com", ["rl", "com"], ["uno", "5V"]),
        wire("w-no", ["rl", "no"], ["r", "a"]),
        wire("w-r", ["r", "b"], ["led", "anode"]),
        wire("w-gnd", ["led", "cathode"], ["uno", "GND2"]),
      ],
    });

    const run = (level: "HIGH" | "LOW") => {
      const sim = runSketch(
        build(),
        `void setup() { pinMode(8, OUTPUT); digitalWrite(8, ${level}); } void loop() {}`,
      );
      return Object.keys(sim.getWireFlow());
    };

    expect(run("LOW")).not.toContain("w-no");
    expect(run("HIGH")).toContain("w-no");
  });
});

describe("elektr tuguni (net) ajratish", () => {
  /*
   * Sxemadagi ajratib ko'rsatish canvas'da tugun identifikatoriga tayanadi:
   * bitta tugundagi hamma pin va sim birga yonadi. Shu bog'lanishning
   * asosi — netlist, quyida aynan shu tekshiriladi.
   */
  it("breadboard ustuniga ulangan ikkita komponent bitta tugunda bo'ladi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "bb", type: "breadboard", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "r1", type: "resistor", x: 0, y: 400, rotation: 0, settings: { ohms: 220 } },
        { id: "r2", type: "resistor", x: 200, y: 400, rotation: 0, settings: { ohms: 220 } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "r1", pinId: "a" },
          to: { nodeId: "bb", pinId: "t3-1" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "r2", pinId: "a" },
          to: { nodeId: "bb", pinId: "t3-5" },
          color: "blue",
        },
      ],
    };
    const net = buildNetlist(circuit);

    // Ikkala rezistor bir-biriga to'g'ridan-to'g'ri ulanmagan, lekin
    // breadboard ustuni ularni bitta tugunga qo'shadi.
    const shared = netFor(net, "r1", "a");
    expect(shared).toBe(netFor(net, "r2", "a"));
    expect(shared).toBe(netFor(net, "bb", "t3-3"));
    // Tugundagi nuqtalar soni tooltipda ko'rsatiladi.
    expect((net.pinsOf.get(shared!) ?? []).length).toBe(7);
  });

  it("qo'shni ustun boshqa tugun bo'lib qoladi", () => {
    const circuit: Circuit = {
      nodes: [{ id: "bb", type: "breadboard", x: 0, y: 0, rotation: 0, settings: {} }],
      wires: [],
    };
    const net = buildNetlist(circuit);
    expect(netFor(net, "bb", "t3-1")).not.toBe(netFor(net, "bb", "t4-1"));
  });
});

/* ═══════════════════ Faza C — elektr yechuvchisi ═══════════════════ */

/** Qisqa sim yozuvi — quyidagi sxemalar uzun bo'lib ketmasin. */
function wireOf(id: string, a: [string, string], b: [string, string]): Circuit["wires"][number] {
  return {
    id,
    from: { nodeId: a[0], pinId: a[1] },
    to: { nodeId: b[0], pinId: b[1] },
    color: "blue",
  };
}

describe("DC yechuvchi", () => {
  const R = (id: string, a: string, b: string, ohms: number) =>
    ({ id, kind: "resistor", a, b, ohms }) as const;
  const V = (id: string, a: string, b: string, volts: number, ohms = 0.01) =>
    ({ id, kind: "source", a, b, volts, ohms }) as const;

  it("Om qonuni: 10 V va 100 Ω → 0.1 A", () => {
    const out = solveCircuit(
      [V("bat", "n1", "gnd", 10), R("r", "n1", "gnd", 100)],
      new Set(["gnd"]),
    );
    expect(out.voltage.get("n1")).toBeCloseTo(10, 2);
    // Tok `a` dan `b` ga musbat: rezistorda n1 → gnd.
    expect(out.current.get("r")).toBeCloseTo(0.1, 3);
  });

  it("kuchlanish bo'luvchi o'rtasida yarim kuchlanish beradi", () => {
    const out = solveCircuit(
      [V("bat", "top", "gnd", 9), R("r1", "top", "mid", 1000), R("r2", "mid", "gnd", 1000)],
      new Set(["gnd"]),
    );
    expect(out.voltage.get("mid")).toBeCloseTo(4.5, 2);
  });

  it("nomutanosib bo'luvchi to'g'ri nisbatda bo'ladi", () => {
    const out = solveCircuit(
      [V("bat", "top", "gnd", 10), R("r1", "top", "mid", 1000), R("r2", "mid", "gnd", 3000)],
      new Set(["gnd"]),
    );
    expect(out.voltage.get("mid")).toBeCloseTo(7.5, 2);
  });

  it("parallel qarshiliklar tokni bo'lib oladi", () => {
    const out = solveCircuit(
      [V("bat", "top", "gnd", 6), R("r1", "top", "gnd", 100), R("r2", "top", "gnd", 200)],
      new Set(["gnd"]),
    );
    expect(out.current.get("r1")).toBeCloseTo(0.06, 3);
    expect(out.current.get("r2")).toBeCloseTo(0.03, 3);
    // Manba ikkalasining yig'indisini beradi (belgisi manfiy — tashqariga).
    expect(out.current.get("bat")).toBeCloseTo(-0.09, 3);
  });

  it("ketma-ket ulangan ikkita manba qo'shiladi", () => {
    const out = solveCircuit(
      [V("b1", "mid", "gnd", 1.5), V("b2", "top", "mid", 1.5), R("r", "top", "gnd", 100)],
      new Set(["gnd"]),
    );
    expect(out.voltage.get("top")).toBeCloseTo(3, 2);
  });

  it("diod teskari yo'nalishda o'tkazmaydi", () => {
    const out = solveCircuit(
      [
        V("bat", "gnd2", "top", 5),
        { id: "d", kind: "diode", a: "top", b: "gnd2", vf: 1.8, ohms: 12 },
      ],
      new Set(["gnd2"]),
    );
    expect(Math.abs(out.current.get("d") ?? 0)).toBeLessThan(1e-6);
  });

  it("ochilish kuchlanishidan past manbada diod yonmaydi", () => {
    const out = solveCircuit(
      [
        V("bat", "top", "gnd", 1.5),
        { id: "d", kind: "diode", a: "top", b: "gnd", vf: 1.8, ohms: 12 },
      ],
      new Set(["gnd"]),
    );
    expect(out.current.get("d")).toBeCloseTo(0, 6);
  });

  it("elementsiz sxema bo'sh natija qaytaradi", () => {
    const out = solveCircuit([], new Set());
    expect(out.voltage.size).toBe(0);
  });
});

describe("yechuvchi sxemada", () => {
  /** Ikkita LED bitta 5V manbadan parallel oziqlanadi. */
  const parallelLeds = (ohms1: number, ohms2: number): Circuit => ({
    nodes: [
      { id: "bat", type: "battery", x: 0, y: 0, rotation: 0, settings: { voltage: 5 } },
      { id: "r1", type: "resistor", x: 0, y: 0, rotation: 0, settings: { ohms: ohms1 } },
      { id: "r2", type: "resistor", x: 0, y: 0, rotation: 0, settings: { ohms: ohms2 } },
      { id: "led1", type: "led", x: 0, y: 0, rotation: 0, settings: { color: "red" } },
      { id: "led2", type: "led", x: 0, y: 0, rotation: 0, settings: { color: "red" } },
    ],
    wires: [
      wireOf("a1", ["bat", "plus"], ["r1", "a"]),
      wireOf("a2", ["r1", "b"], ["led1", "anode"]),
      wireOf("a3", ["led1", "cathode"], ["bat", "minus"]),
      wireOf("b1", ["bat", "plus"], ["r2", "a"]),
      wireOf("b2", ["r2", "b"], ["led2", "anode"]),
      wireOf("b3", ["led2", "cathode"], ["bat", "minus"]),
    ],
  });

  const runtimeOf = (circuit: Circuit) => {
    const parsed = parseSketch("void setup() {} void loop() {}");
    if (!parsed.ok) throw new Error("bo'sh eskiz tahlil qilinmadi");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    return sim.getRuntimeState();
  };

  it("parallel LEDlar bir-birining yorqinligini o'zgartirmaydi", () => {
    /*
     * Eski modelda ikkinchi shox "eng kichik qarshilik" sifatida tanlanib,
     * birinchi LEDning yorqinligini ham o'zgartirib yuborardi. Parallel
     * shoxlar bir-biridan mustaqil bo'lishi kerak.
     */
    const alone = runtimeOf(parallelLeds(220, 220)).led1?.brightness ?? 0;
    const withDim = runtimeOf(parallelLeds(220, 10000)).led1?.brightness ?? 0;
    expect(withDim).toBeCloseTo(alone, 3);
    // Ikkinchi shox esa xira bo'lib qoladi.
    expect(runtimeOf(parallelLeds(220, 10000)).led2?.brightness ?? 0).toBeLessThan(0.2);
  });

  it("potensiometr kuchlanish bo'luvchi sifatida ishlaydi", () => {
    const circuit = (value: number): Circuit => ({
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "pot", type: "potentiometer", x: 0, y: 0, rotation: 0, settings: { value } },
        { id: "meter", type: "multimeter", x: 0, y: 0, rotation: 0, settings: {} },
      ],
      wires: [
        wireOf("w1", ["pot", "vcc"], ["uno", "5V"]),
        wireOf("w2", ["pot", "gnd"], ["uno", "GND1"]),
        wireOf("w3", ["meter", "probe-plus"], ["pot", "wiper"]),
        wireOf("w4", ["meter", "probe-minus"], ["uno", "GND1"]),
      ],
    });

    // O'rtada — yarmi; oxirida — deyarli to'liq; boshida — deyarli nol.
    expect(runtimeOf(circuit(512)).meter?.voltage ?? 0).toBeCloseTo(2.5, 1);
    expect(runtimeOf(circuit(1023)).meter?.voltage ?? 0).toBeGreaterThan(4.9);
    expect(runtimeOf(circuit(0)).meter?.voltage ?? 0).toBeLessThan(0.1);
  });

  it("plataning uchala GND pini ichkaridan ulangan", () => {
    // Haqiqiy Uno'da ular bitta mis qatlamda. Ilgari GND2 ga ulangan
    // komponent GND1 dagi zanjirni "ko'rmasdi".
    const net = buildNetlist({
      nodes: [{ id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} }],
      wires: [],
    });
    expect(netFor(net, "uno", "GND1")).toBe(netFor(net, "uno", "GND2"));
    expect(netFor(net, "uno", "GND1")).toBe(netFor(net, "uno", "GND3"));
    expect(netFor(net, "uno", "GND1")).not.toBe(netFor(net, "uno", "5V"));
  });

  it("tok yo'nalishi ikki nuqtali tugunlarda aniqlanadi", () => {
    const circuit: Circuit = {
      nodes: [
        { id: "bat", type: "battery", x: 0, y: 0, rotation: 0, settings: { voltage: 5 } },
        { id: "r", type: "resistor", x: 0, y: 0, rotation: 0, settings: { ohms: 220 } },
        { id: "led", type: "led", x: 0, y: 0, rotation: 0, settings: { color: "red" } },
      ],
      wires: [
        wireOf("w1", ["bat", "plus"], ["r", "a"]),
        wireOf("w2", ["r", "b"], ["led", "anode"]),
        wireOf("w3", ["led", "cathode"], ["bat", "minus"]),
      ],
    };
    const parsed = parseSketch("void setup() {} void loop() {}");
    if (!parsed.ok) throw new Error("bo'sh eskiz tahlil qilinmadi");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(20);
    const flow = sim.getWireFlow();

    // Batareyadan rezistorga: tok `from` dan `to` ga oqadi.
    expect(flow.w1?.direction).toBe(1);
    // Halqadagi tok hamma joyda bir xil (ketma-ket ulanish).
    expect(flow.w1?.milliamps).toBeCloseTo(flow.w3?.milliamps ?? 0, 3);
    expect(flow.w1?.milliamps).toBeGreaterThan(10);
  });
});
