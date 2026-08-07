import type { Circuit, Lesson, LessonCheckInput, LessonResult, Statement } from "./types";
import { boardPinFor, buildNetlist, isGrounded } from "./netlist";

/**
 * Tayyor laboratoriya darslari.
 *
 * Har bir dars o'zining boshlang'ich sxemasi, kodi va tekshiruv qoidalariga
 * ega. Qoidalar sof funksiya: sxema + kod + simulyatsiya kuzatuvlari kiradi,
 * `true`/`false` chiqadi — shuning uchun ularni testda ham ishlatish oson.
 */

/* ─────────────────────────── Yordamchilar ─────────────────────────── */

/** Daraxtdagi barcha buyruqlarni tekis ro'yxatga yig'adi. */
function flatten(stmts: Statement[]): Statement[] {
  const out: Statement[] = [];
  for (const s of stmts) {
    out.push(s);
    if (s.kind === "if") out.push(...flatten(s.then), ...flatten(s.else));
    if (s.kind === "while" || s.kind === "for") out.push(...flatten(s.body));
  }
  return out;
}

/** Kodda shu nomdagi funksiya chaqirilganmi (argumentlari bilan tekshirish uchun). */
function calls(input: LessonCheckInput, name: string) {
  if (!input.sketch) return [];
  const all = [
    ...flatten(input.sketch.globals),
    ...flatten(input.sketch.setup),
    ...flatten(input.sketch.loop),
    ...Object.values(input.sketch.functions).flatMap((fn) => flatten(fn.body)),
  ];
  return all
    .filter((s) => s.kind === "expression" && s.expression.kind === "call")
    .map((s) => (s as Extract<Statement, { kind: "expression" }>).expression)
    .filter((e) => e.kind === "call" && e.callee === name);
}

/** Sxemada shu turdagi komponent bormi. */
function hasComponent(circuit: Circuit, type: string) {
  return circuit.nodes.some((n) => n.type === type);
}

/* ─────────────────────────── Miltillovchi LED ─────────────────────────── */

const BLINK_CIRCUIT: Circuit = {
  nodes: [
    { id: "uno", type: "arduino-uno", x: 80, y: 220, rotation: 0, settings: {} },
    { id: "r1", type: "resistor", x: 430, y: 180, rotation: 0, settings: { ohms: 220 } },
    { id: "led1", type: "led", x: 570, y: 240, rotation: 0, settings: { color: "red" } },
  ],
  wires: [],
};

