import { ANALOG_PIN_BASE, PWM_PINS, batteryVoltage, getDefinition, pinIdToNumber } from "./catalog";
import {
  boardPinFor,
  buildNetlist,
  isGrounded,
  isPowered,
  netFor,
  reachableNets,
  resistanceToGround,
  resistanceToSource,
  supplyVoltage,
  type Netlist,
} from "./netlist";
import type {
  ArduinoBoardState,
  Circuit,
  ComponentRuntimeState,
  Expression,
  LogLevel,
  ObservedBehaviour,
  ParsedSketch,
  PinMode,
  SerialLogEntry,
  Statement,
} from "./types";

/**
 * Qizil LED ochilish kuchlanishi (V) va to'liq yorqinlikka chiqish nuqtasi.
 * 1.5 V batareya LEDni yoqmaydi — bu haqiqiy hayotdagi hol va bola shuni
 * o'z ko'zi bilan ko'rishi kerak.
 */
export const LED_FORWARD_VOLTAGE = 1.8;

/**
 * Rezistorsiz ulanganda ham qarshilik nol bo'lmasin: LEDning o'zi va simlar
 * ozgina qarshilikka ega. Aks holda tok cheksizga aylanardi.
 */
const CIRCUIT_STRAY_OHMS = 20;

/**
 * To'liq yorqinlikka mos tok.
 *
 * Darsliklardagi standart juftlik — 5 V va 220 Ω — 100% yorqinlik deb
 * olinadi. Shu tufayli mavjud sxemalar avvalgidek ishlaydi, kattaroq
 * qarshilik esa LEDni ko'rinarli darajada xiralashtiradi.
 */
const LED_NOMINAL_CURRENT = (5 - LED_FORWARD_VOLTAGE) / 220;

/**
 * LED yorqinligi (0–1) — Om qonuni bo'yicha.
 *
 * `I = (U − U_ochilish) / R`, so'ng nominal tokka nisbatan olinadi:
 * 220 Ω → to'liq, 1 kΩ → ancha xira, 10 kΩ → deyarli ko'rinmaydi.
 */
export function ledOutputFor(volts: number, ohms: number): number {
  if (volts <= LED_FORWARD_VOLTAGE) return 0;
  const current = (volts - LED_FORWARD_VOLTAGE) / Math.max(ohms, CIRCUIT_STRAY_OHMS);
  return Math.max(0, Math.min(1, current / LED_NOMINAL_CURRENT));
}

/** LED orqali oqayotgan taxminiy tok (mA) — ogohlantirishlar uchun. */
export function ledCurrentMa(volts: number, ohms: number): number {
  if (volts <= LED_FORWARD_VOLTAGE) return 0;
  return ((volts - LED_FORWARD_VOLTAGE) / Math.max(ohms, CIRCUIT_STRAY_OHMS)) * 1000;
}

/**
 * Simulyatsiya dvigateli.
 *
 * Foydalanuvchi kodi JavaScript sifatida BAJARILMAYDI — parser qurgan daraxt
 * shu yerda qadam-baqadam o'qiladi.
 *
 * `delay()` real vaqtni bloklamaydi: interpretator generator sifatida yozilgan
 * va `delay` uchrasa boshqaruvni qaytaradi. Tashqi halqa virtual soatni
 * suradi. Shu tufayli `while(true)` yoki uzun `delay` brauzerni qotirmaydi.
 */

/** Bitta qadamda bajariladigan amallar chegarasi — cheksiz sikldan himoya. */
const MAX_OPS_PER_TICK = 20_000;
/** Bitta `loop()` chaqiruvida ruxsat etilgan amallar — cheksiz ichki sikldan himoya. */
const MAX_OPS_PER_LOOP = 200_000;
/** Yordamchi funksiyalar bir-birini cheksiz chaqirib yubormasin. */
const MAX_CALL_DEPTH = 32;
/** Serial monitorda saqlanadigan maksimal log soni. */
const MAX_LOGS = 500;
/**
 * Virtual soat siljimasdan necha kadr o'tsa — kod cheksiz aylanmoqda deb
 * hisoblanadi. Bir necha kadr beriladi: sekin, lekin haqiqiy ish qilayotgan
 * kod noto'g'ri ayblanmasin.
 */
const MAX_STALLED_TICKS = 12;

type Signal = { type: "delay"; ms: number } | { type: "op" };

class RuntimeError extends Error {}
class ReturnSignal extends Error {
  constructor(readonly value: number | string = 0) {
    super("return");
  }
}
class BreakSignal extends Error {
  constructor() {
    super("`break` faqat `for` yoki `while` ichida ishlatiladi.");
  }
}
class ContinueSignal extends Error {
  constructor() {
    super("`continue` faqat `for` yoki `while` ichida ishlatiladi.");
  }
}

/** Interpretatorning o'zgaruvchilar xotirasi. */
type Scope = Map<string, number | string | boolean>;

