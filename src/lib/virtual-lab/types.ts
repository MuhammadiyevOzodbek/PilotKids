/**
 * Virtual laboratoriya — asosiy turlar.
 *
 * Bu fayl butun tizimning shartnomasi: sxema, simulyator, parser, validator
 * va saqlash qatlamlari faqat shu turlar orqali gaplashadi. Hech qayerda
 * `any` ishlatilmaydi.
 */

/* ─────────────────────────── Komponentlar ─────────────────────────── */

export type ComponentCategory =
  "board" | "light" | "control" | "sensor" | "motor" | "output" | "power" | "other";

/** Pin nima uzatadi — ulanish qoidalari shunga qarab tekshiriladi. */
export type PinRole =
  | "power" // 5V, 3.3V
  | "ground" // GND
  | "digital" // raqamli kirish/chiqish
  | "analog" // analog kirish
  | "pwm" // analogWrite qo'llab-quvvatlaydigan raqamli pin
  | "passive"; // rezistor/LED oyoqchasi — yo'nalishi yo'q

export type PinKind = "digital" | "analog" | "power" | "ground" | "passive";

export type PinDirection = "input" | "output" | "bidirectional" | "passive";

export interface CircuitPin {
  id: string;
  label: string;
  kind: PinKind;
  direction: PinDirection;
  polarity?: "positive" | "negative";
  x: number;
  y: number;
  connectable: boolean;
  electricalGroupId?: string;
}

export interface ComponentPin extends CircuitPin {
  /** Eski validator/simulyator API'si: rol `pwm`ni ham ajratadi. */
  role: PinRole;
}

/** Foydalanuvchi o'zgartira oladigan sozlama. */
export type ComponentSetting =
  | {
      key: string;
      label: string;
      kind: "number";
      min: number;
      max: number;
      step: number;
      unit?: string;
    }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: "boolean" };

export interface ComponentDefinition {
  /** Katalogdagi tur identifikatori: "led", "arduino-uno" … */
  type: string;
  name: string;
  category: ComponentCategory;
  description: string;
  /** Ish maydonidagi o'lchami (px). */
  width: number;
  height: number;
  pins: ComponentPin[];
  /** `settings` uchun boshlang'ich qiymatlar. */
  defaults: Record<string, string | number | boolean>;
  settings: ComponentSetting[];
  /** Bu komponent Arduino platasimi (simulyator uni alohida ko'radi). */
  isBoard?: boolean;
}

/* ─────────────────────────── Batareya ─────────────────────────── */

/**
 * Batareya qutblanishi.
 *
 * `reversed` — batareya ushlagichga teskari solingan holat: ushlagichning
 * "+" kontaktiga elementning manfiy uchi tegib turadi. Terminal nomlari
 * o'zgarmaydi (ular ushlagichning kontaktlari), lekin kuchlanish teskari
 * beriladi. Bola LED nima uchun yonmayotganini shu orqali ko'radi.
 */
export type BatteryPolarity = "normal" | "reversed";

/** Batareya sozlamalari — `CircuitNode.settings` shu shaklda saqlanadi. */
export interface BatteryComponentData {
  /** Kuchlanish (V): 1–24 oralig'ida. */
  voltage: number;
  /** O'chirilgan batareya zanjirga kuchlanish bermaydi. */
  enabled: boolean;
  polarity: BatteryPolarity;
}

/* ─────────────────────────── Sxema ─────────────────────────── */

/** Ish maydoniga qo'yilgan bitta komponent nusxasi. */
export interface CircuitNode {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  settings: Record<string, string | number | boolean>;
}

export type WireColor = "red" | "black" | "blue" | "green" | "yellow" | "orange";

export interface WireEndpoint {
  nodeId: string;
  pinId: string;
}

export interface WireConnection {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  color: WireColor;
}

export interface Circuit {
  nodes: CircuitNode[];
  wires: WireConnection[];
}

/* ─────────────────────────── Xatolar ─────────────────────────── */

export type IssueSeverity = "error" | "warning";