const BLINK_CODE = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);

  digitalWrite(13, LOW);
  delay(1000);
}
`;

const blinkLesson: Lesson = {
  slug: "miltillovchi-led",
  title: "Miltillovchi LED",
  summary: "Birinchi loyihangiz — LEDni har soniyada yoqib-o'chiring.",
  difficulty: "oson",
  minutes: 15,
  requiredComponents: ["arduino-uno", "led", "resistor"],
  theory:
    "LED — yorug'lik chiqaruvchi diod. Uning uzun oyog'i anod (+), kaltasi katod (−). " +
    "Arduino raqamli pini HIGH bo'lganda 5V beradi, LOW bo'lganda 0V. " +
    "LED to'g'ridan-to'g'ri ulansa juda ko'p tok o'tib kuyib qoladi, shuning uchun " +
    "yo'liga 220 Ω rezistor qo'yiladi. delay() esa kutish vaqtini millisekundda beradi: " +
    "delay(1000) — bir soniya.",
  steps: [
    {
      id: "s1",
      title: "Komponentlarni joylashtiring",
      detail: "Ish maydoniga Arduino Uno, LED va 220 Ω rezistorni tashlang.",
    },
    {
      id: "s2",
      title: "Rezistorni ulang",
      detail: "Arduino'ning 13-pinini rezistorning bir oyog'iga sim bilan ulang.",
    },
    {
      id: "s3",
      title: "LEDni ulang",
      detail: "Rezistorning ikkinchi oyog'ini LED anodiga (uzun oyoq) ulang.",
    },
    {
      id: "s4",
      title: "Zanjirni yoping",
      detail: "LED katodini (kalta oyoq) Arduino GND piniga ulang.",
    },
    {
      id: "s5",
      title: "Kodni yozing",
      detail: "setup() da pinMode(13, OUTPUT), loop() da digitalWrite va delay ishlating.",
    },
    {
      id: "s6",
      title: "Simulyatsiyani boshlang",
      detail: "Yashil tugmani bosing — LED har soniyada yonib-o'chishi kerak.",
    },
  ],
  starterCircuit: BLINK_CIRCUIT,
  starterCode: BLINK_CODE,
  rules: [
    {
      id: "has-led",
      label: "Sxemada LED bor",
      hint: "Chap paneldan LEDni ish maydoniga tashlang.",
      check: (i) => hasComponent(i.circuit, "led"),
    },
    {
      id: "has-resistor",
      label: "Rezistor ulangan",
      hint: "LED kuyib qolmasligi uchun 220 Ω rezistor qo'shing.",
      check: (i) => hasComponent(i.circuit, "resistor"),
    },
    {
      id: "led-wired",
      label: "LED Arduino va GND ga ulangan",
      hint: "Anodni rezistor orqali 13-pinga, katodni GND ga ulang.",
      check: (i) => {
        const led = i.circuit.nodes.find((n) => n.type === "led");
        if (!led) return false;
        const net = buildNetlist(i.circuit);
        return boardPinFor(net, led.id, "anode") !== null && isGrounded(net, led.id, "cathode");
      },
    },
    {
      id: "pinmode",
      label: "setup() da pinMode(OUTPUT) bor",
      hint: "setup() ichida pinMode(13, OUTPUT); yozing.",
      check: (i) =>
        calls(i, "pinMode").some(
          (c) =>
            c.kind === "call" && c.args[1]?.kind === "identifier" && c.args[1].name === "OUTPUT",
        ),
    },
    {
      id: "digitalwrite-both",
      label: "digitalWrite HIGH va LOW ishlatilgan",
      hint: "LED yonishi uchun HIGH, o'chishi uchun LOW kerak.",
      check: (i) => {
        const list = calls(i, "digitalWrite");
        const has = (v: string) =>
          list.some(
            (c) => c.kind === "call" && c.args[1]?.kind === "identifier" && c.args[1].name === v,
          );
        return has("HIGH") && has("LOW");
      },
    },
    {
      id: "delay",
      label: "delay() ishlatilgan",
      hint: "Yonib-o'chish ko'rinishi uchun delay(1000) qo'shing.",
      check: (i) => i.observed.usedDelay || calls(i, "delay").length > 0,
    },
    {
      id: "blinks",
      label: "Simulyatsiyada LED yonib-o'chdi",
      hint: "Simulyatsiyani ishga tushiring va bir necha soniya kuting.",
      check: (i) => i.observed.ledToggles >= 2,
    },
  ],
};

export const LESSONS: Lesson[] = [blinkLesson];

export function getLesson(slug: string): Lesson | null {
  return LESSONS.find((l) => l.slug === slug) ?? null;
}

/** Dars topshirig'ini tekshiradi va foizli natija qaytaradi. */
export function checkLesson(lesson: Lesson, input: LessonCheckInput): LessonResult {
  const passed: LessonResult["passed"] = [];
  const failed: LessonResult["failed"] = [];

  for (const rule of lesson.rules) {
    let ok = false;
    try {
      ok = rule.check(input);
    } catch {
      // Qoida xato bersa — bajarilmagan deb hisoblaymiz, tekshiruv to'xtamaydi.
      ok = false;
    }
    if (ok) passed.push({ id: rule.id, label: rule.label });
    else failed.push({ id: rule.id, label: rule.label, hint: rule.hint });
  }

  const percent =
    lesson.rules.length === 0 ? 0 : Math.round((passed.length / lesson.rules.length) * 100);
  return { percent, passed, failed };
}
