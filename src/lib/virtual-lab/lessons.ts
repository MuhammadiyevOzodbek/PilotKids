import type { Circuit, Lesson, LessonCheckInput, LessonResult, Statement } from "./types";
import { boardPinFor, buildNetlist, isGrounded, isPowered } from "./netlist";

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
    if (s.kind === "switch") for (const c of s.cases) out.push(...flatten(c.body));
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

/** Sxemadagi shu turdagi komponentlar soni. */
function countComponents(circuit: Circuit, type: string) {
  return circuit.nodes.filter((n) => n.type === type).length;
}

/** Komponent pini plataning qaysi raqamli piniga ulangan (yo'q bo'lsa `null`). */
function boardPinOfType(circuit: Circuit, type: string, pinId: string): number | null {
  const node = circuit.nodes.find((n) => n.type === type);
  if (!node) return null;
  return boardPinFor(buildNetlist(circuit), node.id, pinId);
}

/** Kodda shu turdagi buyruq ishlatilganmi (`if`, `while`, `for`…). */
function usesStatement(input: LessonCheckInput, kind: Statement["kind"]) {
  if (!input.sketch) return false;
  const all = [
    ...flatten(input.sketch.globals),
    ...flatten(input.sketch.setup),
    ...flatten(input.sketch.loop),
    ...Object.values(input.sketch.functions).flatMap((fn) => flatten(fn.body)),
  ];
  return all.some((s) => s.kind === kind);
}