/** Sxemadagi muammo (ulanish, polarite, qisqa tutashuv). */
export interface CircuitIssue {
  id: string;
  severity: IssueSeverity;
  /** Foydalanuvchiga o'zbek tilida ko'rsatiladigan matn. */
  message: string;
  /** Nima qilish kerakligi bo'yicha maslahat. */
  hint: string;
  /** Muammo qaysi komponent(lar)da. */
  nodeIds: string[];
}

/** Koddagi xato. */
export interface CodeError {
  line: number;
  column: number;
  message: string;
  hint: string;
}

/* ─────────────────────────── Parser ─────────────────────────── */

export type Expression =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "identifier"; name: string }
  | { kind: "call"; callee: string; args: Expression[] }
  | { kind: "binary"; op: BinaryOp; left: Expression; right: Expression }
  | { kind: "unary"; op: "-" | "!" | "~"; operand: Expression }
  | { kind: "conditional"; test: Expression; then: Expression; else: Expression }
  | { kind: "index"; name: string; index: Expression };

export type BinaryOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "<<"
  | ">>"
  | "<"
  | ">"
  | "<="
  | ">="
  | "=="
  | "!="
  | "&"
  | "^"
  | "|"
  | "&&"
  | "||";

export type Statement =
  | { kind: "expression"; expression: Expression; line: number }
  | { kind: "declare"; name: string; valueType: string; value: Expression | null; line: number }
  | {
      kind: "declareArray";
      name: string;
      valueType: string;
      elements: Expression[] | null;
      sizeExpr: Expression | null;
      line: number;
    }
  | { kind: "assign"; name: string; value: Expression; line: number }
  | { kind: "assignIndex"; name: string; index: Expression; value: Expression; line: number }
  | { kind: "return"; value: Expression | null; line: number }
  | { kind: "break"; line: number }
  | { kind: "continue"; line: number }
  | { kind: "if"; test: Expression; then: Statement[]; else: Statement[]; line: number }
  | { kind: "while"; test: Expression; body: Statement[]; line: number }
  | {
      kind: "for";
      init: Statement | null;
      test: Expression | null;
      update: Statement | null;
      body: Statement[];
      line: number;
    }
  | {
      kind: "switch";
      discriminant: Expression;
      cases: { test: Expression | null; body: Statement[] }[];
      line: number;
    };

/** Parse natijasi — `setup`/`loop` va global e'lonlar. */
export interface ParsedSketch {
  /** Oddiy preprocessor qiymatlari: `#define LED_PIN 13`. */
  defines: Record<string, number | string>;
  globals: Statement[];
  setup: Statement[];
  loop: Statement[];
  /** Yordamchi funksiyalar: `void blink(int pin) { ... }`. */
  functions: Record<string, SketchFunction>;
}

export interface SketchFunction {
  params: string[];
  body: Statement[];
}

export type ParseResult = { ok: true; sketch: ParsedSketch } | { ok: false; errors: CodeError[] };

/* ─────────────────────────── Simulyatsiya ─────────────────────────── */

export type SimulationStatus = "stopped" | "running" | "paused" | "error";

export type PinMode = "input" | "output" | "input_pullup" | "unset";

/** Arduino platasining bir lahzadagi holati. */
export interface ArduinoBoardState {
  /** Pin raqami → rejim. */
  modes: Record<number, PinMode>;
  /** Raqamli chiqish holati (0/1). */
  digital: Record<number, number>;
  /** analogWrite qiymati (0–255). */
  pwm: Record<number, number>;
}

/** Foydalanuvchi boshqaradigan sensor qiymatlari (node id → qiymat). */
export interface SensorState {
  /** Potensiometr 0–1023, LDR 0–1023, masofa 2–400, tugma 0/1. */
  values: Record<string, number>;
}

export type LogLevel = "info" | "success" | "warning" | "error";

export interface SerialLogEntry {
  id: number;
  /** Simulyatsiya boshlanganidan beri o'tgan virtual millisekund. */
  at: number;
  level: LogLevel;
  text: string;
}