const CONSTANTS: Record<string, number> = {
  HIGH: 1,
  LOW: 0,
  INPUT: 0,
  OUTPUT: 1,
  INPUT_PULLUP: 2,
  LED_BUILTIN: 13,
  true: 1,
  false: 0,
  A0: ANALOG_PIN_BASE,
  A1: ANALOG_PIN_BASE + 1,
  A2: ANALOG_PIN_BASE + 2,
  A3: ANALOG_PIN_BASE + 3,
  A4: ANALOG_PIN_BASE + 4,
  A5: ANALOG_PIN_BASE + 5,
};

export interface SimulatorOptions {
  circuit: Circuit;
  sketch: ParsedSketch;
  /** Sensor qiymatlari: node id → qiymat. */
  sensors: Record<string, number>;
}

export class Simulator {
  private board: ArduinoBoardState = { modes: {}, digital: {}, pwm: {} };
  /** Oxirgi Serial yozuvi vaqti — TX/RX indikatorlarini miltillatish uchun. */
  private lastSerialAt = -Infinity;
  private scope: Scope = new Map();
  private scopes: Scope[] = [this.scope];
  private logs: SerialLogEntry[] = [];
  private logSeq = 0;
  private serialPartialLogId: number | null = null;
  private netlist: Netlist;
  private runner: Generator<Signal, void, void> | null = null;
  private pendingWakeAt = 0;
  private serialOpen = false;
  private serialInput = "";
  private tonePins = new Set<number>();
  private servoPins = new Map<string, number>();
  private servoAngles = new Map<string, number>();
  private callDepth = 0;

  /** Virtual soat (ms). */
  time = 0;
  /** Ishlashni to'xtatgan xato. */
  fatal: string | null = null;

  /** Cheksiz siklni aniqlash uchun: oxirgi kadrdagi virtual vaqt. */
  private lastTickTime = -1;
  private stalledTicks = 0;

  readonly observed: ObservedBehaviour = {
    pinsDrivenHigh: [],
    pinsDrivenLow: [],
    ledToggles: 0,
    usedDelay: false,
  };

  private lastLedOn: boolean | null = null;

  constructor(private readonly options: SimulatorOptions) {
    this.netlist = buildNetlist(options.circuit);
  }

  /** Sensor qiymatlari o'zgarganda chaqiriladi (qayta ishga tushirmasdan). */
  updateSensors(sensors: Record<string, number>) {
    this.options.sensors = sensors;
  }

  getLogs(): SerialLogEntry[] {
    return this.logs;
  }

  getBoard(): ArduinoBoardState {
    return this.board;
  }

  private log(level: LogLevel, text: string) {
    this.lastSerialAt = this.time;
    this.logs.push({ id: this.logSeq++, at: Math.round(this.time), level, text });
    this.serialPartialLogId = null;
    // Xotira cheksiz o'smasin.
    if (this.logs.length > MAX_LOGS) this.logs.splice(0, this.logs.length - MAX_LOGS);
  }

  private writeSerial(text: string, newline: boolean) {
    this.lastSerialAt = this.time;

    const partial =
      this.serialPartialLogId === null
        ? undefined
        : this.logs.find((entry) => entry.id === this.serialPartialLogId);

    if (partial) {
      partial.text += text;
      partial.at = Math.round(this.time);
    } else {
      const entry = { id: this.logSeq++, at: Math.round(this.time), level: "info" as const, text };
      this.logs.push(entry);
      this.serialPartialLogId = entry.id;
    }

    if (newline) this.serialPartialLogId = null;
    if (this.logs.length > MAX_LOGS) {
      this.logs.splice(0, this.logs.length - MAX_LOGS);
      if (
        this.serialPartialLogId !== null &&
        !this.logs.some((entry) => entry.id === this.serialPartialLogId)
      ) {
        this.serialPartialLogId = null;
      }
    }
  }

  /* ─────────────── Ifodalarni hisoblash ─────────────── */

