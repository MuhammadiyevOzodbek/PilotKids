import {
  ANALOG_PIN_BASE,
  DHT11_DEFAULTS,
  LCD_COLUMNS,
  LCD_ROWS,
  PWM_PINS,
  batteryVoltage,
  digitForSegments,
  getDefinition,
  pinIdToNumber,
} from "./catalog";
import {
  boardPinFor,
  buildNetlist,
  isGrounded,
  isPinWired,
  isPowered,
  netFor,
  reachableNets,
  resistanceToGround,
  type Netlist,
} from "./netlist";
import { buildElements, LED_VF, motorDriverChannel } from "./electrical";
import { initialDigitalState, stepDigital, type DigitalState } from "./digital";
import { solveCircuit, type SolveResult, type SolverElement } from "./solver";
import type {
  ArduinoBoardState,
  Circuit,
  CircuitNode,
  ComponentRuntimeState,
  Expression,
  LogLevel,
  MotorDriverMode,
  ObservedBehaviour,
  ParsedSketch,
  PinMode,
  SerialLogEntry,
  Statement,
  WireFlow,
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
 * To'liq yorqinlikka mos keladigan tok (A).
 *
 * Etalon holat — darslikdagi eng ko'p uchraydigan sxema: Arduino chiqishi,
 * 220 Ω rezistor va qizil LED. Yechuvchi pinning ichki qarshiligini ham,
 * LED ning differensial qarshiligini ham hisobga oladi, shuning uchun
 * qiymat aynan shu zanjirdan olinadi.
 */
const LED_FULL_CURRENT = (5 - LED_VF) / (220 + 12 + 25);

/** Sim "jonli" deb hisoblanadigan eng kichik tok (A) — 0.05 mA. */
const LIVE_CURRENT_THRESHOLD = 5e-5;

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
 * VO (kontrast) oyog'i ulanmaganda ishlatiladigan kontrast.
 *
 * To'liq 1 emas: haqiqiy modulda murvat odatda o'rtacha holatda turadi.
 * Nolga yaqin ham emas — VO haqida hali bilmagan bola yig'gan sxemada
 * matn baribir o'qilishi kerak.
 */
const LCD_DEFAULT_CONTRAST = 0.85;
/** Massivning maksimal uzunligi — `int buf[999999]` xotirani yeb qo'ymasin. */
const MAX_ARRAY_LENGTH = 4096;

/** Qo'llab-quvvatlanadigan `String` metodlari. */
const STRING_METHODS = new Set([
  "length",
  "trim",
  "toInt",
  "toFloat",
  "equals",
  "equalsIgnoreCase",
  "indexOf",
  "substring",
  "startsWith",
  "endsWith",
  "toUpperCase",
  "toLowerCase",
]);

/** Butun sonli turlar — bularga berilgan qiymatning kasr qismi qirqiladi. */
const INTEGER_TYPES = new Set([
  "int",
  "long",
  "short",
  "byte",
  "char",
  "bool",
  "boolean",
  "unsigned",
  "word",
]);
/**
 * Virtual soat siljimasdan necha kadr o'tsa — kod cheksiz aylanmoqda deb
 * hisoblanadi. Bir necha kadr beriladi: sekin, lekin haqiqiy ish qilayotgan
 * kod noto'g'ri ayblanmasin.
 */
const MAX_STALLED_TICKS = 12;
/**
 * `loop()` ning bir bosqichi taxminan qancha virtual vaqt oladi (ms).
 *
 * `delay()` yozmagan `loop()` ham (masalan `digitalWrite(13, HIGH);` yoki
 * `millis()` ga asoslangan bloklanmaydigan miltillash) haqiqiy platada vaqt
 * o'tkazadi. Usiz virtual soat turib qolardi va soatni kuzatuvchi himoya
 * (`MAX_STALLED_TICKS`) mutlaqo to'g'ri kodni "cheksiz sikl" deb o'ldirardi.
 * Kichik qiymat: delay'li sxemalarga ta'siri sezilmaydi, delay'sizlariga esa
 * `millis()` normal o'sadi.
 */
const LOOP_OVERHEAD_MS = 0.05;

type Signal = { type: "delay"; ms: number } | { type: "op" };

class RuntimeError extends Error {}
class ReturnSignal extends Error {
  constructor(readonly value: number | string = 0) {
    super("return");
  }
}
class BreakSignal extends Error {
  constructor() {
    super("`break` faqat `for`, `while` yoki `switch` ichida ishlatiladi.");
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
  // Serial.print() uchun sanoq tizimi bazalari.
  DEC: 10,
  HEX: 16,
  OCT: 8,
  BIN: 2,
  A0: ANALOG_PIN_BASE,
  A1: ANALOG_PIN_BASE + 1,
  A2: ANALOG_PIN_BASE + 2,
  A3: ANALOG_PIN_BASE + 3,
  A4: ANALOG_PIN_BASE + 4,
  A5: ANALOG_PIN_BASE + 5,
  // Uzilish rejimlari va bit tartibi.
  LOW_LEVEL: 0,
  CHANGE: 1,
  FALLING: 2,
  RISING: 3,
  LSBFIRST: 0,
  MSBFIRST: 1,
  // DHT kutubxonasidagi sensor turlari: `DHT dht(2, DHT11);`.
  DHT11: 11,
  DHT21: 21,
  DHT22: 22,
};

/**
 * Analog sensorlar registri — `readAnalog` shu jadval orqali ishlaydi.
 *
 * Yangi analog sensor qo'shish uchun bitta yozuv yetarli: signal pini va
 * sozlama/slayder qiymatini 0–1023 ADC qiymatiga aylantiruvchi funksiya.
 * Har safar `readAnalog` ichiga yangi `if` qo'shish shart emas.
 */
const ANALOG_SENSORS: Record<
  string,
  {
    signal: string;
    toAdc: (settings: Record<string, string | number | boolean>, override?: number) => number;
  }
> = {
  potentiometer: {
    signal: "wiper",
    toAdc: (s, o) => o ?? (typeof s.value === "number" ? s.value : 0),
  },
  ldr: {
    signal: "signal",
    toAdc: (s, o) => o ?? (typeof s.light === "number" ? s.light : 0),
  },
  tmp36: {
    signal: "signal",
    // TMP36: Vout(mV) = 10·T + 500; ADC = Vout / 5000 · 1023.
    toAdc: (s, o) => {
      const t = o ?? (typeof s.temperature === "number" ? s.temperature : 25);
      return ((10 * t + 500) / 5000) * 1023;
    },
  },
  "soil-moisture": {
    signal: "signal",
    toAdc: (s, o) => {
      const pct = o ?? (typeof s.moisture === "number" ? s.moisture : 0);
      return (pct / 100) * 1023;
    },
  },
};

/** Raqamli chiqishli sensorlar registri — `readDigital` shu jadvaldan foydalanadi. */
const DIGITAL_OUTPUT_SENSORS: Record<
  string,
  {
    out: string;
    read: (settings: Record<string, string | number | boolean>, override?: number) => number;
  }
> = {
  pir: {
    out: "out",
    read: (s, o) => (o !== undefined ? (o >= 0.5 ? 1 : 0) : s.motion === true ? 1 : 0),
  },
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
  /** LCD obyektlari: o'zgaruvchi nomi → boshqaruv pinlari [RS, E, D4…D7]. */
  private lcdPins = new Map<string, number[]>();
  /** LCD ekranidagi matn: o'zgaruvchi nomi → qatorlar (probellar saqlanadi). */
  private lcdText = new Map<string, string[]>();
  private lcdCursor = new Map<string, { col: number; row: number }>();
  /**
   * Ekranning KO'RINISH holati: `display()`/`noDisplay()`,
   * `cursor()`/`noCursor()`, `blink()`/`noBlink()`.
   *
   * Matndan ALOHIDA saqlanadi, chunki `noDisplay()` yozilgan matnni
   * o'chirmaydi — faqat berkitadi, `display()` esa o'shani qaytaradi.
   * Haqiqiy HD44780 ham shunday ishlaydi.
   */
  private lcdView = new Map<string, { on: boolean; cursor: boolean; blink: boolean }>();
  /** DHT obyektlari: o'zgaruvchi nomi → DATA pini. */
  private dhtPins = new Map<string, number>();
  /** Bir marta aytilgan ogohlantirishlar — jurnal takrordan to'lib ketmasin. */
  private warned = new Set<string>();

  /**
   * Bir xil ogohlantirishni FAQAT bir marta yozadi.
   *
   * `digitalWrite`/`analogWrite` har `loop()` da chaqiriladi, ya'ni
   * sekundiga o'nlab marta. Ilgari ogohlantirish har chaqiruvda
   * takrorlanardi: 40 kadrda 64 ta bir xil qator chiqib, bolaning
   * `Serial.println()` xabarlari ko'rinmay qolardi va 500 qatorlik
   * chegara foydali loglarni o'chirib yuborardi.
   */
  private warnOnce(key: string, message: string) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.log("warning", message);
  }
  /** Rele chulg'amining oxirgi holati: node id → tortganmi. */
  private relayState = new Map<string, boolean>();
  /**
   * Raqamli chiplarning ichki holati (74HC595 registrlari).
   *
   * Elektr yechimidan ATAYLAB ajratilgan: u frontlarga qarab yangilanadi,
   * yechuvchi esa uni faqat o'qiydi. Bir tomonlama oqim tufayli
   * "yangilanish → qayta hisob → yana yangilanish" sikli bo'lishi mumkin emas.
   */
  private digital: DigitalState = {};
  /**
   * Tasodifiy sonlar generatori holati.
   *
   * `Math.random()` o'rniga o'z generatori: `randomSeed()` ishlashi va
   * dars natijasini takrorlash mumkin bo'lishi uchun.
   */
  private randomState = (Date.now() ^ 0x5f3759df) >>> 0;
  /** Pin → uzilish ta'rifi (`attachInterrupt`). */
  private interrupts = new Map<
    number,
    { handler: string; mode: "RISING" | "FALLING" | "CHANGE"; last: number }
  >();
  /** Massivlar: nom → elementlar. Blok qamrovi majburiy emas — global saqlanadi. */
  private arrays = new Map<string, (number | string)[]>();
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
    this.digital = initialDigitalState(options.circuit);
  }

  /** Sensor qiymatlari o'zgarganda chaqiriladi (qayta ishga tushirmasdan). */
  updateSensors(sensors: Record<string, number>) {
    this.options.sensors = sensors;
    // Potensiometr sirg'anuvchisi sxemaning bir qismi — yechim eskirdi.
    this.invalidateSolution();
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
        if (defined !== undefined) {
          // `#define SENSOR A0` — qiymat boshqa konstanta yoki define nomiga
          // ishora qilishi mumkin, uni yechamiz. Aks holda `analogRead(SENSOR)`
          // "A0" satrini raqamga aylantirib 0 ni o'qirdi.
          if (typeof defined === "string") {
            const asConst = CONSTANTS[defined];
            if (asConst !== undefined) return asConst;
            const asDefine = this.options.sketch.defines[defined];
            if (typeof asDefine === "number") return asDefine;
          }
          return defined;
        }
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
            // C'da butun son / butun son = butun son (nolga qarab qirqiladi).
            // Arduino'da `millis() / 1000` → 3, `7 / 2` → 3 bo'ladi.
            return Number.isInteger(a) && Number.isInteger(b) ? Math.trunc(a / b) : a / b;
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
      case "conditional":
        return this.toNumber(this.evaluate(expr.test)) !== 0
          ? this.evaluate(expr.then)
          : this.evaluate(expr.else);
      case "index": {
        const arr = this.arrays.get(expr.name);
        if (!arr) throw new RuntimeError(`"${expr.name}" massivi e'lon qilinmagan`);
        const idx = Math.trunc(this.toNumber(this.evaluate(expr.index)));
        if (idx < 0 || idx >= arr.length) {
          throw new RuntimeError(`"${expr.name}" massivida ${idx}-indeks chegaradan tashqarida`);
        }
        return arr[idx] ?? 0;
      }
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

  /** E'lon qilingan turga qarab qiymatni moslaydi (butun sonlar qirqiladi). */
  private coerceType(valueType: string, value: number | string): number | string {
    if (typeof value === "number" && INTEGER_TYPES.has(valueType)) return Math.trunc(value);
    return value;
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

    /*
     * `attachInterrupt(pin, funksiya, rejim)` ning ikkinchi argumenti —
     * FUNKSIYA NOMI, o'zgaruvchi emas. Uni boshqa chaqiruvlar kabi
     * hisoblab bo'lmaydi: "o'zgaruvchi e'lon qilinmagan" xatosi chiqardi.
     * Shuning uchun bu chaqiruv argumentlar hisoblanishidan OLDIN
     * ajratib olinadi.
     */
    if (name === "attachInterrupt") return this.attachInterrupt(expr);

    const args = expr.args.map((a) => this.evaluate(a));
    const num = (i: number) => this.toNumber(args[i] ?? 0);

    switch (name) {
      case "pinMode": {
        const pin = num(0);
        const mode = num(1);
        this.assertPin(pin, "pinMode");
        this.board.modes[pin] = mode === 1 ? "output" : mode === 2 ? "input_pullup" : "input";
        this.invalidateSolution();
        return 0;
      }

      case "digitalWrite": {
        const pin = num(0);
        const value = num(1) === 0 ? 0 : 1;
        this.assertPin(pin, "digitalWrite");
        if (this.board.modes[pin] !== "output") {
          this.warnOnce(
            `pinmode:${pin}`,
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
        this.assertPin(pin, "analogRead");
        return this.readAnalog(pin);
      }

      case "analogWrite": {
        const pin = num(0);
        // analogWrite butun son (0–255) kutadi — kasr qism qirqiladi.
        const value = Math.max(0, Math.min(255, Math.trunc(num(1))));
        this.assertPin(pin, "analogWrite");
        if (!PWM_PINS.has(pin)) {
          this.warnOnce(`pwm:${pin}`, `${pin}-pin PWM emas. PWM pinlar: 3, 5, 6, 9, 10, 11.`);
          /*
           * PWM bo'lmagan pinda haqiqiy plata oraliq qiymat BERA OLMAYDI:
           * u to'liq HIGH yoki LOW bo'ladi. Ilgari bu yerda qiymat
           * saqlanardi va simulyatorda LED 50% yorqinlikda yonardi —
           * bola simulyatorda ishlagan kodni haqiqiy platada takrorlay
           * olmasdi.
           */
          this.board.pwm[pin] = value > 127 ? 255 : 0;
          this.board.digital[pin] = value > 127 ? 1 : 0;
          this.recordPinDrive(pin, value > 127 ? 1 : 0);
          return 0;
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
      case "Serial.println":
      case "Serial.write": {
        if (!this.serialOpen) {
          this.log("warning", "Serial.begin() chaqirilmagan — setup() da qo'shing.");
          this.serialOpen = true;
        }
        const first = args[0] ?? "";
        let text: string;
        if (name === "Serial.write" && typeof first === "number") {
          // write() bayt kodini belgi sifatida yuboradi.
          text = String.fromCharCode(Math.trunc(first) & 0xff);
        } else if (name !== "Serial.write" && args.length >= 2 && typeof first === "number") {
          const spec = this.toNumber(args[1]);
          if (Number.isInteger(first)) {
            // Butun son: ikkinchi argument sanoq bazasi — (255, HEX) → "FF".
            const radix = spec === 16 || spec === 2 || spec === 8 ? spec : 10;
            text = first.toString(radix).toUpperCase();
          } else {
            // Kasr son: ikkinchi argument kasr xonalari soni — (3.14159, 2) → "3.14".
            text = first.toFixed(Math.max(0, Math.min(20, Math.trunc(spec))));
          }
        } else {
          text = this.toText(first);
        }
        this.writeSerial(text, name === "Serial.println");
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
        // Arduino map() `long` qaytaradi — natija butun songa qirqiladi.
        return Math.trunc(((v - inMin) * (outMax - outMin)) / (inMax - inMin)) + outMin;
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
          ? Math.floor(this.nextRandom() * (num(1) - num(0))) + num(0)
          : Math.floor(this.nextRandom() * num(0));

      /*
       * `randomSeed()` haqiqiy Arduino'da tasodifiy ketma-ketlikni
       * belgilaydi. Bu yerda ham xuddi shunday: urug' berilgan bo'lsa,
       * natija har safar bir xil bo'ladi — dars natijasini takrorlash
       * mumkin bo'lsin.
       */
      case "randomSeed":
        this.randomState = Math.trunc(num(0)) >>> 0 || 1;
        return 0;

      case "micros":
        return Math.round(this.time * 1000);

      case "floor":
        return Math.floor(num(0));

      case "ceil":
        return Math.ceil(num(0));

      case "log":
        return Math.log(num(0));

      case "exp":
        return Math.exp(num(0));

      case "sin":
        return Math.sin(num(0));

      case "cos":
        return Math.cos(num(0));

      case "tan":
        return Math.tan(num(0));

      /* ── Bitlar bilan ishlash ── */

      case "bitRead":
        return (Math.trunc(num(0)) >> Math.trunc(num(1))) & 1;

      case "bit":
        return 1 << Math.trunc(num(0));

      case "highByte":
        return (Math.trunc(num(0)) >> 8) & 0xff;

      case "lowByte":
        return Math.trunc(num(0)) & 0xff;

      /*
       * `bitWrite`/`bitSet`/`bitClear` o'zgaruvchini O'ZGARTIRADI, ya'ni
       * birinchi argument havola bo'lishi kerak. Shuning uchun u ifoda
       * sifatida emas, nom sifatida olinadi.
       */
      case "bitWrite":
      case "bitSet":
      case "bitClear": {
        const target = expr.args[0];
        if (!target || target.kind !== "identifier") {
          throw new RuntimeError(`${name}() birinchi argumenti o'zgaruvchi bo'lishi kerak`);
        }
        const scope = this.findScope(target.name);
        if (!scope) throw new RuntimeError(`"${target.name}" o'zgaruvchisi topilmadi`);
        const stored = scope.get(target.name);
        const current = Math.trunc(
          this.toNumber(typeof stored === "boolean" ? (stored ? 1 : 0) : (stored ?? 0)),
        );
        const bit = Math.trunc(num(1));
        const on = name === "bitSet" ? 1 : name === "bitClear" ? 0 : Math.trunc(num(2));
        const next = on ? current | (1 << bit) : current & ~(1 << bit);
        scope.set(target.name, next);
        return next;
      }

      /* ── Belgilar bilan ishlash ── */

      case "isDigit":
        return /\d/.test(this.charOf(args[0])) ? 1 : 0;

      case "isAlpha":
        return /[a-zA-Z]/.test(this.charOf(args[0])) ? 1 : 0;

      case "isAlphaNumeric":
        return /[a-zA-Z0-9]/.test(this.charOf(args[0])) ? 1 : 0;

      case "isSpace":
        return /\s/.test(this.charOf(args[0])) ? 1 : 0;

      case "isUpperCase":
        return /[A-Z]/.test(this.charOf(args[0])) ? 1 : 0;

      case "isLowerCase":
        return /[a-z]/.test(this.charOf(args[0])) ? 1 : 0;

      case "toupper":
      case "toUpperCase":
        return this.charOf(args[0]).toUpperCase().charCodeAt(0);

      case "tolower":
      case "toLowerCase":
        return this.charOf(args[0]).toLowerCase().charCodeAt(0);

      /* ── Registrlarga ma'lumot uzatish ── */

      /*
       * `shiftOut()` sakkizta bitni ketma-ket uzatadi. Bu yerda u haqiqatan
       * pinlarni qimirlatadi: shunda 74HC595 kabi registr bilan ishlagan
       * dars ham to'g'ri kuzatiladi va "pin qo'zg'atilgan" tekshiruvlari
       * ishlaydi.
       */
      case "shiftOut": {
        const dataPin = Math.trunc(num(0));
        const clockPin = Math.trunc(num(1));
        this.assertPin(dataPin, "shiftOut");
        this.assertPin(clockPin, "shiftOut");
        const msbFirst = Math.trunc(num(2)) !== 0;
        const value = Math.trunc(num(3)) & 0xff;
        for (let i = 0; i < 8; i++) {
          const bit = msbFirst ? (value >> (7 - i)) & 1 : (value >> i) & 1;
          this.board.digital[dataPin] = bit;
          this.board.pwm[dataPin] = bit ? 255 : 0;
          this.recordPinDrive(dataPin, bit);
          for (const level of [1, 0]) {
            this.board.digital[clockPin] = level;
            this.board.pwm[clockPin] = level ? 255 : 0;
            this.recordPinDrive(clockPin, level);
          }
        }
        return 0;
      }

      /* ── Uzilishlar ── */

      case "digitalPinToInterrupt":
        return Math.trunc(num(0));

      case "detachInterrupt":
        this.interrupts.delete(Math.trunc(num(0)));
        return 0;

      default: {
        // String metodlari: `s.length()`, `s.equals("x")`, `s.substring(1,3)`…
        const dot = name.indexOf(".");
        const instance = dot > 0 ? name.slice(0, dot) : "";
        const method = dot > 0 ? name.slice(dot + 1) : "";
        const scope = instance ? this.findScope(instance) : null;
        if (scope && STRING_METHODS.has(method)) {
          const raw = scope.get(instance);
          const str = typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";
          const arg = (i: number) => this.toText(args[i] ?? "");
          switch (method) {
            case "length":
              return str.length;
            case "trim": {
              const t = str.trim();
              scope.set(instance, t);
              return t;
            }
            case "toInt": {
              const m = str.trim().match(/^[+-]?\d+/);
              return m ? Number(m[0]) : 0;
            }
            case "toFloat": {
              const f = parseFloat(str.trim());
              return Number.isFinite(f) ? f : 0;
            }
            case "equals":
              return str === arg(0) ? 1 : 0;
            case "equalsIgnoreCase":
              return str.toLowerCase() === arg(0).toLowerCase() ? 1 : 0;
            case "indexOf":
              return str.indexOf(arg(0));
            case "substring": {
              const s = this.toNumber(args[0] ?? 0);
              const e = args.length > 1 ? this.toNumber(args[1]!) : undefined;
              return str.substring(s, e);
            }
            case "startsWith":
              return str.startsWith(arg(0)) ? 1 : 0;
            case "endsWith":
              return str.endsWith(arg(0)) ? 1 : 0;
            case "toUpperCase": {
              const u = str.toUpperCase();
              scope.set(instance, u);
              return u;
            }
            case "toLowerCase": {
              const l = str.toLowerCase();
              scope.set(instance, l);
              return l;
            }
          }
        }
        /*
         * Kutubxona obyektlari servodan oldin tekshiriladi: `lcd.write()`
         * ham `.write` bilan tugaydi va aks holda servo deb qabul qilinardi.
         */
        if (this.lcdPins.has(instance)) return this.callLcd(instance, method, args);
        if (this.dhtPins.has(instance)) return this.callDht(instance, method);

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
  }

  /* ─────────────── Rele ─────────────── */

  /** Chulg'am tortganmi: modul quvvatlangan va IN pini HIGH bo'lsa. */
  private relayEnergized(node: CircuitNode): boolean {
    if (!isPowered(this.netlist, node.id, "vcc") || !this.sensorGrounded(node.id)) {
      return false;
    }
    if (isPowered(this.netlist, node.id, "in")) return true;
    const pin = boardPinFor(this.netlist, node.id, "in");
    if (pin === null || this.board.modes[pin] !== "output") return false;
    return (this.board.digital[pin] ?? 0) === 1;
  }

  /**
   * Rele holatini sxemaga qaytaradi.
   *
   * Rele — yagona komponent bo'lib, u kod ta'sirida zanjirning tuzilishini
   * o'zgartiradi (COM kontakti NC dan NO ga o'tadi). Netlist esa statik
   * hisoblangan, shuning uchun holat o'zgarganda uni qayta quramiz. Bu
   * kamdan-kam sodir bo'ladi — har kadrda emas, faqat kalit ishlaganda.
   */
  private syncRelays() {
    let changed = false;
    const next = new Map<string, boolean>();

    for (const node of this.options.circuit.nodes) {
      if (node.type !== "relay") continue;
      const on = this.relayEnergized(node);
      next.set(node.id, on);
      if ((this.relayState.get(node.id) ?? false) !== on) changed = true;
    }

    if (!changed) return;
    this.relayState = next;
    this.invalidateSolution();
    this.netlist = buildNetlist({
      ...this.options.circuit,
      nodes: this.options.circuit.nodes.map((n) =>
        n.type === "relay"
          ? { ...n, settings: { ...n.settings, energized: next.get(n.id) === true } }
          : n,
      ),
    });
  }

  /* ─────────────── Kutubxona obyektlari ─────────────── */

  /** `LiquidCrystal lcd(...)` yoki `DHT dht(...)` e'lonini ro'yxatga oladi. */
  private declareLibraryObject(name: string, type: string, args: Expression[]) {
    const numbers = args.map((a) => Math.trunc(this.toNumber(this.evaluate(a))));

    if (type === "LiquidCrystal") {
      /*
       * 4-bitli ulanish: (RS, E, D4, D5, D6, D7) — darsliklardagi variant.
       * 8-bitli e'londa (RS, RW, E, D0…D7) o'n bitta raqam keladi; unda RW
       * o'rtada turadi, shuning uchun boshqaruv pinlari boshqa joydan
       * olinadi. `lcdPins` DOIM bir xil shaklda saqlanadi: [RS, E, D4…D7]
       * — sxema bilan solishtirish shu ro'yxat orqali ketadi.
       */
      if (numbers.length !== 6 && numbers.length !== 7 && numbers.length !== 11) {
        throw new RuntimeError(
          "LiquidCrystal uchun 6 ta pin kerak: LiquidCrystal lcd(RS, E, D4, D5, D6, D7);",
        );
      }
      for (const pin of numbers) this.assertPin(pin, "LiquidCrystal");

      // 7 va 11 raqamli variantlarda ikkinchi o'rinda RW turadi.
      const withRw = numbers.length === 7 || numbers.length === 11;
      const rs = numbers[0]!;
      const e = numbers[withRw ? 2 : 1]!;
      const data = numbers.slice(withRw ? 3 : 2);
      // 8-bitli ulanishda ma'lumot D0 dan boshlanadi; yuqori to'rttasi
      // (D4–D7) HAR IKKALA rejimda ham ekranga yozadi.
      const high = data.length >= 8 ? data.slice(4, 8) : data.slice(0, 4);

      this.lcdPins.set(name, [rs, e, ...high]);
      this.lcdText.set(name, this.lcdBlank());
      this.lcdCursor.set(name, { col: 0, row: 0 });
      this.lcdView.set(name, { on: true, cursor: false, blink: false });
      return;
    }

    if (type === "DHT") {
      const pin = numbers[0];
      if (pin === undefined) {
        throw new RuntimeError("DHT uchun pin kerak: DHT dht(2, DHT11);");
      }
      this.assertPin(pin, "DHT");
      this.dhtPins.set(name, pin);
      return;
    }

    throw new RuntimeError(`"${type}" kutubxona obyekti qo'llab-quvvatlanmaydi`);
  }

  private lcdBlank(): string[] {
    return Array.from({ length: LCD_ROWS }, () => " ".repeat(LCD_COLUMNS));
  }

  /** Kursor turgan joydan boshlab matn yozadi (qator chetidan oshgani kesiladi). */
  private lcdPrint(instance: string, text: string) {
    const lines = this.lcdText.get(instance) ?? this.lcdBlank();
    const cursor = this.lcdCursor.get(instance) ?? { col: 0, row: 0 };
    if (cursor.row < 0 || cursor.row >= LCD_ROWS) return;

    const line = lines[cursor.row] ?? " ".repeat(LCD_COLUMNS);
    const before = line.slice(0, cursor.col);
    const written = text.slice(0, Math.max(0, LCD_COLUMNS - cursor.col));
    const after = line.slice(cursor.col + written.length);
    lines[cursor.row] = (before + written + after).slice(0, LCD_COLUMNS);

    this.lcdText.set(instance, lines);
    this.lcdCursor.set(instance, { col: cursor.col + written.length, row: cursor.row });
  }

  /** Ekranning ko'rinish holati — e'lon qilinmagan bo'lsa, yoqilgan deb hisoblanadi. */
  private lcdViewOf(instance: string): { on: boolean; cursor: boolean; blink: boolean } {
    return this.lcdView.get(instance) ?? { on: true, cursor: false, blink: false };
  }

  /* ─────────────── LCD: sxema bilan bog'lash ─────────────── */

  /** Boshqaruv pinlari e'londagi tartibda — [RS, E, D4…D7]. */
  private static readonly LCD_CONTROL_PINS = ["rs", "e", "d4", "d5", "d6", "d7"] as const;

  /**
   * Sxemadagi displey qaysi Arduino pinlariga ulangan.
   *
   * Har element — plata pini raqami yoki `null` (sim yo'q).
   */
  private lcdWiring(nodeId: string): (number | null)[] {
    return Simulator.LCD_CONTROL_PINS.map((pinId) => boardPinFor(this.netlist, nodeId, pinId));
  }

  /**
   * Kodda e'lon qilingan qaysi `LiquidCrystal` obyekti SHU ekranga ulangan
   * (§46).
   *
   * Ilgari faqat RS pini solishtirilardi. Bu yetarli emas edi: E yoki
   * D4–D7 simi boshqa pinga tushib qolsa ham matn ekranda ko'rinaverardi
   * va bola xatosini SEZMASDAN darsni davom ettirardi. Haqiqiy modulda
   * bunday ulanishda ekran jim qoladi. Endi OLTALA pin ham mos kelishi
   * shart — ya'ni `LiquidCrystal lcd(12, 11, 5, 4, 3, 2)` yozilgan bo'lsa,
   * simlar ham aynan o'sha pinlarga borishi kerak.
   */
  private lcdInstanceFor(nodeId: string): string | null {
    const wiring = this.lcdWiring(nodeId);
    if (wiring.some((pin) => pin === null)) return null;

    for (const [instance, declared] of this.lcdPins) {
      if (wiring.every((pin, i) => declared[i] === pin)) return instance;
    }
    return null;
  }

  /**
   * Orqa yoritish (A/K oyoqlari).
   *
   * A yoki K ga sim tortilgan bo'lsa — HAQIQIY ulanish hal qiladi: anod
   * 5V da, katod yerda bo'lsagina yoritish yonadi. Ikkalasi ham bo'sh
   * bo'lsa, eski sxemalar uchun inspektordagi katakcha ishlaydi: ilgari
   * bu oyoqlar umuman yo'q edi va ularsiz yig'ilgan darslar qorong'i
   * ekran bilan qolib ketardi (§29).
   */
  private lcdBacklight(node: CircuitNode): boolean {
    const wired = isPinWired(this.netlist, node.id, "a") || isPinWired(this.netlist, node.id, "k");
    if (!wired) return node.settings.backlight !== false;
    return isPowered(this.netlist, node.id, "a") && isGrounded(this.netlist, node.id, "k");
  }

  /**
   * Kontrast (0 — belgilar ko'rinmaydi, 1 — to'q va aniq).
   *
   * VO oyog'idagi kuchlanishdan olinadi: haqiqiy modulda u yerga yaqin
   * bo'lganda belgilar to'q, 5V ga yaqinlashganda esa ekran bo'shdek
   * ko'rinadi. Aynan shu sababli darsliklarda VO ga potensiometr ulanadi —
   * endi laboratoriyada ham murvatni burash matnni xiralashtiradi.
   *
   * Sim yo'q bo'lsa o'qilarli qiymat qaytadi: bola VO haqida bilmasdan
   * yig'gan sxema ham ishlashi kerak.
   */
  private lcdContrast(nodeId: string): number {
    if (!isPinWired(this.netlist, nodeId, "vo")) return LCD_DEFAULT_CONTRAST;
    const volts = this.voltageOfNet(netFor(this.netlist, nodeId, "vo"));
    if (volts === null) return LCD_DEFAULT_CONTRAST;
    return Math.max(0, Math.min(1, 1 - volts / 5));
  }

  /** Displeyning ko'rinadigan holati: matn, quvvat, yoritish, kontrast. */
  private lcdRuntime(node: CircuitNode): ComponentRuntimeState {
    const powered =
      isPowered(this.netlist, node.id, "vcc") && isGrounded(this.netlist, node.id, "gnd");
    const instance = powered ? this.lcdInstanceFor(node.id) : null;
    const view = instance === null ? null : this.lcdViewOf(instance);
    const cursor = instance === null ? undefined : this.lcdCursor.get(instance);

    /*
     * Sxema to'liq ulangan, lekin kodda mos e'lon yo'q — eng chalkash
     * holat: ekran qorong'i, sabab esa ko'rinmaydi. Shuning uchun jurnalga
     * SXEMADAGI ulanish yozib qo'yiladi va bola kodidagi raqamlar bilan
     * solishtira oladi.
     */
    if (powered && instance === null && this.lcdPins.size > 0) {
      const wiring = this.lcdWiring(node.id);
      if (wiring.every((pin) => pin !== null)) {
        this.warnOnce(
          `lcd-mismatch:${node.id}`,
          `LCD: koddagi LiquidCrystal(...) pinlari sxemaga mos emas. Sxemada: ${Simulator.LCD_CONTROL_PINS.map(
            (id, i) => `${id.toUpperCase()}→${wiring[i]}`,
          ).join(", ")}.`,
        );
      }
    }

    return {
      // `noDisplay()` matnni berkitadi, lekin o'chirmaydi.
      lines: instance !== null && view?.on !== false ? (this.lcdText.get(instance) ?? []) : [],
      powered,
      backlight: this.lcdBacklight(node),
      contrast: this.lcdContrast(node.id),
      cursorVisible: view?.cursor === true,
      cursorBlink: view?.blink === true,
      cursorCol: cursor?.col,
      cursorRow: cursor?.row,
    };
  }

  /**
   * `lcd.*` chaqiruvi. Qo'llab-quvvatlanmagan bezak metodlari (matnni
   * siljitish, avtoskroll) jim o'tkazib yuboriladi — ular ekrandagi
   * matnga ta'sir qilmaydi, lekin kod ularsiz ham ishlashi kerak.
   */
  private callLcd(instance: string, method: string, args: (number | string)[]): number | string {
    switch (method) {
      /*
       * Ko'rinish buyruqlari matnga TEGMAYDI.
       *
       * `noDisplay()` dan keyin `display()` chaqirilsa, ekranda o'sha-o'sha
       * matn qaytadi — HD44780 kontrollerida ham yozuv xotirada qoladi.
       */
      case "display":
      case "noDisplay":
      case "cursor":
      case "noCursor":
      case "blink":
      case "noBlink": {
        const view = this.lcdViewOf(instance);
        this.lcdView.set(instance, {
          on: method === "display" ? true : method === "noDisplay" ? false : view.on,
          cursor: method === "cursor" ? true : method === "noCursor" ? false : view.cursor,
          blink: method === "blink" ? true : method === "noBlink" ? false : view.blink,
        });
        return 0;
      }
      case "begin":
        this.lcdText.set(instance, this.lcdBlank());
        this.lcdCursor.set(instance, { col: 0, row: 0 });
        // `begin()` kontrollerni boshlang'ich holatga qaytaradi: ekran
        // yoqiladi, kursor esa ko'rinmaydi.
        this.lcdView.set(instance, { on: true, cursor: false, blink: false });
        return 0;
      case "clear":
        this.lcdText.set(instance, this.lcdBlank());
        this.lcdCursor.set(instance, { col: 0, row: 0 });
        return 0;
      case "home":
        this.lcdCursor.set(instance, { col: 0, row: 0 });
        return 0;
      case "setCursor": {
        const col = Math.trunc(this.toNumber(args[0] ?? 0));
        const row = Math.trunc(this.toNumber(args[1] ?? 0));
        this.lcdCursor.set(instance, {
          col: Math.max(0, Math.min(LCD_COLUMNS - 1, col)),
          row: Math.max(0, Math.min(LCD_ROWS - 1, row)),
        });
        return 0;
      }
      case "print":
      case "write": {
        const value = args[0];
        const text =
          typeof value === "number" && !Number.isInteger(value)
            ? value.toFixed(2)
            : this.toText(value ?? "");
        this.lcdPrint(instance, text);
        return text.length;
      }
      default:
        return 0;
    }
  }

  /**
   * Ro'yxatdagi DHT obyektiga mos sxemadagi sensor.
   *
   * Kodda pin to'g'ri yozilgan bo'lsa ham, sim ulanmagan bo'lishi mumkin —
   * shuning uchun quvvat va yer ham tekshiriladi. Haqiqiy sensor ham shunda
   * qiymat bermaydi.
   */
  private dhtNodeFor(instance: string): CircuitNode | null {
    const pin = this.dhtPins.get(instance);
    if (pin === undefined) return null;
    for (const node of this.options.circuit.nodes) {
      if (node.type !== "dht11") continue;
      if (boardPinFor(this.netlist, node.id, "data") !== pin) continue;
      if (!isPowered(this.netlist, node.id, "vcc") || !this.sensorGrounded(node.id)) {
        continue;
      }
      return node;
    }
    return null;
  }

  private callDht(instance: string, method: string): number | string {
    if (method === "begin") return 0;
    if (method !== "readTemperature" && method !== "readHumidity") return 0;

    const node = this.dhtNodeFor(instance);
    if (!node) {
      const key = `dht:${instance}`;
      if (!this.warned.has(key)) {
        this.warned.add(key);
        this.log(
          "warning",
          `${instance}: DHT11 sensori topilmadi — pin, 5V va GND ulanishini tekshiring.`,
        );
      }
      return 0;
    }

    /*
     * DHT11 da ikkita qiymat bor, `sensors` jadvali esa bitta son saqlaydi —
     * shuning uchun bu sensor faqat inspektor sozlamalaridan o'qiladi.
     */
    if (method === "readTemperature") {
      return typeof node.settings.temperature === "number"
        ? node.settings.temperature
        : DHT11_DEFAULTS.temperature;
    }
    return typeof node.settings.humidity === "number"
      ? node.settings.humidity
      : DHT11_DEFAULTS.humidity;
  }

  /**
   * `attachInterrupt()` — uzilishni ro'yxatga oladi.
   *
   * Uzilishlar so'rov (polling) orqali taqlid qilinadi: har kadr boshida
   * pin darajasi tekshiriladi va kerakli o'tishda funksiya chaqiriladi.
   * Haqiqiy uzilishdan farqi — u `loop()` ning o'rtasida emas, kadr
   * chegarasida ishlaydi; o'quv sxemalari uchun bu sezilmaydi.
   */
  private attachInterrupt(expr: Expression & { kind: "call" }): number {
    const pin = Math.trunc(
      this.toNumber(this.evaluate(expr.args[0] ?? { kind: "number", value: 0 })),
    );
    this.assertPin(pin, "attachInterrupt");

    const handler = expr.args[1];
    const handlerName = handler?.kind === "identifier" ? handler.name : null;
    if (!handlerName || !this.options.sketch.functions[handlerName]) {
      throw new RuntimeError(
        "attachInterrupt() uchun mavjud funksiya nomi kerak: attachInterrupt(2, tugmaBosildi, FALLING);",
      );
    }

    const modeArg = expr.args[2];
    const mode =
      modeArg?.kind === "identifier" && (modeArg.name === "RISING" || modeArg.name === "FALLING")
        ? modeArg.name
        : "CHANGE";

    this.interrupts.set(pin, { handler: handlerName, mode, last: this.readDigital(pin) });
    return 0;
  }

  /** Keyingi tasodifiy son (0…1). xorshift — tez va urug'lanadi. */
  private nextRandom(): number {
    let x = this.randomState || 1;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.randomState = x >>> 0;
    return this.randomState / 0x100000000;
  }

  /** Argumentni bitta belgiga aylantiradi (`'a'` ham, 97 ham keladi). */
  private charOf(value: number | string | undefined): string {
    if (typeof value === "number") return String.fromCharCode(Math.trunc(value));
    const text = this.toText(value ?? "");
    return text.length > 0 ? text[0]! : "";
  }

  /**
   * Uzilishlarni tekshiradi.
   *
   * Har qadamda kuzatilayotgan pinlarning darajasi solishtiriladi va
   * kerakli o'tish yuz bergan bo'lsa, bog'langan funksiya chaqiriladi.
   */
  private pollInterrupts() {
    if (this.interrupts.size === 0) return;
    for (const [pin, watch] of this.interrupts) {
      const level = this.readDigital(pin);
      if (level === watch.last) continue;
      const rising = watch.last === 0 && level === 1;
      const falling = watch.last === 1 && level === 0;
      watch.last = level;
      const fire =
        watch.mode === "CHANGE" ||
        (watch.mode === "RISING" && rising) ||
        (watch.mode === "FALLING" && falling);
      if (!fire) continue;
      const fn = this.options.sketch.functions[watch.handler];
      if (!fn) continue;
      try {
        this.callUserFunctionSync({ kind: "call", callee: watch.handler, args: [] });
      } catch {
        // Uzilish ichidagi xato butun simulyatsiyani to'xtatmasin.
      }
    }
  }

  /**
   * Sensor modulining zanjiri yopiqmi.
   *
   * Uch pinli modul sifatida u `gnd` pinini kutadi. Lekin darsliklarda
   * LDR va termistor KO'PINCHA ikki uchli detal sifatida, kuchlanish
   * bo'luvchi bo'lib ulanadi: 5V → sensor → rezistor → GND. Bunda
   * sensorning o'z `gnd` pini bo'sh qoladi, yerga qaytish yo'li esa
   * signal chizig'idan rezistor orqali ketadi.
   *
   * Ilgari bunday sxemada `analogRead()` jimgina 0 qaytarardi — bola
   * to'g'ri yig'sa ham natija ko'rmasdi. Endi ikkala ulash ham qabul
   * qilinadi.
   */
  private sensorGrounded(nodeId: string): boolean {
    if (isGrounded(this.netlist, nodeId, "gnd")) return true;
    // Rezistor sensorning `gnd` tomonida ham, signal tomonida ham turishi
    // mumkin — ikkalasi ham to'g'ri kuchlanish bo'luvchi.
    if (resistanceToGround(this.netlist, nodeId, "gnd") !== null) return true;
    return resistanceToGround(this.netlist, nodeId, "signal") !== null;
  }

  private assertPin(pin: number, fn: string) {
    if (!Number.isInteger(pin) || pin < 0 || pin > ANALOG_PIN_BASE + 5) {
      throw new RuntimeError(`${fn}() funksiyasida noto'g'ri pin: ${pin}`);
    }
  }

  private recordPinDrive(pin: number, value: number) {
    const list = value === 1 ? this.observed.pinsDrivenHigh : this.observed.pinsDrivenLow;
    if (!list.includes(pin)) list.push(pin);

    // Pin holati o'zgardi — oldingi elektr yechimi endi eskirgan.
    this.invalidateSolution();

    // Pin o'zgargani rele kontaktini almashtirgan bo'lishi mumkin.
    this.syncRelays();

    // Takt fronti aynan shu yerda sodir bo'ladi: `shiftOut()` ham,
    // qo'lda yozilgan `digitalWrite(clock, HIGH)` ham shu yo'ldan o'tadi.
    this.stepDigitalLayer();

    // LED yonib-o'chishini sanaymiz (dars tekshiruvi uchun).
    const on = this.computeLedOn();
    if (this.lastLedOn !== null && on !== this.lastLedOn) this.observed.ledToggles += 1;
    this.lastLedOn = on;
  }

  /**
   * Raqamli chiplarni bir qadam oldinga suradi.
   *
   * Holat o'zgargan bo'lsagina elektr yechimi bekor qilinadi — aks holda
   * har bir `digitalWrite` butun sxemani qayta hisoblashga majbur qilardi.
   */
  private stepDigitalLayer() {
    if (Object.keys(this.digital).length === 0) return;
    const next = stepDigital(this.options.circuit, this.netlist, this.board, this.digital);

    let changed = false;
    for (const [id, state] of Object.entries(next)) {
      const prev = this.digital[id];
      if (
        !prev ||
        prev.enabled !== state.enabled ||
        prev.latch.some((bit, i) => bit !== state.latch[i]) ||
        prev.shift.some((bit, i) => bit !== state.shift[i])
      ) {
        changed = true;
        break;
      }
    }

    this.digital = next;
    if (changed) this.invalidateSolution();
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
    // Raqamli chiqishli sensor (PIR va h.k.) shu pinga ulanganmi.
    for (const node of this.options.circuit.nodes) {
      const spec = DIGITAL_OUTPUT_SENSORS[node.type];
      if (!spec) continue;
      if (boardPinFor(this.netlist, node.id, spec.out) !== pin) continue;
      if (!isPowered(this.netlist, node.id, "vcc") || !this.sensorGrounded(node.id)) {
        continue;
      }
      return spec.read(node.settings, this.options.sensors[node.id]);
    }

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
      /*
       * Bo'shatilgan tugmada pin SXEMADAGI kuchlanishni ko'radi.
       *
       * Ilgari bu yerda `board.digital[pin]` qaytarilardi — ya'ni tashqi
       * pull-up rezistori bilan ulangan tugma (5V → 10 kΩ → pin, pin →
       * tugma → GND) bo'shatilgan holatda ham "0" o'qilardi. Bola
       * `if (digitalRead(2) == LOW)` yozsa, kod tugmaga tegmasdan doim
       * ishlab turardi. Pastdagi umumiy yo'l shu holatni to'g'ri
       * hisoblaydi, shuning uchun bu shox uzilib qolmaydi.
       */
      if (!pressed) break;
      return isPowered(releasedNetlist, node.id, otherSide) ? 1 : 0;
    }

    /*
     * Umumiy holat: pin turgan tugundagi HAQIQIY kuchlanish.
     *
     * Klaviatura matritsasi, joystik tugmasi, siljitish registri chiqishi —
     * bularning hech biri alohida "sensor" emas, ular oddiy elektr
     * ulanishlar. Ilgari bu yerda `board.digital` qaytarilardi, ya'ni pin
     * kirish rejimida bo'lsa ham FAQAT o'zi yozgan qiymatni ko'rardi va
     * sxemadan kelgan signal butunlay e'tiborsiz qolardi.
     */
    const mode = this.board.modes[pin];
    /*
     * `undefined` ham KIRISH hisoblanadi.
     *
     * Haqiqiy Arduino'da pin sukut bo'yicha INPUT: `pinMode()` yozilmasa
     * ham `digitalRead()` sxemadagi kuchlanishni o'qiydi. Ilgari bu yerda
     * `mode === undefined` holati tashlab ketilardi va pastdagi
     * `board.digital[pin] ?? 0` qaytarardi — ya'ni 5V ga rezistor orqali
     * ulangan pin ham "0" bo'lib chiqardi va bola sxemasi to'g'ri bo'lsa
     * ham kod ishlamasdi.
     */
    if (mode === "input" || mode === "input_pullup" || mode === undefined) {
      const volts = this.voltageOfNet(this.netlist.boardPinNets.get(pin) ?? null);
      // TTL chegarasi: 2.5 V dan yuqorisi HIGH.
      if (volts !== null) return volts >= 2.5 ? 1 : 0;
      if (mode === "input_pullup") return 1;
      /*
       * Ulanmagan pin.
       *
       * `pinMode` chaqirilmagan bo'lsa oxirgi YOZILGAN qiymat qaytadi:
       * bola `analogWrite(13, 200)` yozgan bo'lsa (haqiqiy Arduino'da u
       * pinni o'zi OUTPUT qiladi), pin yoqilgan bo'lib ko'rinishi kerak.
       * Sof INPUT rejimida esa ulanmagan pin noaniq — 0.
       */
      if (mode === undefined) return this.board.digital[pin] ?? 0;
      return 0;
    }
    return this.board.digital[pin] ?? 0;
  }

  private readAnalog(pin: number): number {
    // Analog pinga ulangan sensor qiymatini registr orqali qaytaramiz.
    for (const node of this.options.circuit.nodes) {
      const spec = ANALOG_SENSORS[node.type];
      if (!spec) continue;
      if (boardPinFor(this.netlist, node.id, spec.signal) !== pin) continue;
      if (!isPowered(this.netlist, node.id, "vcc") || !this.sensorGrounded(node.id)) {
        return 0;
      }
      const adc = spec.toAdc(node.settings, this.options.sensors[node.id]);
      return Math.max(0, Math.min(1023, Math.round(adc)));
    }

    /*
     * Jadvalda yo'q bo'lsa — pin turgan tugundagi haqiqiy kuchlanish
     * o'lchanadi va 0–5 V oralig'i 0–1023 ga o'giriladi (haqiqiy ADC kabi).
     *
     * Joystik aynan shu yo'ldan o'qiladi: uning o'qlari — oddiy kuchlanish
     * bo'luvchi, ya'ni qiymat sxemadan chiqadi. Shu sabab 5V ni ulashni
     * unutgan bo'lsa, natija ham 0 bo'ladi — xuddi haqiqiy modulda.
     */
    const volts = this.voltageOfNet(this.netlist.boardPinNets.get(pin) ?? null);
    if (volts === null) return 0;
    return Math.max(0, Math.min(1023, Math.round((volts / 5) * 1023)));
  }

  private readPulse(pin: number, value: number): number {
    this.assertPin(pin, "pulseIn");
    if (value === 0) return 0;

    for (const node of this.options.circuit.nodes) {
      if (node.type !== "ultrasonic") continue;
      if (boardPinFor(this.netlist, node.id, "echo") !== pin) continue;
      if (!isPowered(this.netlist, node.id, "vcc") || !this.sensorGrounded(node.id)) {
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

  /* ─────────────── Elektr yechimi ─────────────── */

  /**
   * Sxemaning joriy yechimi (tugun kuchlanishlari va element toklari).
   *
   * Keshlanadi: bitta kadrda LED yorqinligi, multimetr va simlar bir necha
   * marta so'raladi, sxema esa o'zgarmaydi. Kesh faqat elektr holati
   * o'zgarganda tozalanadi — pin yozilganda, rele ishlaganda yoki sensor
   * qiymati almashganda.
   */
  private solution: SolveResult | null = null;
  private solverElements: SolverElement[] = [];

  private invalidateSolution() {
    this.solution = null;
  }

  private solve(): SolveResult {
    if (this.solution) return this.solution;
    const built = buildElements(
      this.options.circuit,
      this.netlist,
      this.board,
      this.options.sensors,
      this.digital,
    );
    this.solverElements = built.elements;
    this.solution = solveCircuit(built.elements, this.netlist.groundNets);
    return this.solution;
  }

  /** Element orqali o'tayotgan tok (A). */
  private currentOf(elementId: string): number {
    return this.solve().current.get(elementId) ?? 0;
  }

  /**
   * LED yorqinligi 0–1.
   *
   * Endi bu o'lchov emas, hisob: yechuvchi bergan HAQIQIY tok nominal
   * (5 V + 220 Ω) tokka nisbatan olinadi. Shu tufayli parallel ulangan
   * LEDlar, bir nechta batareya va kuchlanish bo'luvchi to'g'ri ishlaydi —
   * ilgari ular "eng qisqa yo'l" taxminiga tayanardi va xato berardi.
   *
   * PWM alohida ko'paytiriladi: yechim to'liq 5 V uchun, haqiqiy pin esa
   * shu kuchlanishni tez o'chirib-yoqadi va ko'z o'rtachasini ko'radi.
   */
  private ledBrightness(nodeId: string): number {
    const amps = this.currentOf(nodeId);
    if (amps <= 0) return 0;

    let duty = 1;
    const anodePin = boardPinFor(this.netlist, nodeId, "anode");
    if (anodePin !== null && this.board.modes[anodePin] === "output") {
      duty = (this.board.pwm[anodePin] ?? 0) / 255;
    }

    // Yaxlitlash: yechuvchi 0.9999998 kabi qiymat berishi mumkin, ekranda
    // esa bu "to'liq yorqinlik emas" degan taassurot qoldirardi.
    const level = Math.max(0, Math.min(1, (duty * amps) / LED_FULL_CURRENT));
    return Math.round(level * 1000) / 1000;
  }

  private outputLevel(pinId: string, nodeId: string): number {
    const pin = boardPinFor(this.netlist, nodeId, pinId);
    if (pin === null || this.board.modes[pin] !== "output") return 0;
    return Math.max(0, Math.min(1, (this.board.pwm[pin] ?? 0) / 255));
  }

  /**
   * Elektr tugunining kuchlanishi (V).
   *
   * Birinchi navbatda yechuvchining javobi olinadi — u haqiqiy sxemani
   * hisoblagan. Tugun yechimda bo'lmasa (unga birorta element ulanmagan,
   * masalan bo'sh breadboard ustuni) eski, taxminiy qoidalarga tushiladi:
   * ular hech bo'lmasa "yerga ulangan" yoki "5V relsda" degan javobni
   * beradi.
   */
  private voltageOfNet(netId: string | null): number | null {
    if (netId === null) return null;

    const solved = this.solve().voltage.get(netId);
    if (solved !== undefined) return solved;

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
    // Haqiqiy multimetr ham ikki xonagacha ko'rsatadi.
    return Math.round((plus - minus) * 100) / 100;
  }

  /* ─────────────── Tok oqimi ─────────────── */

  /**
   * Har bir simdagi tok.
   *
   * Ilgari bu savolga "tugun manbaga ham, yerga ham yetib boradimi?" degan
   * grafik tekshiruv javob berardi. Endi javob yechuvchidan olinadi:
   * simning tugunidagi elementlar orqali qancha amper o'tayotgani aniq
   * ma'lum, shuning uchun "yetib boradi, lekin tok yo'q" degan yolg'on
   * hollar (masalan ikkala uchi ham 5 V da turgan sim) yo'qoladi.
   *
   * Yo'nalish faqat ANIQ bo'lganda ko'rsatiladi. Simning ikki uchi bitta
   * tugunda va ularning kuchlanishi teng — yo'nalish simning o'zidan emas,
   * uchlariga ulangan elementlardan kelib chiqadi. Tugunda ikkitadan ortiq
   * nuqta bo'lsa (masalan breadboard ustuni), tok qaysi shoxga qanchadan
   * bo'linishini bitta sim bo'yicha aytib bo'lmaydi — bunda yo'nalish
   * ko'rsatilmaydi.
   */
  getWireFlow(): Record<string, WireFlow> {
    const solution = this.solve();
    const out: Record<string, WireFlow> = {};

    /* Tugunga ulangan uchlar: qaysi komponent qancha tok BERAYOTGANI. */
    const terminals = new Map<string, { nodeId: string; injected: number }[]>();
    const push = (netId: string, nodeId: string, injected: number) => {
      const list = terminals.get(netId);
      if (list) list.push({ nodeId, injected });
      else terminals.set(netId, [{ nodeId, injected }]);
    };

    for (const el of this.solverElements) {
      const amps = solution.current.get(el.id) ?? 0;
      const owner = el.id.split(":")[0] ?? el.id;
      // Tok `a` dan `b` ga oqadi: `a` tugunidan chiqadi, `b` tuguniga kiradi.
      push(el.a, owner, -amps);
      push(el.b, owner, amps);
    }

    /** Tugundagi eng katta tok (A) — ketma-ket zanjirda bu halqa toki. */
    const netCurrent = new Map<string, number>();
    for (const [netId, list] of terminals) {
      let peak = 0;
      for (const t of list) peak = Math.max(peak, Math.abs(t.injected));
      netCurrent.set(netId, peak);
    }

    /*
     * Komponent orqali o'tayotgan eng katta tok.
     *
     * Sim tugunning bir qismi, lekin undagi tok tugunning umumiy tokidan
     * kichik bo'lishi mumkin: multimetr zondi 31 mA oqayotgan tugunga
     * ulansa ham, zondning o'zidan mikroamperlar o'tadi. Shuning uchun
     * simning toki uning IKKI UCHIDAGI komponentlar toki bilan ham
     * cheklanadi.
     *
     * Elementi yo'q komponentlar (breadboard, GND belgisi) — o'tkazgich:
     * ular tokni cheklamaydi, faqat uzatadi.
     */
    const nodeCurrent = new Map<string, number>();
    for (const el of this.solverElements) {
      const owner = el.id.split(":")[0] ?? el.id;
      const amps = Math.abs(solution.current.get(el.id) ?? 0);
      nodeCurrent.set(owner, Math.max(nodeCurrent.get(owner) ?? 0, amps));
    }
    const throughNode = (nodeId: string) => nodeCurrent.get(nodeId) ?? Infinity;

    for (const wire of this.options.circuit.wires) {
      const netId = netFor(this.netlist, wire.from.nodeId, wire.from.pinId);
      if (netId === null) continue;

      const amps = Math.min(
        netCurrent.get(netId) ?? 0,
        throughNode(wire.from.nodeId),
        throughNode(wire.to.nodeId),
      );
      if (amps < LIVE_CURRENT_THRESHOLD) continue;

      let direction: WireFlow["direction"] = 0;
      const pins = this.netlist.pinsOf.get(netId) ?? [];
      const list = terminals.get(netId) ?? [];
      if (pins.length === 2 && list.length === 2) {
        const from = list.find((t) => t.nodeId === wire.from.nodeId);
        const to = list.find((t) => t.nodeId === wire.to.nodeId);
        if (from && to && Math.sign(from.injected) === -Math.sign(to.injected)) {
          direction = from.injected > 0 ? 1 : -1;
        }
      }

      out[wire.id] = { milliamps: amps * 1000, direction };
    }

    return out;
  }

  /** Har bir komponentning ko'rinadigan holati. */
  getRuntimeState(): Record<string, ComponentRuntimeState> {
    const out: Record<string, ComponentRuntimeState> = {};
    this.syncRelays();

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
        if (!isPowered(this.netlist, node.id, "vcc") || !this.sensorGrounded(node.id)) {
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

      if (node.type === "dc-motor") {
        // Ikki terminal orasidagi kuchlanish farqiga qarab aylanadi.
        const v1 = this.voltageOfNet(netFor(this.netlist, node.id, "t1"));
        const v2 = this.voltageOfNet(netFor(this.netlist, node.id, "t2"));
        const diff = (v1 ?? 0) - (v2 ?? 0);
        const nominal =
          typeof node.settings.nominalVoltage === "number" ? node.settings.nominalVoltage : 5;
        const speed = Math.max(0, Math.min(1, Math.abs(diff) / Math.max(1, nominal)));
        out[node.id] = {
          active: speed > 0.02,
          speed,
          direction: diff >= 0 ? 1 : -1,
        };
        continue;
      }

      if (node.type === "relay") {
        out[node.id] = { active: this.relayState.get(node.id) === true };
        continue;
      }

      if (node.type === "lcd1602") {
        out[node.id] = this.lcdRuntime(node);
        continue;
      }

      if (node.type === "dht11") {
        out[node.id] = {
          active:
            isPowered(this.netlist, node.id, "vcc") && isGrounded(this.netlist, node.id, "gnd"),
        };
        continue;
      }

      if (node.type === "multimeter") {
        out[node.id] = { voltage: this.measuredVoltage(node.id) };
        continue;
      }

      /* ───────── Faza B ───────── */

      if (node.type === "diode") {
        // Tok belgisi anoddan katodga: musbat bo'lsa diod ochilgan.
        const amps = this.currentOf(node.id);
        out[node.id] = {
          forward: amps > 1e-6,
          milliamps: Math.round(Math.abs(amps) * 100000) / 100,
          acrossVolts: this.acrossVolts(node.id, "a", "k") ?? undefined,
        };
        continue;
      }

      if (node.type === "capacitor") {
        const across = this.acrossVolts(node.id, "plus", "minus");
        out[node.id] = {
          acrossVolts: across ?? undefined,
          // O'rnashgan holatda kondensator orqali tok o'tmaydi.
          milliamps: 0,
          // Qutbli kondensator uchun "+" uchi pastroq kuchlanishda bo'lsa xato.
          forward: across === null ? true : across >= -0.05,
        };
        continue;
      }

      if (node.type === "npn-transistor") {
        const collectorAmps = Math.abs(this.currentOf(node.id));
        const baseAmps = Math.abs(this.currentOf(`${node.id}:be`));
        const beta = typeof node.settings.beta === "number" ? node.settings.beta : 100;
        /*
         * Holatni baza toki bilan solishtirib aniqlaymiz. Kollektor toki
         * β·Ib dan kam bo'lsa tranzistor chiziqli sohada, unga yetgan yoki
         * oshgan bo'lsa to'yingan — haqiqiy tranzistordagi kabi.
         */
        const state: "off" | "active" | "saturated" =
          baseAmps < 1e-6 || collectorAmps < 1e-6
            ? "off"
            : collectorAmps >= beta * baseAmps * 0.95
              ? "saturated"
              : "active";
        out[node.id] = {
          transistor: state,
          milliamps: Math.round(collectorAmps * 100000) / 100,
          baseMilliamps: Math.round(baseAmps * 100000) / 100,
          acrossVolts: this.acrossVolts(node.id, "b", "e") ?? undefined,
        };
        continue;
      }

      if (node.type === "joystick") {
        out[node.id] = {
          axisX: typeof node.settings.x === "number" ? node.settings.x : 0,
          axisY: typeof node.settings.y === "number" ? node.settings.y : 0,
          pressed: node.settings.pressed === true,
          active:
            isPowered(this.netlist, node.id, "vcc") && isGrounded(this.netlist, node.id, "gnd"),
        };
        continue;
      }

      if (node.type === "seven-segment") {
        /*
         * Har bir segment alohida LED, shuning uchun yonish holati ham
         * o'sha LEDdan o'tgan haqiqiy tokdan olinadi — oldindan yozilgan
         * "raqam" emas. Raqam esa aksincha: yonayotgan segmentlardan
         * KELIB CHIQADI.
         */
        const segments: Record<string, boolean> = {};
        let total = 0;
        for (const segment of ["a", "b", "c", "d", "e", "f", "g", "dp"]) {
          const amps = Math.abs(this.currentOf(`${node.id}:${segment}`));
          segments[segment] = amps > 0.0005;
          total += amps;
        }
        out[node.id] = {
          segments,
          digit: digitForSegments(segments),
          milliamps: Math.round(total * 100000) / 100,
        };
        continue;
      }

      if (node.type === "shift-register") {
        const state = this.digital[node.id];
        out[node.id] = {
          shiftBits: state ? [...state.shift] : [],
          latchBits: state ? [...state.latch] : [],
          active: state?.enabled === true,
          powered:
            isPowered(this.netlist, node.id, "vcc") && isGrounded(this.netlist, node.id, "gnd"),
        };
        continue;
      }

      if (node.type === "keypad-4x4") {
        const key = typeof node.settings.key === "string" ? node.settings.key : "";
        out[node.id] = { key: key === "" ? null : key, pressed: key !== "" };
        continue;
      }

      if (node.type === "l298n") {
        out[node.id] = {
          channelA: this.motorChannelState(node, "ena", "in1", "in2", "out1", "out2"),
          channelB: this.motorChannelState(node, "enb", "in3", "in4", "out3", "out4"),
          powered: isGrounded(this.netlist, node.id, "gnd"),
        };
        continue;
      }
    }

    return out;
  }

  /**
   * Ikki pin orasidagi kuchlanish farqi (V). Tugun yechimda bo'lmasa `null`.
   */
  private acrossVolts(nodeId: string, aPin: string, bPin: string): number | null {
    const a = this.voltageOfNet(netFor(this.netlist, nodeId, aPin));
    const b = this.voltageOfNet(netFor(this.netlist, nodeId, bPin));
    if (a === null || b === null) return null;
    return Math.round((a - b) * 100) / 100;
  }

  /**
   * L298N kanalining holati.
   *
   * Tezlik motorning O'ZIDAN o'qiladi: OUT uchlariga ulangan DC motor
   * elementidan o'tgan tok nominal tokka nisbatan olinadi. Shuning uchun
   * motorni ulashni unutgan bo'lsa tezlik 0 bo'ladi va PWM ham, yo'nalish
   * ham buni yashira olmaydi.
   */
  private motorChannelState(
    node: CircuitNode,
    enPin: string,
    aPin: string,
    bPin: string,
    outA: string,
    outB: string,
  ): { speed: number; direction: number; mode: MotorDriverMode } {
    const level = (pinId: string) => {
      const pin = boardPinFor(this.netlist, node.id, pinId);
      if (pin === null || this.board.modes[pin] !== "output") return { high: false, duty: 0 };
      const pwm = this.board.pwm[pin] ?? 0;
      if (pwm > 0) return { high: true, duty: Math.min(1, pwm / 255) };
      const high = (this.board.digital[pin] ?? 0) === 1;
      return { high, duty: high ? 1 : 0 };
    };

    const enableConnected = boardPinFor(this.netlist, node.id, enPin) !== null;
    const enable = enableConnected ? level(enPin) : { high: true, duty: 1 };
    const { mode, direction, duty } = motorDriverChannel(
      level(aPin).high,
      level(bPin).high,
      enable.duty,
    );

    // OUT uchlariga ulangan motorni topamiz va uning tokini o'lchaymiz.
    const outNetA = netFor(this.netlist, node.id, outA);
    const outNetB = netFor(this.netlist, node.id, outB);
    let speed = 0;
    if (outNetA !== null && outNetB !== null) {
      for (const other of this.options.circuit.nodes) {
        if (other.type !== "dc-motor") continue;
        const t1 = netFor(this.netlist, other.id, "t1");
        const t2 = netFor(this.netlist, other.id, "t2");
        const matches = (t1 === outNetA && t2 === outNetB) || (t1 === outNetB && t2 === outNetA);
        if (!matches) continue;
        const amps = Math.abs(this.currentOf(other.id));
        // 12 V / 60 Ω ≈ 0.2 A — to'liq tezlik uchun mos nominal.
        speed = Math.min(1, amps / 0.2) * duty;
        break;
      }
    }

    return { speed: Math.round(speed * 1000) / 1000, direction, mode };
  }

  /* ─────────────── Bajarish (generator) ─────────────── */

  private *execBlock(stmts: Statement[]): Generator<Signal, void, void> {
    for (const stmt of stmts) yield* this.execStatement(stmt);
  }

  private *execStatement(stmt: Statement): Generator<Signal, void, void> {
    yield { type: "op" };

    switch (stmt.kind) {
      case "declare": {
        /*
         * Kutubxona obyektlari (`LiquidCrystal lcd(12, 11, 5, 4, 3, 2);`)
         * oddiy o'zgaruvchi emas — ular qaysi pinlarga ulanganini eslab
         * qolishimiz kerak, aks holda `lcd.print()` qaysi ekranda
         * yozayotganini bilib bo'lmaydi.
         */
        if (stmt.value?.kind === "call" && stmt.value.callee === stmt.valueType) {
          this.declareLibraryObject(stmt.name, stmt.valueType, stmt.value.args);
          return;
        }
        const value = stmt.value ? this.evaluate(stmt.value) : 0;
        this.currentScope().set(stmt.name, this.coerceType(stmt.valueType, value));
        return;
      }

      case "declareArray": {
        const elements = stmt.elements ? stmt.elements.map((e) => this.evaluate(e)) : [];
        let size = elements.length;
        if (stmt.sizeExpr) {
          const declared = Math.trunc(this.toNumber(this.evaluate(stmt.sizeExpr)));
          if (declared > size) size = declared;
        }
        if (size < 0) size = 0;
        if (size > MAX_ARRAY_LENGTH) {
          throw new RuntimeError(`Massiv juda katta (${size}) — eng ko'pi ${MAX_ARRAY_LENGTH}.`);
        }
        const arr: (number | string)[] = [];
        for (let i = 0; i < size; i++) arr.push(elements[i] ?? 0);
        this.arrays.set(stmt.name, arr);
        return;
      }

      case "assign": {
        const scope = this.findScope(stmt.name);
        if (!scope) {
          throw new RuntimeError(`"${stmt.name}" o'zgaruvchisi e'lon qilinmagan`);
        }
        scope.set(stmt.name, this.evaluate(stmt.value));
        return;
      }

      case "assignIndex": {
        const arr = this.arrays.get(stmt.name);
        if (!arr) throw new RuntimeError(`"${stmt.name}" massivi e'lon qilinmagan`);
        const idx = Math.trunc(this.toNumber(this.evaluate(stmt.index)));
        if (idx < 0 || idx >= arr.length) {
          throw new RuntimeError(`"${stmt.name}" massivida ${idx}-indeks chegaradan tashqarida`);
        }
        arr[idx] = this.evaluate(stmt.value);
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

      case "switch": {
        const value = this.evaluate(stmt.discriminant);
        const matches = (test: Expression): boolean => {
          const cv = this.evaluate(test);
          return typeof value === "string" || typeof cv === "string"
            ? this.toText(value) === this.toText(cv)
            : this.toNumber(value) === this.toNumber(cv);
        };
        // Mos keladigan `case`, aks holda `default` dan boshlaymiz.
        let start = stmt.cases.findIndex((c) => c.test !== null && matches(c.test));
        if (start === -1) start = stmt.cases.findIndex((c) => c.test === null);
        if (start === -1) return;
        try {
          // C'dagidek `break` gacha keyingi `case` larga ham "tushib" o'tadi.
          for (let i = start; i < stmt.cases.length; i++) {
            yield* this.execBlock(stmt.cases[i]!.body);
          }
        } catch (err) {
          if (!(err instanceof BreakSignal)) throw err;
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
      // brauzerni qotirmasin. Kichik vaqt o'tkazamiz: delay'siz loop ham
      // virtual soatni suradi, shunda soat kuzatuvchi himoya to'g'ri kodni
      // noto'g'ri "cheksiz sikl" deb ayblamaydi.
      yield { type: "delay", ms: LOOP_OVERHEAD_MS };
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
    this.lcdPins.clear();
    this.lcdText.clear();
    this.lcdCursor.clear();
    this.lcdView.clear();
    this.dhtPins.clear();
    this.warned.clear();
    this.relayState.clear();
    this.interrupts.clear();
    this.arrays.clear();
    this.callDepth = 0;
    this.lastLedOn = null;
    this.observed.pinsDrivenHigh = [];
    this.observed.pinsDrivenLow = [];
    this.observed.ledToggles = 0;
    this.observed.usedDelay = false;
    this.netlist = buildNetlist(this.options.circuit);
    this.invalidateSolution();
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

    // Uzilishlar kadr boshida tekshiriladi: sensor yoki tugma holati
    // oxirgi kadrdan beri o'zgargan bo'lishi mumkin.
    this.pollInterrupts();

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