/** Kodda funksiya (ifoda ichida ham) chaqirilganmi — `analogRead(A0)` kabi. */
function usesFunction(input: LessonCheckInput, name: string): boolean {
  if (!input.sketch) return false;
  return JSON.stringify(input.sketch).includes(`"callee":"${name}"`);
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

/* ─────────────────────────── Tugma bilan LED ─────────────────────────── */

const BUTTON_CIRCUIT: Circuit = {
  nodes: [
    { id: "uno", type: "arduino-uno", x: 80, y: 240, rotation: 0, settings: {} },
    { id: "btn", type: "push-button", x: 470, y: 120, rotation: 0, settings: { pressed: false } },
    { id: "r1", type: "resistor", x: 470, y: 380, rotation: 0, settings: { ohms: 220 } },
    { id: "led1", type: "led", x: 620, y: 400, rotation: 0, settings: { color: "green" } },
  ],
  wires: [],
};

const BUTTON_CODE = `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(9, OUTPUT);
}

void loop() {
  // INPUT_PULLUP da bosilgan tugma LOW beradi.
  if (digitalRead(2) == LOW) {
    digitalWrite(9, HIGH);
  } else {
    digitalWrite(9, LOW);
  }
}
`;

const buttonLesson: Lesson = {
  slug: "tugma-bilan-led",
  title: "Tugma bilan LED",
  summary: "LEDni tugma bosilganda yoqing — birinchi kiritish qurilmangiz.",
  difficulty: "oson",
  minutes: 20,
  requiredComponents: ["arduino-uno", "push-button", "led", "resistor"],
  theory:
    "Arduino pini nafaqat chiqish, balki KIRISH ham bo'la oladi. pinMode(2, INPUT_PULLUP) " +
    "pinni kirishga o'tkazadi va uning ichidagi tortuvchi rezistorni yoqadi: hech narsa " +
    "ulanmaganda pin HIGH bo'lib turadi. Tugmaning ikkinchi oyog'ini GND ga ulasangiz, " +
    'bosilganda pin GND ga tutashadi va LOW bo\'ladi. Shuning uchun kodda "bosilgan" ' +
    "holat LOW bilan tekshiriladi. digitalRead() pinning holatini o'qiydi, if/else esa " +
    "shunga qarab qaror qabul qiladi.",
  steps: [
    {
      id: "s1",
      title: "Tugmani ulang",
      detail: "Tugmaning bir oyog'ini D2 piniga, ikkinchisini GND ga ulang.",
    },
    {
      id: "s2",
      title: "LEDni ulang",
      detail: "D9 → rezistor → LED anodi, LED katodi → GND.",
    },
    {
      id: "s3",
      title: "Pinlarni sozlang",
      detail: "setup() da pinMode(2, INPUT_PULLUP) va pinMode(9, OUTPUT) yozing.",
    },
    {
      id: "s4",
      title: "Shartni yozing",
      detail: "loop() da digitalRead(2) qiymatini if bilan tekshiring.",
    },
    {
      id: "s5",
      title: "Sinab ko'ring",
      detail:
        "Simulyatsiyani boshlang, tugmani tanlab o'ng paneldagi «Bosilgan» katagini belgilang.",
    },
  ],
  starterCircuit: BUTTON_CIRCUIT,
  starterCode: BUTTON_CODE,
  rules: [
    {
      id: "has-button",
      label: "Sxemada tugma bor",
      hint: "Chap paneldan «Tugma» ni ish maydoniga tashlang.",
      check: (i) => hasComponent(i.circuit, "push-button"),
    },
    {
      id: "button-wired",
      label: "Tugma Arduino piniga ulangan",
      hint: "Tugmaning bir oyog'ini raqamli pinga ulang.",
      check: (i) =>
        boardPinOfType(i.circuit, "push-button", "a") !== null ||
        boardPinOfType(i.circuit, "push-button", "b") !== null,
    },
    {
      id: "button-grounded",
      label: "Tugmaning ikkinchi oyog'i GND ga ulangan",
      hint: "INPUT_PULLUP bilan ishlash uchun ikkinchi oyoq GND ga borishi kerak.",
      check: (i) => {
        const btn = i.circuit.nodes.find((n) => n.type === "push-button");
        if (!btn) return false;
        const net = buildNetlist(i.circuit);
        return isGrounded(net, btn.id, "a") || isGrounded(net, btn.id, "b");
      },
    },
    {
      id: "led-wired",
      label: "LED Arduino va GND ga ulangan",
      hint: "Anodni rezistor orqali raqamli pinga, katodni GND ga ulang.",
      check: (i) => {
        const led = i.circuit.nodes.find((n) => n.type === "led");
        if (!led) return false;
        const net = buildNetlist(i.circuit);
        return boardPinFor(net, led.id, "anode") !== null && isGrounded(net, led.id, "cathode");
      },
    },
    {
      id: "pinmode-input",
      label: "pinMode bilan kirish sozlangan",
      hint: "setup() da pinMode(2, INPUT_PULLUP); yozing.",
      check: (i) =>
        calls(i, "pinMode").some(
          (c) =>
            c.kind === "call" &&
            c.args[1]?.kind === "identifier" &&
            (c.args[1].name === "INPUT_PULLUP" || c.args[1].name === "INPUT"),
        ),
    },
    {
      id: "digitalread",
      label: "digitalRead() ishlatilgan",
      hint: "Tugma holatini o'qish uchun digitalRead(2) yozing.",
      check: (i) => usesFunction(i, "digitalRead"),
    },
    {
      id: "if",
      label: "Shart (if) ishlatilgan",
      hint: "Tugma bosilganini if bilan tekshiring.",
      check: (i) => usesStatement(i, "if"),
    },
  ],
};

/* ─────────────────────────── Svetofor ─────────────────────────── */

const TRAFFIC_CIRCUIT: Circuit = {
  nodes: [
    { id: "uno", type: "arduino-uno", x: 80, y: 260, rotation: 0, settings: {} },
    { id: "r1", type: "resistor", x: 470, y: 90, rotation: 0, settings: { ohms: 220 } },
    { id: "r2", type: "resistor", x: 470, y: 230, rotation: 0, settings: { ohms: 220 } },
    { id: "r3", type: "resistor", x: 470, y: 370, rotation: 0, settings: { ohms: 220 } },
    { id: "led-r", type: "led", x: 630, y: 60, rotation: 0, settings: { color: "red" } },
    { id: "led-y", type: "led", x: 630, y: 220, rotation: 0, settings: { color: "yellow" } },
    { id: "led-g", type: "led", x: 630, y: 380, rotation: 0, settings: { color: "green" } },
  ],
  wires: [],
};

const TRAFFIC_CODE = `void setup() {
  pinMode(11, OUTPUT); // qizil
  pinMode(10, OUTPUT); // sariq
  pinMode(9, OUTPUT);  // yashil
}

void loop() {
  digitalWrite(11, HIGH);
  delay(2000);
  digitalWrite(11, LOW);

  digitalWrite(10, HIGH);
  delay(700);
  digitalWrite(10, LOW);

  digitalWrite(9, HIGH);
  delay(2000);
  digitalWrite(9, LOW);
}
`;

const trafficLesson: Lesson = {
  slug: "svetofor",
  title: "Svetofor",
  summary: "Uchta LED bilan haqiqiy svetofor tartibini yarating.",
  difficulty: "orta",
  minutes: 30,
  requiredComponents: ["arduino-uno", "led", "resistor"],
  theory:
    "Svetoforda uchta chiroq navbat bilan yonadi: qizil → sariq → yashil. Har bir LED " +
    "o'zining raqamli piniga ulanadi va o'zining rezistoriga ega bo'ladi — ular tokni " +
    "birga ishlatolmaydi. Kodda tartib delay() bilan quriladi: qaysi chiroq qancha " +
    "turishini shu belgilaydi. Diqqat qiling: yonganini o'chirmasangiz, keyingisi bilan " +
    "birga yonib qoladi.",
  steps: [
    {
      id: "s1",
      title: "Uchta LED qo'ying",
      detail: "Qizil, sariq va yashil LED hamda ular uchun uchta 220 Ω rezistor.",
    },
    {
      id: "s2",
      title: "Har birini alohida pinga ulang",
      detail: "Masalan D11 — qizil, D10 — sariq, D9 — yashil.",
    },
    { id: "s3", title: "Katodlarni GND ga ulang", detail: "Uchala LED katodi GND ga boradi." },
    {
      id: "s4",
      title: "Tartibni yozing",
      detail: "Har bir chiroqni yoqing, kuting, o'chiring — keyin keyingisiga o'ting.",
    },
    {
      id: "s5",
      title: "Ishga tushiring",
      detail: "Chiroqlar navbat bilan yonishi kerak, ikkitasi bir vaqtda emas.",
    },
  ],
  starterCircuit: TRAFFIC_CIRCUIT,
  starterCode: TRAFFIC_CODE,
  rules: [
    {
      id: "three-leds",
      label: "Sxemada uchta LED bor",
      hint: "Qizil, sariq va yashil LED kerak.",
      check: (i) => countComponents(i.circuit, "led") >= 3,
    },
    {
      id: "three-resistors",
      label: "Har bir LED uchun rezistor bor",
      hint: "Uchta LED — uchta rezistor.",
      check: (i) => countComponents(i.circuit, "resistor") >= 3,
    },
    {
      id: "distinct-pins",
      label: "LEDlar uchta turli pinga ulangan",
      hint: "Har bir LED o'z pinini olishi kerak, aks holda ularni alohida boshqarib bo'lmaydi.",
      check: (i) => {
        const net = buildNetlist(i.circuit);
        const pins = i.circuit.nodes
          .filter((n) => n.type === "led")
          .map((n) => boardPinFor(net, n.id, "anode"))
          .filter((p): p is number => p !== null);
        return new Set(pins).size >= 3;
      },
    },
    {
      id: "grounded",
      label: "Uchala LED katodi GND ga ulangan",
      hint: "Zanjir yopilmasa LED yonmaydi.",
      check: (i) => {
        const net = buildNetlist(i.circuit);
        const leds = i.circuit.nodes.filter((n) => n.type === "led");
        return leds.length >= 3 && leds.every((n) => isGrounded(net, n.id, "cathode"));
      },
    },
    {
      id: "three-outputs",
      label: "Uchta pin OUTPUT qilib sozlangan",
      hint: "setup() da har bir pin uchun pinMode(..., OUTPUT) yozing.",
      check: (i) => {
        const pins = calls(i, "pinMode")
          .filter(
            (c) =>
              c.kind === "call" && c.args[1]?.kind === "identifier" && c.args[1].name === "OUTPUT",
          )
          .map((c) => (c.kind === "call" && c.args[0]?.kind === "number" ? c.args[0].value : null))
          .filter((v): v is number => v !== null);
        return new Set(pins).size >= 3;
      },
    },
    {
      id: "sequence",
      label: "Uchala chiroq yoqilgan va o'chirilgan",
      hint: "Har bir chiroq uchun HIGH ham, LOW ham bo'lishi kerak.",
      check: (i) => {
        const driven = new Set(i.observed.pinsDrivenHigh);
        const off = new Set(i.observed.pinsDrivenLow);
        let both = 0;
        for (const pin of driven) if (off.has(pin)) both += 1;
        return both >= 3;
      },
    },
    {
      id: "delay",
      label: "delay() bilan vaqt berilgan",
      hint: "Chiroqlar ko'rinishi uchun delay() kerak.",
      check: (i) => i.observed.usedDelay || calls(i, "delay").length > 0,
    },
  ],
};

/* ─────────────────────────── Tungi chiroq ─────────────────────────── */

const NIGHT_CIRCUIT: Circuit = {
  nodes: [
    { id: "uno", type: "arduino-uno", x: 80, y: 250, rotation: 0, settings: {} },
    { id: "ldr", type: "ldr", x: 470, y: 110, rotation: 0, settings: { light: 700 } },
    { id: "r1", type: "resistor", x: 470, y: 380, rotation: 0, settings: { ohms: 220 } },
    { id: "led1", type: "led", x: 620, y: 400, rotation: 0, settings: { color: "yellow" } },
  ],
  wires: [],
};

const NIGHT_CODE = `void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int yorugLik = analogRead(A0);
  Serial.println(yorugLik);

  if (yorugLik < 400) {
    digitalWrite(9, HIGH);   // qorong'i — chiroqni yoqamiz
  } else {
    digitalWrite(9, LOW);
  }

  delay(200);
}
`;

const nightLightLesson: Lesson = {
  slug: "tungi-chiroq",
  title: "Tungi chiroq",
  summary: "Qorong'i tushganda o'zi yonadigan chiroq yasang.",
  difficulty: "orta",
  minutes: 30,
  requiredComponents: ["arduino-uno", "ldr", "led", "resistor"],
  theory:
    "LDR — yorug'likka sezgir rezistor. Uning signal pini Arduino'ning ANALOG kirishiga " +
    "(A0–A5) ulanadi. analogRead() 0 dan 1023 gacha son qaytaradi: 0 — butunlay qorong'i, " +
    "1023 — juda yorug'. Bu raqamni chegara bilan solishtirib qaror qabul qilamiz. " +
    "Serial.println() esa qiymatni Serial monitorda ko'rsatadi — chegarani to'g'ri tanlash " +
    "uchun avval haqiqiy sonlarga qarab olish kerak.",
  steps: [
    {
      id: "s1",
      title: "LDR ni ulang",
      detail: "VCC → 5V, GND → GND, signal → A0.",
    },
    { id: "s2", title: "LEDni ulang", detail: "D9 → rezistor → LED anodi, katod → GND." },
    {
      id: "s3",
      title: "Qiymatni o'qing",
      detail: "analogRead(A0) natijasini o'zgaruvchiga oling va Serial.println() bilan chiqaring.",
    },
    {
      id: "s4",
      title: "Chegarani tanlang",
      detail: "if bilan solishtiring: qiymat kichik bo'lsa chiroqni yoqing.",
    },
    {
      id: "s5",
      title: "Sinab ko'ring",
      detail: "LDR ni tanlab o'ng paneldagi «Yorug'lik» slayderini pastga suring.",
    },
  ],
  starterCircuit: NIGHT_CIRCUIT,
  starterCode: NIGHT_CODE,
  rules: [
    {
      id: "has-ldr",
      label: "Sxemada LDR bor",
      hint: "Chap paneldan «Yorug'lik sensori (LDR)» ni tashlang.",
      check: (i) => hasComponent(i.circuit, "ldr"),
    },
    {
      id: "ldr-analog",
      label: "LDR analog kirishga ulangan",
      hint: "Signal pinini A0–A5 dan biriga ulang.",
      check: (i) => {
        const pin = boardPinOfType(i.circuit, "ldr", "signal");
        return pin !== null && pin >= 14;
      },
    },
    {
      id: "ldr-powered",
      label: "LDR ga 5V va GND ulangan",
      hint: "Sensor ishlashi uchun ikkala quvvat simi kerak.",
      check: (i) => {
        const ldr = i.circuit.nodes.find((n) => n.type === "ldr");
        if (!ldr) return false;
        const net = buildNetlist(i.circuit);
        return isPowered(net, ldr.id, "vcc") && isGrounded(net, ldr.id, "gnd");
      },
    },
    {
      id: "led-wired",
      label: "LED Arduino va GND ga ulangan",
      hint: "Anodni rezistor orqali raqamli pinga, katodni GND ga ulang.",
      check: (i) => {
        const led = i.circuit.nodes.find((n) => n.type === "led");
        if (!led) return false;
        const net = buildNetlist(i.circuit);
        return boardPinFor(net, led.id, "anode") !== null && isGrounded(net, led.id, "cathode");
      },
    },
    {
      id: "analogread",
      label: "analogRead() ishlatilgan",
      hint: "Yorug'lik qiymatini analogRead(A0) bilan o'qing.",
      check: (i) => usesFunction(i, "analogRead"),
    },
    {
      id: "if",
      label: "Chegara if bilan tekshirilgan",
      hint: "Qiymatni son bilan solishtiring: if (qiymat < 400) { … }",
      check: (i) => usesStatement(i, "if"),
    },
    {
      id: "led-reacts",
      label: "Simulyatsiyada chiroq boshqarildi",
      hint: "Simulyatsiyani boshlang va LDR slayderini pastga suring.",
      check: (i) => i.observed.pinsDrivenHigh.length > 0 && i.observed.pinsDrivenLow.length > 0,
    },
  ],
};

export const LESSONS: Lesson[] = [blinkLesson, buttonLesson, trafficLesson, nightLightLesson];

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