  private evaluate(expr: Expression): number | string {
    switch (expr.kind) {
      case "number":
        return expr.value;
      case "string":
        return expr.value;
      case "identifier": {
        const scope = this.findScope(expr.name);
        if (scope) {
          const v = scope.get(expr.name)!;
          return typeof v === "boolean" ? (v ? 1 : 0) : v;
        }
        const defined = this.options.sketch.defines[expr.name];
        if (defined !== undefined) return defined;
        const constant = CONSTANTS[expr.name];
        if (constant !== undefined) return constant;
        throw new RuntimeError(`"${expr.name}" o'zgaruvchisi e'lon qilinmagan`);
      }
      case "unary": {
        const v = this.toNumber(this.evaluate(expr.operand));
        if (expr.op === "-") return -v;
        if (expr.op === "~") return ~v;
        return v === 0 ? 1 : 0;
      }
      case "binary": {
        const l = this.evaluate(expr.left);
        if (expr.op === "&&") {
          return this.toNumber(l) !== 0 && this.toNumber(this.evaluate(expr.right)) !== 0 ? 1 : 0;
        }
        if (expr.op === "||") {
          return this.toNumber(l) !== 0 || this.toNumber(this.evaluate(expr.right)) !== 0 ? 1 : 0;
        }

        const r = this.evaluate(expr.right);
        if (expr.op === "+" && (typeof l === "string" || typeof r === "string")) {
          return `${this.toText(l)}${this.toText(r)}`;
        }
        if (expr.op === "==" && (typeof l === "string" || typeof r === "string")) {
          return this.toText(l) === this.toText(r) ? 1 : 0;
        }
        if (expr.op === "!=" && (typeof l === "string" || typeof r === "string")) {
          return this.toText(l) !== this.toText(r) ? 1 : 0;
        }
        const a = this.toNumber(l);
        const b = this.toNumber(r);
        switch (expr.op) {
          case "+":
            return a + b;
          case "-":
            return a - b;
          case "*":
            return a * b;
          case "/":
            if (b === 0) throw new RuntimeError("Nolga bo'lish mumkin emas");
            return a / b;
          case "%":
            if (b === 0) throw new RuntimeError("Nolga bo'lish mumkin emas");
            return a % b;
          case "<<":
            return a << b;
          case ">>":
            return a >> b;
          case "==":
            return a === b ? 1 : 0;
          case "!=":
            return a !== b ? 1 : 0;
          case "<":
            return a < b ? 1 : 0;
          case ">":
            return a > b ? 1 : 0;
          case "<=":
            return a <= b ? 1 : 0;
          case ">=":
            return a >= b ? 1 : 0;
          case "&":
            return a & b;
          case "^":
            return a ^ b;
          case "|":
            return a | b;
        }
        return 0;
      }
      case "call":
        if (this.options.sketch.functions[expr.callee]) return this.callUserFunctionSync(expr);
        return this.callFunction(expr);
    }
  }

  private toNumber(v: number | string): number {
    if (typeof v === "number") return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private toText(v: number | string): string {
    return typeof v === "string" ? v : String(v);
  }

  private currentScope(): Scope {
    return this.scopes[this.scopes.length - 1] ?? this.scope;
  }

  private findScope(name: string): Scope | null {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const scope = this.scopes[i]!;
      if (scope.has(name)) return scope;
    }
    return null;
  }

  private callUserFunctionSync(expr: Expression & { kind: "call" }): number | string {
    const helper = this.options.sketch.functions[expr.callee];
    if (!helper) throw new RuntimeError(`"${expr.callee}" funksiyasi topilmadi`);
    if (expr.args.length !== helper.params.length) {
      throw new RuntimeError(
        `"${expr.callee}" funksiyasi ${helper.params.length} ta argument kutadi, ${expr.args.length} ta berildi`,
      );
    }
    if (this.callDepth >= MAX_CALL_DEPTH) {
      throw new RuntimeError("Funksiyalar juda chuqur chaqirildi — rekursiyani tekshiring");
    }

    const args = expr.args.map((arg) => this.evaluate(arg));
    this.callDepth += 1;
    this.scopes.push(new Map(helper.params.map((param, index) => [param, args[index] ?? 0])));
    try {
      const runner = this.execBlock(helper.body);
      for (;;) {
        const step = runner.next();
        if (step.done) return 0;
        if (step.value.type === "delay") {
          throw new RuntimeError(
            `"${expr.callee}" funksiyasi qiymat qaytarayotganda delay() ishlata olmaydi`,
          );
        }
      }
    } catch (err) {
      if (err instanceof ReturnSignal) return err.value;
      throw err;
    } finally {
      this.scopes.pop();
      this.callDepth -= 1;
    }
  }

  /* ─────────────── Arduino funksiyalari ─────────────── */