/** Komponentning simulyatsiyadagi ko'rinadigan holati. */
export interface ComponentRuntimeState {
  /** LED/RGB yorqinligi 0–1. */
  brightness?: number;
  /** LED rangi (RGB uchun hisoblanadi). */
  color?: string;
  /** Buzzer chalayaptimi. */
  buzzing?: boolean;
  /** Servo burchagi 0–180. */
  angle?: number;
  /** DC motor tezligi 0–1. */
  speed?: number;
  /** DC motor aylanish yo'nalishi: 1 (soat yo'nalishi) yoki -1. */
  direction?: number;
  /** Multimetr o'lchagan kuchlanish (V). */
  voltage?: number;
  /**
   * Plata pinlarining joriy darajasi: `"D13" → 1`, `"A0" → 734`.
   * Faqat `isBoard` komponentlar uchun to'ldiriladi.
   */
  pins?: Record<string, number>;
  /**
   * Pin rejimi: `"D13" → "output"`. `pinMode()` chaqirilmagan pin ro'yxatda
   * bo'lmaydi — tooltip'da "sozlanmagan" deb ko'rsatiladi.
   */
  pinModes?: Record<string, PinMode>;
  /** Plataga quvvat berilganmi — ON indikatori. */
  powered?: boolean;
  /** Yaqinda Serial orqali ma'lumot ketdimi — TX/RX indikatorlari. */
  serialActive?: boolean;
  /**
   * Element hozir ishlayaptimi: batareya uchun — yoqilgan va zanjirga
   * ulangan. Chizmada kichik indikator sifatida ko'rinadi.
   */
  active?: boolean;
}

export interface SimulationSnapshot {
  status: SimulationStatus;
  /** Virtual vaqt (ms). */
  time: number;
  board: ArduinoBoardState;
  runtime: Record<string, ComponentRuntimeState>;
  logs: SerialLogEntry[];
  /** Ishga tushirishga xalaqit bergan xatolar. */
  errors: string[];
}

export type SimulationSpeed = 0.5 | 1 | 2 | 5;

/* ─────────────────────────── Darslar ─────────────────────────── */

export type LessonDifficulty = "oson" | "orta" | "qiyin";

export interface LessonStep {
  id: string;
  title: string;
  detail: string;
}

/** Dars topshirig'i bajarilganini tekshiradigan qoida. */
export interface LessonValidationRule {
  id: string;
  label: string;
  /** Nima uchun kerakligi — bajarilmasa shu ko'rsatiladi. */
  hint: string;
  check: (input: LessonCheckInput) => boolean;
}

export interface LessonCheckInput {
  circuit: Circuit;
  code: string;
  sketch: ParsedSketch | null;
  /** Simulyatsiya davomida kuzatilgan hodisalar. */
  observed: ObservedBehaviour;
}

/** Simulyatsiya vaqtida yig'iladigan dalillar (dars tekshiruvi uchun). */
export interface ObservedBehaviour {
  /** Qaysi pinlar HIGH bo'lgan. */
  pinsDrivenHigh: number[];
  /** Qaysi pinlar LOW bo'lgan. */
  pinsDrivenLow: number[];
  /** LED necha marta yonib-o'chgan. */
  ledToggles: number;
  /** delay() chaqirilganmi. */
  usedDelay: boolean;
}

export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  difficulty: LessonDifficulty;
  minutes: number;
  /** Kerakli komponent turlari (katalog `type` lari). */
  requiredComponents: string[];
  theory: string;
  steps: LessonStep[];
  starterCircuit: Circuit;
  starterCode: string;
  rules: LessonValidationRule[];
}

export interface LessonResult {
  percent: number;
  passed: { id: string; label: string }[];
  failed: { id: string; label: string; hint: string }[];
}

/* ─────────────────────────── Saqlash ─────────────────────────── */

export interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  circuit: Circuit;
  code: string;
  /** Qaysi darsdan boshlangani (bo'lsa). */
  lessonSlug: string | null;
  sensors: Record<string, number>;
}
