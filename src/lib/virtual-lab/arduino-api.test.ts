import { describe, expect, it } from "vitest";
import { parseSketch } from "./parser";
import { Simulator } from "./simulator";
import type { Circuit } from "./types";

const circuit: Circuit = {
  nodes: [{ id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} }],
  wires: [],
};

function tryCode(body: string): string | null {
  // `hisobla` — uzilish sinovi uchun yordamchi funksiya.
  const code = `int soni = 0;
void hisobla() { soni = soni + 1; }
void setup(){ Serial.begin(9600); ${body} } void loop(){}`;
  const parsed = parseSketch(code);
  if (!parsed.ok) return "PARSE: " + parsed.errors[0]?.message;
  const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
  sim.start();
  sim.advance(30);
  if (sim.fatal) return "RUNTIME: " + sim.fatal;
  const err = sim.getLogs().find((l) => l.level === "error");
  return err ? "LOG: " + err.text : null;
}

describe("Arduino API qamrovi", () => {
  const cases: [string, string][] = [
    ["millis", "unsigned long t = millis();"],
    ["micros", "unsigned long t = micros();"],
    ["map", "int v = map(512, 0, 1023, 0, 255);"],
    ["constrain", "int v = constrain(300, 0, 255);"],
    ["random", "int v = random(10);"],
    ["random(a,b)", "int v = random(5, 10);"],
    ["randomSeed", "randomSeed(42);"],
    ["abs/min/max", "int v = abs(-3) + min(1,2) + max(3,4);"],
    ["pow/sqrt/sq", "float v = pow(2,3) + sqrt(16) + sq(3);"],
    ["round/floor/ceil", "int v = round(1.5) + floor(1.9) + ceil(1.1);"],
    ["delayMicroseconds", "delayMicroseconds(50);"],
    ["tone/noTone", "tone(8, 440); noTone(8);"],
    ["shiftOut", "shiftOut(2, 3, 1, 255);"],
    ["bitRead/bitWrite", "int b = bitRead(5, 0); byte x = 0; bitWrite(x, 1, 1);"],
    ["bitSet/bitClear", "byte x = 0; bitSet(x, 2); bitClear(x, 2);"],
    ["highByte/lowByte", "byte h = highByte(513); byte l = lowByte(513);"],
    [
      "attachInterrupt",
      "pinMode(2, INPUT_PULLUP); attachInterrupt(digitalPinToInterrupt(2), hisobla, FALLING);",
    ],
    ["detachInterrupt", "detachInterrupt(0);"],
    ["Serial.print(HEX)", "Serial.print(255, HEX);"],
    ["String metodlari", 'String s = "salom"; int n = s.length();'],
    ["analogWrite", "pinMode(9, OUTPUT); analogWrite(9, 128);"],
    ["pulseIn", "pinMode(7, INPUT); long p = pulseIn(7, HIGH);"],
    ["isDigit/isAlpha", "bool a = isDigit('5');"],
    ["toupper", "char c = toupper('a');"],
  ];

  for (const [name, body] of cases) {
    it(name, () => {
      const err = tryCode(body);
      expect(err, `${name}: ${err}`).toBeNull();
    });
  }
});

describe("uzilish haqiqatan chaqiriladi", () => {
  it("tugma bosilganda FALLING uzilishi ishlaydi", () => {
    const circuitWithButton: Circuit = {
      nodes: [
        { id: "uno", type: "arduino-uno", x: 0, y: 0, rotation: 0, settings: {} },
        { id: "b", type: "push-button", x: 300, y: 0, rotation: 0, settings: { pressed: false } },
      ],
      wires: [
        {
          id: "w1",
          from: { nodeId: "b", pinId: "a" },
          to: { nodeId: "uno", pinId: "D2" },
          color: "blue",
        },
        {
          id: "w2",
          from: { nodeId: "b", pinId: "b" },
          to: { nodeId: "uno", pinId: "GND1" },
          color: "black",
        },
      ],
    };
    const code = `
volatile int bosilgan = 0;
void hisobla() { bosilgan = bosilgan + 1; }
void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(2), hisobla, FALLING);
}
void loop() {
  Serial.println(bosilgan);
  delay(50);
}
`;
    const parsed = parseSketch(code);
    if (!parsed.ok) throw new Error(parsed.errors[0]?.message);
    const sim = new Simulator({ circuit: circuitWithButton, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(120);
    // Hali bosilmagan — hisoblagich nolda.
    expect(sim.getLogs().at(-1)?.text).toBe("0");

    // Tugmani bosamiz: INPUT_PULLUP da bu HIGH → LOW o'tishi, ya'ni FALLING.
    sim.updateSensors({ b: 1 });
    sim.advance(120);
    expect(Number(sim.getLogs().at(-1)?.text)).toBeGreaterThan(0);
  });

  it("randomSeed bir xil urug'da bir xil ketma-ketlik beradi", () => {
    const run = () => {
      const code = `void setup(){ Serial.begin(9600); randomSeed(7); Serial.println(random(1000)); Serial.println(random(1000)); } void loop(){}`;
      const parsed = parseSketch(code);
      if (!parsed.ok) throw new Error("parse");
      const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
      sim.start();
      sim.advance(30);
      return sim
        .getLogs()
        .map((l) => l.text)
        .join(",");
    };
    expect(run()).toBe(run());
  });

  it("bitWrite o'zgaruvchini haqiqatan o'zgartiradi", () => {
    const code = `void setup(){ Serial.begin(9600); byte x = 0; bitSet(x, 0); bitSet(x, 2); Serial.println(x); bitClear(x, 0); Serial.println(x); } void loop(){}`;
    const parsed = parseSketch(code);
    if (!parsed.ok) throw new Error("parse");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(30);
    const out = sim.getLogs().map((l) => l.text);
    expect(out).toContain("5");
    expect(out).toContain("4");
  });

  it("shiftOut pinlarni haqiqatan qimirlatadi", () => {
    const code = `void setup(){ pinMode(2, OUTPUT); pinMode(3, OUTPUT); shiftOut(2, 3, MSBFIRST, 170); } void loop(){}`;
    const parsed = parseSketch(code);
    if (!parsed.ok) throw new Error("parse");
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors: {} });
    sim.start();
    sim.advance(30);
    expect(sim.observed.pinsDrivenHigh).toContain(2);
    expect(sim.observed.pinsDrivenHigh).toContain(3);
    expect(sim.observed.pinsDrivenLow).toContain(3);
  });
});