  private callFunction(expr: Expression & { kind: "call" }): number | string {
    const name = expr.callee;
    const args = expr.args.map((a) => this.evaluate(a));
    const num = (i: number) => this.toNumber(args[i] ?? 0);

    switch (name) {
      case "pinMode": {
        const pin = num(0);
        const mode = num(1);
        this.assertPin(pin, "pinMode");
        this.board.modes[pin] = mode === 1 ? "output" : mode === 2 ? "input_pullup" : "input";
        return 0;
      }

      case "digitalWrite": {
        const pin = num(0);
        const value = num(1) === 0 ? 0 : 1;
        this.assertPin(pin, "digitalWrite");
        if (this.board.modes[pin] !== "output") {
          this.log(
            "warning",
            `${pin}-pin OUTPUT qilib sozlanmagan — setup() da pinMode(${pin}, OUTPUT) yozing.`,
          );
        }
        this.board.digital[pin] = value;
        this.board.pwm[pin] = value === 1 ? 255 : 0;
        this.recordPinDrive(pin, value);
        return 0;
      }

      case "digitalRead": {
        const pin = num(0);
        this.assertPin(pin, "digitalRead");
        return this.readDigital(pin);
      }

      case "analogRead": {
        const pin = num(0);
        return this.readAnalog(pin);
      }

      case "analogWrite": {
        const pin = num(0);
        const value = Math.max(0, Math.min(255, num(1)));
        this.assertPin(pin, "analogWrite");
        if (!PWM_PINS.has(pin)) {
          this.log("warning", `${pin}-pin PWM emas. PWM pinlar: 3, 5, 6, 9, 10, 11.`);
        }
        this.board.pwm[pin] = value;
        this.board.digital[pin] = value > 127 ? 1 : 0;
        this.recordPinDrive(pin, value > 0 ? 1 : 0);
        return 0;
      }

      case "Serial.begin":
        this.serialOpen = true;
        this.log("info", `Serial ${num(0) || 9600} tezlikda ochildi`);
        return 0;

      case "Serial.print":
      case "Serial.println": {
        if (!this.serialOpen) {
          this.log("warning", "Serial.begin() chaqirilmagan — setup() da qo'shing.");
          this.serialOpen = true;
        }
        this.writeSerial(this.toText(args[0] ?? ""), name === "Serial.println");
        return 0;
      }

      case "Serial.available":
        return this.serialInput.length;

      case "Serial.read": {
        if (this.serialInput.length === 0) return -1;
        const ch = this.serialInput[0]!;
        this.serialInput = this.serialInput.slice(1);
        return ch.charCodeAt(0);
      }

      case "Serial.readString": {
        const text = this.serialInput;
        this.serialInput = "";
        return text;
      }

      case "Serial.parseInt": {
        const match = this.serialInput.match(/^\s*(-?\d+)/);
        if (!match) return 0;
        this.serialInput = this.serialInput.slice(match[0].length);
        return Number(match[1]);
      }

      case "millis":
        return Math.round(this.time);

      case "map": {
        const [v, inMin, inMax, outMin, outMax] = [num(0), num(1), num(2), num(3), num(4)];
        if (inMax === inMin) return outMin;
        return ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
      }

      case "constrain":
        return Math.max(num(1), Math.min(num(2), num(0)));

      case "abs":
        return Math.abs(num(0));

      case "min":
        return Math.min(num(0), num(1));

      case "max":
        return Math.max(num(0), num(1));

      case "sq": {
        const value = num(0);
        return value * value;
      }

      case "sqrt":
        return Math.sqrt(num(0));

      case "pow":
        return Math.pow(num(0), num(1));

      case "round":
        return Math.round(num(0));

      case "pulseIn":
        return this.readPulse(num(0), num(1));

      case "tone": {
        const pin = num(0);
        this.assertPin(pin, "tone");
        this.tonePins.add(pin);
        return 0;
      }

      case "noTone": {
        const pin = num(0);
        this.assertPin(pin, "noTone");
        this.tonePins.delete(pin);
        return 0;
      }

      case "random":
        // Deterministik emas, lekin simulyatsiya uchun yetarli.
        return args.length >= 2
          ? Math.floor(Math.random() * (num(1) - num(0))) + num(0)
          : Math.floor(Math.random() * num(0));

      default:
        if (name.endsWith(".trim")) {
          const instance = name.split(".")[0]!;
          const scope = this.findScope(instance);
          if (!scope) throw new RuntimeError(`"${instance}" o'zgaruvchisi e'lon qilinmagan`);
          const value = scope.get(instance);
          const trimmed = (
            typeof value === "boolean" ? String(value) : this.toText(value ?? "")
          ).trim();
          scope.set(instance, trimmed);
          return trimmed;
        }
        // `servo.attach(9)` / `servo.write(90)` kabi chaqiruvlar.
        if (name.endsWith(".attach")) {
          const instance = name.split(".")[0]!;
          const pin = num(0);
          this.assertPin(pin, `${name}`);
          this.servoPins.set(instance, pin);
          this.servoAngles.set(instance, 90);
          return 0;
        }
        if (name.endsWith(".write")) {
          const instance = name.split(".")[0]!;
          const angle = Math.max(0, Math.min(180, num(0)));
          this.servoAngles.set(instance, angle);
          return 0;
        }
        if (name === "delay" || name === "delayMicroseconds") {
          // `delay` generatorda alohida ishlanadi; bu yerga tushmasligi kerak.
          return 0;
        }
        throw new RuntimeError(`"${name}" funksiyasi qo'llab-quvvatlanmaydi`);
    }
  }

  private assertPin(pin: number, fn: string) {
    if (!Number.isInteger(pin) || pin < 0 || pin > ANALOG_PIN_BASE + 5) {
      throw new RuntimeError(`${fn}() funksiyasida noto'g'ri pin: ${pin}`);
    }
  }

  private recordPinDrive(pin: number, value: number) {
    const list = value === 1 ? this.observed.pinsDrivenHigh : this.observed.pinsDrivenLow;
    if (!list.includes(pin)) list.push(pin);

    // LED yonib-o'chishini sanaymiz (dars tekshiruvi uchun).
    const on = this.computeLedOn();
    if (this.lastLedOn !== null && on !== this.lastLedOn) this.observed.ledToggles += 1;
    this.lastLedOn = on;
  }

  /** Sxemadagi biror LED yonib turibdimi. */
  private computeLedOn(): boolean {
    for (const node of this.options.circuit.nodes) {
      if (node.type !== "led") continue;
      if (this.ledBrightness(node.id) > 0) return true;
    }
    return false;
  }

  /* ─────────────── Sxemadan o'qish ─────────────── */

  private readDigital(pin: number): number {
    // Pinga tugma ulangan bo'lsa — uning holatiga qaraymiz.
    for (const node of this.options.circuit.nodes) {
      if (node.type !== "push-button") continue;
      const pressed =
        this.options.sensors[node.id] !== undefined
          ? this.options.sensors[node.id]! >= 0.5
          : node.settings.pressed === true;
      const releasedNetlist = pressed
        ? buildNetlist({
            ...this.options.circuit,
            nodes: this.options.circuit.nodes.map((n) =>
              n.id === node.id ? { ...n, settings: { ...n.settings, pressed: false } } : n,
            ),
          })
        : this.netlist;
      const boardSide =
        boardPinFor(releasedNetlist, node.id, "a") === pin
          ? "a"
          : boardPinFor(releasedNetlist, node.id, "b") === pin
            ? "b"
            : null;
      if (boardSide === null) continue;

      const otherSide = boardSide === "a" ? "b" : "a";
      // INPUT_PULLUP da bosilganda 0, bo'shatilganda 1 (haqiqiy Arduino kabi).
      if (this.board.modes[pin] === "input_pullup") {
        if (!pressed) return 1;
        return isGrounded(releasedNetlist, node.id, otherSide) ? 0 : 1;
      }
      if (!pressed) return this.board.digital[pin] ?? 0;
      return isPowered(releasedNetlist, node.id, otherSide) ? 1 : 0;
    }
    return this.board.digital[pin] ?? 0;
  }

  private readAnalog(pin: number): number {
    // Analog pinga ulangan potensiometr yoki LDR qiymatini qaytaramiz.
    for (const node of this.options.circuit.nodes) {
      if (node.type !== "potentiometer" && node.type !== "ldr") continue;
      const signalPin = node.type === "potentiometer" ? "wiper" : "signal";
      if (boardPinFor(this.netlist, node.id, signalPin) !== pin) continue;
      if (!isPowered(this.netlist, node.id, "vcc") || !isGrounded(this.netlist, node.id, "gnd")) {
        return 0;
      }

      const override = this.options.sensors[node.id];
      if (override !== undefined) return Math.max(0, Math.min(1023, Math.round(override)));

      const fallback = node.type === "potentiometer" ? node.settings.value : node.settings.light;
      return typeof fallback === "number" ? fallback : 0;
    }
    return 0;
  }

  private readPulse(pin: number, value: number): number {
    this.assertPin(pin, "pulseIn");
    if (value === 0) return 0;

    for (const node of this.options.circuit.nodes) {
      if (node.type !== "ultrasonic") continue;
      if (boardPinFor(this.netlist, node.id, "echo") !== pin) continue;
      if (!isPowered(this.netlist, node.id, "vcc") || !isGrounded(this.netlist, node.id, "gnd")) {
        return 0;
      }

      const override = this.options.sensors[node.id];
      const fallback = node.settings.distance;
      const distance =
        typeof override === "number" ? override : typeof fallback === "number" ? fallback : 30;
      return Math.round(Math.max(2, Math.min(400, distance)) * 58.2);
    }

    return 0;
  }

  /**
   * Zanjirdagi ketma-ket qarshilik (Ω).
   *
   * Rezistor anod tomonida ham, katod tomonida ham turishi mumkin —
   * ikkalasi ham tokni bir xil cheklaydi, shuning uchun qo'shiladi.
   */
  private seriesOhms(nodeId: string): number {
    const toSource = resistanceToSource(this.netlist, nodeId, "anode") ?? 0;
    const toGround = resistanceToGround(this.netlist, nodeId, "cathode") ?? 0;
    return toSource + toGround;
  }

  /** LED yorqinligi 0–1: anodi quvvatga, katodi GND'ga ulangan bo'lsa yonadi. */
  private ledBrightness(nodeId: string): number {
    const cathodeGrounded = isGrounded(this.netlist, nodeId, "cathode");
    if (!cathodeGrounded) return 0;

    const ohms = this.seriesOhms(nodeId);

    // Doimiy manba (batareya yoki 5V relsi).
    if (isPowered(this.netlist, nodeId, "anode")) {
      const volts = supplyVoltage(this.netlist, nodeId, "anode") ?? 5;
      return ledOutputFor(volts, ohms);
    }

    // Arduino chiqishi. PWM to'liq 5 V ni o'chirib-yoqadi, shuning uchun
    // kuchlanish doim 5 V, o'rtacha tok esa to'ldirish koeffitsiyentiga
    // proporsional — xiralashtirishni qarshilik va PWM birgalikda beradi.
    const anodePin = boardPinFor(this.netlist, nodeId, "anode");
    if (anodePin === null || this.board.modes[anodePin] !== "output") return 0;
    const duty = (this.board.pwm[anodePin] ?? 0) / 255;
    return duty * ledOutputFor(5, ohms);
  }

  private outputLevel(pinId: string, nodeId: string): number {
    const pin = boardPinFor(this.netlist, nodeId, pinId);
    if (pin === null || this.board.modes[pin] !== "output") return 0;
    return Math.max(0, Math.min(1, (this.board.pwm[pin] ?? 0) / 255));
  }

  /** Elektr tugunining taxminiy kuchlanishi (V). */
  private voltageOfNet(netId: string | null): number | null {
    if (netId === null) return null;
    if (this.netlist.groundNets.has(netId)) return 0;
    // Aniq manba qiymati (batareya) doim 5V relsidan ustun turadi.
    const source = this.netlist.sourceNets.get(netId);
    if (source !== undefined) return source;
    if (this.netlist.powerNets.has(netId)) return 5;

    for (const [pin, boardNet] of this.netlist.boardPinNets) {
      if (boardNet !== netId || this.board.modes[pin] !== "output") continue;
      return Math.max(0, Math.min(5, ((this.board.pwm[pin] ?? 0) / 255) * 5));
    }

    const reachable = [...reachableNets(this.netlist, netId)].filter((id) => id !== netId);
    const reachesGround = reachable.some((id) => this.netlist.groundNets.has(id));
    const reachesPower = reachable.some((id) => this.netlist.powerNets.has(id));
    if (reachesGround && reachesPower) return null;
    if (reachesGround) return 0;
    if (reachesPower) {
      let volts = 0;
      for (const id of reachable) {
        const source = this.netlist.sourceNets.get(id);
        if (source !== undefined) volts = Math.max(volts, source);
        else if (this.netlist.powerNets.has(id)) volts = Math.max(volts, 5);
      }
      return volts;
    }

    for (const [pin, boardNet] of this.netlist.boardPinNets) {
      if (!reachable.includes(boardNet) || this.board.modes[pin] !== "output") continue;
      return Math.max(0, Math.min(5, ((this.board.pwm[pin] ?? 0) / 255) * 5));
    }

    return null;
  }

  private measuredVoltage(nodeId: string): number {
    const plus = this.voltageOfNet(netFor(this.netlist, nodeId, "probe-plus"));
    const minus = this.voltageOfNet(netFor(this.netlist, nodeId, "probe-minus"));
    if (plus === null || minus === null) return 0;
    return plus - minus;
  }

  /** Har bir komponentning ko'rinadigan holati. */
  getRuntimeState(): Record<string, ComponentRuntimeState> {
    const out: Record<string, ComponentRuntimeState> = {};

    for (const node of this.options.circuit.nodes) {
      const def = getDefinition(node.type);
      if (!def) continue;

      // Plata: har bir pinning joriy qiymati + indikator LED'lari.
      if (def.isBoard) {
        const pins: Record<string, number> = {};
        const pinModes: Record<string, PinMode> = {};
        for (const pin of def.pins) {
          const number = pinIdToNumber(pin.id);
          if (number === null) continue;
          pins[pin.id] = pin.role === "analog" ? this.readAnalog(number) : this.readDigital(number);
          const mode = this.board.modes[number];
          if (mode) pinModes[pin.id] = mode;
        }
        out[node.id] = {
          pins,
          pinModes,
          powered: true,
          // Yozuvdan keyingi 120 ms davomida TX/RX yonib turadi.
          serialActive: this.time - this.lastSerialAt < 120,
        };
        continue;
      }

      /*
       * Batareya: ekranda kuchlanish yozuvi va kichik indikator ko'rinadi.
       * "Ishlayapti" degani — yoqilgan va ikkala terminali ham zanjirga
       * ulangan, ya'ni tok yurishi uchun halqa yopilgan.
       */
      if (node.type === "battery") {
        const volts = batteryVoltage(node.settings);
        const plusNet = netFor(this.netlist, node.id, "plus");
        const minusNet = netFor(this.netlist, node.id, "minus");
        const wired = [plusNet, minusNet].every(
          (net) => net !== null && (this.netlist.pinsOf.get(net) ?? []).length > 1,
        );
        out[node.id] = { voltage: volts, active: volts !== 0 && wired };
        continue;
      }

      if (node.type === "led") {
        const brightness = this.ledBrightness(node.id);
        out[node.id] = {
          brightness,
          color: typeof node.settings.color === "string" ? node.settings.color : "red",
        };
        continue;
      }

      if (node.type === "rgb-led") {
        if (!isGrounded(this.netlist, node.id, "common")) {
          out[node.id] = { brightness: 0, color: "#9aa4b2" };
          continue;
        }
        const r = this.outputLevel("r", node.id);
        const g = this.outputLevel("g", node.id);
        const b = this.outputLevel("b", node.id);
        const brightness = Math.max(r, g, b);
        const hex = (v: number) =>
          Math.round(v * 255)
            .toString(16)
            .padStart(2, "0");
        out[node.id] = { brightness, color: `#${hex(r)}${hex(g)}${hex(b)}` };
        continue;
      }

      if (node.type === "buzzer") {
        const pin = boardPinFor(this.netlist, node.id, "plus");
        const grounded = isGrounded(this.netlist, node.id, "minus");
        out[node.id] = {
          buzzing:
            grounded &&
            (isPowered(this.netlist, node.id, "plus") ||
              (pin !== null && ((this.board.digital[pin] ?? 0) === 1 || this.tonePins.has(pin)))),
        };
        continue;
      }

      if (node.type === "servo") {
        if (!isPowered(this.netlist, node.id, "vcc") || !isGrounded(this.netlist, node.id, "gnd")) {
          out[node.id] = { angle: Math.round(Number(node.settings.angle ?? 90)) };
          continue;
        }
        const pin = boardPinFor(this.netlist, node.id, "signal");
        const attached =
          pin !== null ? [...this.servoPins].find(([, p]) => p === pin)?.[0] : undefined;
        const fromCode = attached ? this.servoAngles.get(attached) : undefined;
        const fromPwm = pin !== null ? ((this.board.pwm[pin] ?? 0) / 255) * 180 : undefined;
        const angle = fromCode ?? fromPwm ?? Number(node.settings.angle ?? 90);
        out[node.id] = { angle: Math.round(angle) };
        continue;
      }

      if (node.type === "multimeter") {
        out[node.id] = { voltage: this.measuredVoltage(node.id) };
        continue;
      }
    }

    return out;
  }

  /* ─────────────── Bajarish (generator) ─────────────── */

  private *execBlock(stmts: Statement[]): Generator<Signal, void, void> {
    for (const stmt of stmts) yield* this.execStatement(stmt);
  }

  private *execStatement(stmt: Statement): Generator<Signal, void, void> {
    yield { type: "op" };

    switch (stmt.kind) {
      case "declare":
        this.currentScope().set(stmt.name, stmt.value ? this.evaluate(stmt.value) : 0);
        return;

      case "assign": {
        const scope = this.findScope(stmt.name);
        if (!scope) {
          throw new RuntimeError(`"${stmt.name}" o'zgaruvchisi e'lon qilinmagan`);
        }
        scope.set(stmt.name, this.evaluate(stmt.value));
        return;
      }

      case "return":
        throw new ReturnSignal(stmt.value ? this.evaluate(stmt.value) : 0);

      case "break":
        throw new BreakSignal();

      case "continue":
        throw new ContinueSignal();

      case "expression": {
        const e = stmt.expression;
        const helper = e.kind === "call" ? this.options.sketch.functions[e.callee] : undefined;
        if (e.kind === "call" && helper) {
          if (e.args.length !== helper.params.length) {
            throw new RuntimeError(
              `"${e.callee}" funksiyasi ${helper.params.length} ta argument kutadi, ${e.args.length} ta berildi`,
            );
          }
          if (this.callDepth >= MAX_CALL_DEPTH) {
            throw new RuntimeError("Funksiyalar juda chuqur chaqirildi — rekursiyani tekshiring");
          }
          const args = e.args.map((arg) => this.evaluate(arg));
          this.callDepth += 1;
          this.scopes.push(new Map(helper.params.map((param, index) => [param, args[index] ?? 0])));
          try {
            yield* this.execBlock(helper.body);
          } catch (err) {
            if (!(err instanceof ReturnSignal)) throw err;
          } finally {
            this.scopes.pop();
            this.callDepth -= 1;
          }
          return;
        }
        // `delay()` — yagona to'xtatuvchi chaqiruv.
        if (e.kind === "call" && (e.callee === "delay" || e.callee === "delayMicroseconds")) {
          const raw = this.toNumber(this.evaluate(e.args[0] ?? { kind: "number", value: 0 }));
          const ms = e.callee === "delayMicroseconds" ? raw / 1000 : raw;
          this.observed.usedDelay = true;
          yield { type: "delay", ms: Math.max(0, ms) };
          return;
        }
        this.evaluate(e);
        return;
      }

      case "if": {
        const test = this.toNumber(this.evaluate(stmt.test));
        yield* this.execBlock(test !== 0 ? stmt.then : stmt.else);
        return;
      }

      case "while": {
        let guard = 0;
        while (this.toNumber(this.evaluate(stmt.test)) !== 0) {
          try {
            yield* this.execBlock(stmt.body);
          } catch (err) {
            if (err instanceof BreakSignal) break;
            if (!(err instanceof ContinueSignal)) throw err;
          }
          if (++guard > MAX_OPS_PER_LOOP) {
            throw new RuntimeError("`while` sikli juda uzoq davom etdi — shartni tekshiring");
          }
        }
        return;
      }

      case "for": {
        if (stmt.init) yield* this.execStatement(stmt.init);
        let guard = 0;
        for (;;) {
          if (stmt.test && this.toNumber(this.evaluate(stmt.test)) === 0) break;
          try {
            yield* this.execBlock(stmt.body);
          } catch (err) {
            if (err instanceof BreakSignal) break;
            if (!(err instanceof ContinueSignal)) throw err;
          }
          if (stmt.update) yield* this.execStatement(stmt.update);
          if (++guard > MAX_OPS_PER_LOOP) {
            throw new RuntimeError("`for` sikli juda uzoq davom etdi — shartni tekshiring");
          }
        }
        return;
      }
    }
  }

  /** `setup()` bir marta, so'ng `loop()` cheksiz takrorlanadi. */
  private *program(): Generator<Signal, void, void> {
    try {
      yield* this.execBlock(this.options.sketch.globals);
    } catch (err) {
      if (!(err instanceof ReturnSignal)) throw err;
    }
    try {
      yield* this.execBlock(this.options.sketch.setup);
    } catch (err) {
      if (!(err instanceof ReturnSignal)) throw err;
    }
    for (;;) {
      try {
        yield* this.execBlock(this.options.sketch.loop);
      } catch (err) {
        if (!(err instanceof ReturnSignal)) throw err;
      }
      // Har `loop()` oxirida boshqaruvni qaytaramiz — bo'sh loop ham
      // brauzerni qotirmasin.
      yield { type: "delay", ms: 0 };
    }
  }

  /** Simulyatsiyani boshlaydi. */
  start() {
    this.board = { modes: {}, digital: {}, pwm: {} };
    this.scope = new Map();
    this.scopes = [this.scope];
    this.logs = [];
    this.logSeq = 0;
    this.time = 0;
    this.lastSerialAt = -Infinity;
    this.fatal = null;
    this.serialOpen = false;
    this.serialInput = "";
    this.serialPartialLogId = null;
    this.tonePins.clear();
    this.servoPins.clear();
    this.servoAngles.clear();
    this.callDepth = 0;
    this.lastLedOn = null;
    this.observed.pinsDrivenHigh = [];
    this.observed.pinsDrivenLow = [];
    this.observed.ledToggles = 0;
    this.observed.usedDelay = false;
    this.netlist = buildNetlist(this.options.circuit);
    this.runner = this.program();
    this.pendingWakeAt = 0;
    this.lastTickTime = -1;
    this.stalledTicks = 0;
    this.log("success", "Simulyatsiya boshlandi");
  }

  /**
   * Virtual vaqtni `deltaMs` ga suradi va shu vaqt ichidagi kodni bajaradi.
   * Xato bo'lsa `fatal` to'ldiriladi va simulyatsiya to'xtaydi.
   */
  advance(deltaMs: number) {
    if (!this.runner || this.fatal) return;

    const target = this.time + deltaMs;
    let ops = 0;

    while (this.time < target) {
      // Kutish holatida — vaqtni surib qo'yamiz.
      if (this.pendingWakeAt > this.time) {
        this.time = Math.min(target, this.pendingWakeAt);
        if (this.time < this.pendingWakeAt) return;
      }

      if (++ops > MAX_OPS_PER_TICK) {
        /*
         * Amal chegarasiga yetdik. Odatda bu normal — kod tez aylanyapti,
         * keyingi kadrda davom etadi. Ammo `for (int i = 0; i < 1; i = 0)`
         * kabi kodda virtual soat HECH QACHON oldinga siljimaydi: dastur
         * abadiy aylanadi, brauzer qotmaydi, lekin protsessor behuda
         * ishlaydi va foydalanuvchi nima bo'layotganini bilmaydi.
         *
         * Shuning uchun soat siljimagan kadrlarni sanaymiz va bir necha
         * marta takrorlansa — buni xato deb aytamiz.
         */
        if (this.time === this.lastTickTime) {
          this.stalledTicks += 1;
          if (this.stalledTicks >= MAX_STALLED_TICKS) {
            const message =
              "Kod cheksiz aylanyapti — sikl sharti hech qachon bajarilmaydi. " +
              "`for`/`while` shartini va hisoblagichni tekshiring.";
            this.fatal = message;
            this.log("error", message);
            this.runner = null;
          }
        } else {
          this.stalledTicks = 0;
          this.lastTickTime = this.time;
        }
        return;
      }

      try {
        const step = this.runner.next();
        if (step.done) {
          this.runner = null;
          return;
        }
        if (step.value.type === "delay") {
          this.pendingWakeAt = this.time + step.value.ms;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Noma'lum xato";
        this.fatal = message;
        this.log("error", message);
        this.runner = null;
        return;
      }
    }
  }

  /** Foydalanuvchi Serial Monitor'ga matn yozganda. */
  pushSerialInput(text: string) {
    this.serialInput += `${text}\n`;
    this.log("info", `→ ${text}`);
  }
}
