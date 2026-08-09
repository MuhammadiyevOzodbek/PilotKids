import { describe, expect, it } from "vitest";
import {
  addSubtree,
  addTopBlock,
  addVariable,
  allBlockDefinitions,
  BLOCK_LOCALES,
  blocksInCategory,
  checkVariableName,
  connectAfter,
  connectIntoStatement,
  connectValue,
  createBlock,
  detachBlock,
  duplicateSubtree,
  emptyWorkspace,
  generateProgram,
  getBlockDefinition,
  messageKeysOf,
  parseWorkspace,
  registerBlocks,
  resetRegistry,
  removeBlock,
  sanitizeWorkspace,
  setField,
  splitLabel,
  stackIds,
  t,
  validateWorkspace,
  type BlockWorkspace,
} from ".";
import { buildNetlist } from "../netlist";
import { parseSketch } from "../parser";
import { exportProject, importProject } from "../storage";
import type { Circuit as LabCircuit, CircuitNode, SavedProject, WireConnection } from "../types";

/**
 * Faza 1 testlari.
 *
 * Asosiy shart: bloklar HAQIQIY Arduino kodi hosil qilishi va bu kod
 * laboratoriyaning mavjud parseri tushunadigan bo'lishi. Shuning uchun
 * generator natijasi `parseSketch` bilan ham tekshiriladi — "chiroyli
 * matn chiqdi" degan yolg'on ishonch bo'lmasin.
 */

/* ─────────────────────────── Yordamchi quruvchi ─────────────────────────── */

/**
 * Test uchun ish maydoni quruvchisi.
 *
 * Model funksiyalari yangi obyekt qaytaradi, testda esa har qadamda
 * `ws = ...` yozish kerak bo'lardi va o'qish qiyinlashardi. Quruvchi shu
 * qayta-qayta yozishni yashiradi, holat esa bitta joyda — `ws` maydonida.
 */
class Builder {
  ws: BlockWorkspace = emptyWorkspace();

  /** Ish maydoniga ildiz blok qo'yadi va uning id sini qaytaradi. */
  put(type: string, x = 0, y = 0): string {
    const block = createBlock(type);
    if (!block) throw new Error(`Noma'lum blok turi: ${type}`);
    this.ws = addTopBlock(this.ws, block, x, y);
    return block.id;
  }

  /** Bloklarni ketma-ket ichki stekka joylaydi (odatda «DO» uyasiga). */
  fill(hatId: string, types: string[], slot = "DO"): string[] {
    const ids: string[] = [];
    let previous: string | null = null;

    for (const type of types) {
      const id = this.put(type, 500, 500);
      this.ws = previous
        ? connectAfter(this.ws, id, previous)
        : connectIntoStatement(this.ws, id, hatId, slot);
      ids.push(id);
      previous = id;
    }
    return ids;
  }

  /** Qiymat blokini ota-blokning uyasiga ulaydi. */
  plug(type: string, parentId: string, slot: string): string {
    const id = this.put(type, 600, 600);
    this.ws = connectValue(this.ws, id, parentId, slot);
    return id;
  }

  field(id: string, name: string, value: string): void {
    this.ws = setField(this.ws, id, name, value);
  }

  /** Boshlanish blokidagi bloklar ketma-ketligi. */
  stack(hatId: string): string[] {
    return stackIds(this.ws, this.ws.blocks[hatId]!.statements.DO);
  }

  code(): string {
    return generateProgram(this.ws).code;
  }
}

/* ─────────────────────────── Registr ─────────────────────────── */

describe("blok registri", () => {
  it("Faza 1 bloklari ro'yxatdan o'tgan", () => {
    expect(getBlockDefinition("event_on_start")).not.toBeNull();
    expect(getBlockDefinition("event_forever")).not.toBeNull();
    expect(getBlockDefinition("pin_mode")).not.toBeNull();
    expect(getBlockDefinition("pin_digital_write")).not.toBeNull();
    expect(getBlockDefinition("pin_digital_read")).not.toBeNull();
    expect(getBlockDefinition("control_wait_seconds")).not.toBeNull();
    expect(getBlockDefinition("yoq-bunday-blok")).toBeNull();
  });

  it("boshlang'ich darajada faqat oddiy bloklar ko'rinadi", () => {
    expect(blocksInCategory("pins", "beginner")).toHaveLength(0);
    expect(blocksInCategory("pins", "advanced").length).toBeGreaterThan(0);
  });

  it("pin ro'yxatida faqat Uno pinlari bor", () => {
    const def = getBlockDefinition("pin_mode")!;
    const slot = def.slots.find((s) => s.name === "pin");
    if (slot?.kind !== "dropdown" || typeof slot.options === "function") {
      throw new Error("pin uyasi ro'yxat bo'lishi kerak");
    }
    const values = slot.options.map((o) => o.value);
    expect(values).toContain("13");
    expect(values).toContain("0");
    // Uno'da D14 yo'q — analog kirishlar alohida ro'yxatda.
    expect(values).not.toContain("14");
  });
});

/* ─────────────────────────── Model ─────────────────────────── */

describe("ish maydoni modeli", () => {
  it("blok ta'rifdagi boshlang'ich qiymatlar bilan yaratiladi", () => {
    const block = createBlock("pin_digital_write")!;
    expect(block.fields.pin).toBe("13");
    expect(block.fields.level).toBe("HIGH");
    expect(block.next).toBeNull();
  });

  it("stekka ulash `next` zanjirini hosil qiladi", () => {
    const b = new Builder();
    const hat = b.put("event_forever");
    const ids = b.fill(hat, ["pin_digital_write", "control_wait_seconds", "pin_digital_write"]);
    expect(b.stack(hat)).toEqual(ids);
  });

  it("o'rtaga qistirilgan blok pastdagilarni yo'qotmaydi", () => {
    const b = new Builder();
    const hat = b.put("event_forever");
    const ids = b.fill(hat, ["pin_digital_write", "control_wait_seconds"]);

    const inserted = b.put("pin_mode", 400, 400);
    b.ws = connectAfter(b.ws, inserted, ids[0]!);

    expect(b.stack(hat)).toEqual([ids[0], inserted, ids[1]]);
  });

  it("uzilgan blok pastdagilari bilan birga ildizga chiqadi", () => {
    const b = new Builder();
    const hat = b.put("event_forever");
    const ids = b.fill(hat, ["pin_digital_write", "control_wait_seconds"]);
    b.ws = detachBlock(b.ws, ids[0]!, 100, 100);

    expect(b.ws.blocks[hat]!.statements.DO).toBeNull();
    expect(b.ws.tops[ids[0]!]).toEqual({ x: 100, y: 100 });
    expect(stackIds(b.ws, ids[0]!)).toEqual(ids);
  });

  it("o'chirish butun daraxtni olib ketadi va yetim havola qoldirmaydi", () => {
    const b = new Builder();
    const hat = b.put("event_forever");
    const ids = b.fill(hat, ["pin_digital_write", "control_wait_seconds"]);
    b.ws = removeBlock(b.ws, ids[0]!);

    expect(b.ws.blocks[ids[0]!]).toBeUndefined();
    expect(b.ws.blocks[ids[1]!]).toBeUndefined();
    expect(b.ws.blocks[hat]!.statements.DO).toBeNull();
  });

  it("o'z ichiga ulash halqa hosil qilmaydi", () => {
    const b = new Builder();
    const hat = b.put("event_forever");
    const ids = b.fill(hat, ["pin_digital_write"]);

    expect(connectIntoStatement(b.ws, hat, ids[0]!, "DO")).toBe(b.ws);
  });

  it("qiymat uyasi band bo'lsa eskisi ish maydoniga chiqadi", () => {
    const b = new Builder();
    const wait = b.put("control_wait_millis");

    const first = b.put("pin_digital_read", 200, 200);
    b.ws = connectValue(b.ws, first, wait, "ms");

    const second = b.put("pin_digital_read", 300, 300);
    b.ws = connectValue(b.ws, second, wait, "ms", { x: 900, y: 900 });

    expect(b.ws.blocks[wait]!.inputs.ms).toBe(second);
    expect(b.ws.tops[first]).toEqual({ x: 900, y: 900 });
  });

  it("nusxalash yangi ID beradi, tuzilishni saqlaydi", () => {
    const b = new Builder();
    const hat = b.put("event_forever");
    b.fill(hat, ["pin_digital_write", "control_wait_seconds"]);

    const copy = duplicateSubtree(b.ws, hat)!;
    expect(copy.rootId).not.toBe(hat);
    b.ws = addSubtree(b.ws, copy.blocks, copy.rootId, 400, 40);

    expect(b.stack(copy.rootId)).toHaveLength(2);
    expect(Object.keys(b.ws.blocks)).toHaveLength(6);
  });

  it("ta'rifda yo'q uyaga yozilmaydi", () => {
    const b = new Builder();
    const id = b.put("pin_digital_write");
    b.field(id, "pin", "9");
    expect(b.ws.blocks[id]!.fields.pin).toBe("9");

    expect(setField(b.ws, id, "yoq-bunday-uya", "5")).toBe(b.ws);
  });
});

/* ─────────────────────────── O'zgaruvchi nomlari ─────────────────────────── */

describe("o'zgaruvchi nomi tekshiruvi", () => {
  it("C++ da band nomlarni rad etadi", () => {
    const ws = emptyWorkspace();
    expect(checkVariableName(ws, "int")).toEqual({ ok: false, reason: "reserved" });
    expect(checkVariableName(ws, "digitalWrite")).toEqual({ ok: false, reason: "reserved" });
    expect(checkVariableName(ws, "HIGH")).toEqual({ ok: false, reason: "reserved" });
  });

  it("noto'g'ri belgilarni va bo'sh nomni rad etadi", () => {
    const ws = emptyWorkspace();
    expect(checkVariableName(ws, "")).toEqual({ ok: false, reason: "empty" });
    expect(checkVariableName(ws, "2qiymat")).toEqual({ ok: false, reason: "invalid" });
    expect(checkVariableName(ws, "qiymat soni")).toEqual({ ok: false, reason: "invalid" });
  });

  it("takrorlanishni rad etadi", () => {
    const ws = addVariable(emptyWorkspace(), "qiymat");
    expect(checkVariableName(ws, "qiymat")).toEqual({ ok: false, reason: "duplicate" });
    expect(checkVariableName(ws, "qiymat2")).toEqual({ ok: true, name: "qiymat2" });
  });
});

/* ─────────────────────────── Generator ─────────────────────────── */

describe("blok → Arduino kod", () => {
  it("bo'sh ish maydonidan ham to'g'ri eskiz chiqadi", () => {
    const program = generateProgram(emptyWorkspace());
    expect(program.code).toContain("void setup()");
    expect(program.code).toContain("void loop()");
    expect(parseSketch(program.code).ok).toBe(true);
  });

  it("LED Blink — §26 dagi kutilgan kodni beradi", () => {
    const b = new Builder();
    const start = b.put("event_on_start", 40, 40);
    const forever = b.put("event_forever", 40, 240);

    const setupIds = b.fill(start, ["pin_mode"]);
    b.field(setupIds[0]!, "pin", "13");
    b.field(setupIds[0]!, "mode", "OUTPUT");

    const loopIds = b.fill(forever, [
      "pin_digital_write",
      "control_wait_seconds",
      "pin_digital_write",
      "control_wait_seconds",
    ]);
    b.field(loopIds[0]!, "level", "HIGH");
    b.field(loopIds[2]!, "level", "LOW");

    const program = generateProgram(b.ws);

    expect(program.code).toBe(
      [
        "void setup() {",
        "  pinMode(13, OUTPUT);",
        "}",
        "",
        "void loop() {",
        "  digitalWrite(13, HIGH);",
        "  delay(1000);",
        "  digitalWrite(13, LOW);",
        "  delay(1000);",
        "}",
        "",
      ].join("\n"),
    );
    expect(program.warnings).toHaveLength(0);
    expect(parseSketch(program.code).ok).toBe(true);
  });

  it("bir xil ish maydoni har doim bir xil kod beradi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 40, 40);
    b.fill(forever, ["pin_digital_write", "control_wait_millis"]);

    expect(b.code()).toBe(b.code());
  });

  it("bloklarning ish maydonidagi o'rni kod tartibiga ta'sir qilmaydi", () => {
    // «Doim takrorla» ekranda YUQORIDA tursa ham, kodda setup birinchi bo'ladi.
    const b = new Builder();
    const forever = b.put("event_forever", 40, 20);
    const start = b.put("event_on_start", 40, 400);
    b.fill(start, ["pin_mode"]);
    b.fill(forever, ["pin_digital_write"]);

    const code = b.code();
    expect(code.indexOf("void setup")).toBeLessThan(code.indexOf("void loop"));
    expect(code).toContain("pinMode(13, OUTPUT);");
  });

  it("qiymat bloki uyaga ulansa ifoda sifatida chiqadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const waitIds = b.fill(forever, ["control_wait_millis"]);

    const read = b.put("pin_digital_read", 300, 300);
    b.ws = connectValue(b.ws, read, waitIds[0]!, "ms");
    b.field(read, "pin", "2");

    expect(b.code()).toContain("delay(digitalRead(2));");
  });

  it("kasr soniya butun millisekundga aylanadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["control_wait_seconds"]);
    b.field(ids[0]!, "seconds", "0.5");

    expect(b.code()).toContain("delay(500);");
  });

  it("boshlanish blokiga ulanmagan blok uchun ogohlantiradi", () => {
    const b = new Builder();
    b.put("pin_digital_write", 40, 40);

    const program = generateProgram(b.ws);
    expect(program.warnings.map((w) => w.code)).toContain("orphan-block");
    expect(program.code).not.toContain("digitalWrite");
  });

  it("ikkinchi «Doim takrorla» bloki uchun ogohlantiradi", () => {
    const b = new Builder();
    const first = b.put("event_forever", 40, 40);
    b.put("event_forever", 40, 300);
    b.fill(first, ["pin_digital_write"]);

    expect(generateProgram(b.ws).warnings.map((w) => w.code)).toContain("duplicate-forever");
  });
});

/* ─────────────────────────── Saqlash ─────────────────────────── */

describe("ish maydonini saqlash va tiklash", () => {
  it("JSON orqali aylanib qaytganda bir xil kod beradi", () => {
    const b = new Builder();
    const start = b.put("event_on_start", 40, 40);
    const forever = b.put("event_forever", 40, 240);
    b.fill(start, ["pin_mode"]);
    b.fill(forever, ["pin_digital_write", "control_wait_seconds"]);
    b.ws = addVariable(b.ws, "hisob");

    const restored = parseWorkspace(JSON.parse(JSON.stringify(b.ws)));
    expect(restored).not.toBeNull();
    expect(generateProgram(restored!).code).toBe(b.code());
    expect(restored!.variables.map((v) => v.name)).toEqual(["hisob"]);
  });

  it("noma'lum blok turi tashlab yuboriladi", () => {
    const ws = sanitizeWorkspace({
      version: 1,
      blocks: {
        x: {
          id: "x",
          type: "boshqa-sayt-bloki",
          fields: {},
          inputs: {},
          statements: {},
          next: null,
        },
      },
      tops: { x: { x: 0, y: 0 } },
      variables: [],
    });
    expect(Object.keys(ws.blocks)).toHaveLength(0);
  });

  it("yo'q blokka havola va halqa tozalanadi", () => {
    const ws = sanitizeWorkspace({
      version: 1,
      blocks: {
        a: {
          id: "a",
          type: "pin_digital_write",
          fields: {},
          inputs: {},
          statements: {},
          next: "b",
        },
        // Halqa: b → a → b.
        b: {
          id: "b",
          type: "pin_digital_write",
          fields: {},
          inputs: {},
          statements: {},
          next: "a",
        },
        c: {
          id: "c",
          type: "pin_digital_write",
          fields: {},
          inputs: {},
          statements: {},
          next: "yoq-bunday",
        },
      },
      tops: { a: { x: 0, y: 0 } },
      variables: [],
    });

    expect(stackIds(ws, "a")).toEqual(["a", "b"]);
    expect(ws.blocks.b!.next).toBeNull();
    expect(ws.blocks.c!.next).toBeNull();
    // `c` hech kimga ulanmagan — ildiz sifatida joy oladi.
    expect(ws.tops.c).toBeDefined();
  });

  it("band nomli o'zgaruvchi tiklanmaydi", () => {
    const ws = sanitizeWorkspace({
      version: 1,
      blocks: {},
      tops: {},
      variables: [
        { id: "v1", name: "int", type: "int" },
        { id: "v2", name: "yaxshi", type: "int" },
      ],
    });
    expect(ws.variables.map((v) => v.name)).toEqual(["yaxshi"]);
  });

  it("kelajakdagi versiya bo'sh maydon bilan almashtiriladi", () => {
    expect(sanitizeWorkspace({ version: 99, blocks: {}, tops: {}, variables: [] }).version).toBe(1);
  });

  it("buzuq JSON `null` qaytaradi", () => {
    expect(parseWorkspace({ salom: "dunyo" })).toBeNull();
    expect(parseWorkspace(null)).toBeNull();
  });
});

/* ─────────────────────────── Matnlar ─────────────────────────── */

describe("blok matnlari", () => {
  it("kalitni o'zbekcha matnga aylantiradi", () => {
    expect(t("blocks.events.onStart")).toBe("Arduino ishga tushganda");
  });

  it("boshqa tillar tarjima qilingan", () => {
    expect(t("blocks.events.forever", undefined, "en")).toBe("forever");
    expect(t("blocks.events.forever", undefined, "ru")).toBe("Всегда повторять");
  });

  it("noma'lum kalit kalitning o'zini qaytaradi", () => {
    // Ekranda `blocks.foo.bar` ko'rinishi tarjima yo'qolganini darhol bildiradi.
    expect(t("blocks.yoq.bunday.kalit", undefined, "en")).toBe("blocks.yoq.bunday.kalit");
  });

  it("yorliqni uya bo'laklariga ajratadi", () => {
    const parts = splitLabel("blocks.pins.digitalWrite");
    expect(parts.filter((p) => p.kind === "slot").map((p) => p.name)).toEqual(["pin", "level"]);
  });
});

/* ═══════════════════════════ FAZA 2 ═══════════════════════════ */

/**
 * Faza 2: mantiq, matematika, o'zgaruvchilar, analog pinlar va Serial.
 *
 * Bu yerdagi har bir test HOSIL BO'LGAN kodni `parseSketch()` bilan ham
 * tekshiradi. Sabab: generator "chiroyli ko'rinadigan" matn chiqarishi
 * mumkin, lekin agar laboratoriya parseri uni tushunmasa, bola blokni
 * ulab qo'yib simulyatsiyada xato oladi — ya'ni test yolg'on ishonch
 * bergan bo'lardi.
 */

/** Har bir test uchun bir xil shart: kod parserdan o'tsin. */
function expectValidSketch(code: string): void {
  const result = parseSketch(code);
  if (!result.ok) throw new Error(`Kod parserdan o'tmadi: ${result.errors[0]?.message}`);
  expect(result.ok).toBe(true);
}

/** Ro'yxat uyasining variantlari (funksiya ko'rinishidagilar uchun kontekst bilan). */
function dropdownValues(type: string, slotName: string, variables: string[] = []): string[] {
  const def = getBlockDefinition(type)!;
  const slot = def.slots.find((s) => s.name === slotName);
  if (slot?.kind !== "dropdown") throw new Error(`${type}.${slotName} ro'yxat emas`);
  const options =
    typeof slot.options === "function"
      ? slot.options({
          circuit: { nodes: [], wires: [] },
          variables: variables.map((name) => ({ id: name, name, type: "int" as const })),
        })
      : [...slot.options];
  return options.map((o) => o.value);
}

describe("mantiq bloklari", () => {
  it("agar/aks holda — kutilgan C++ matnini beradi", () => {
    const b = new Builder();
    const start = b.put("event_on_start", 40, 40);
    const forever = b.put("event_forever", 40, 240);

    const setupIds = b.fill(start, ["pin_mode"]);
    b.field(setupIds[0]!, "pin", "9");

    const [branch] = b.fill(forever, ["logic_if_else"]);
    const compare = b.plug("logic_compare", branch!, "IF");
    b.plug("pin_analog_read", compare, "A");
    b.field(compare, "OP", "<");
    b.field(compare, "B", "500");

    const [onLine] = b.fill(branch!, ["pin_digital_write"], "DO");
    b.field(onLine!, "pin", "9");
    b.field(onLine!, "level", "HIGH");

    const [offLine] = b.fill(branch!, ["pin_digital_write"], "ELSE");
    b.field(offLine!, "pin", "9");
    b.field(offLine!, "level", "LOW");

    const program = generateProgram(b.ws);
    expect(program.code).toBe(
      [
        "void setup() {",
        "  pinMode(9, OUTPUT);",
        "}",
        "",
        "void loop() {",
        "  if (analogRead(A0) < 500) {",
        "    digitalWrite(9, HIGH);",
        "  } else {",
        "    digitalWrite(9, LOW);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    expect(program.warnings).toHaveLength(0);
    expectValidSketch(program.code);
  });

  it("bo'sh «aks holda» bo'lsa ham to'g'ri kod chiqadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [branch] = b.fill(forever, ["logic_if"]);
    b.plug("logic_boolean", branch!, "IF");
    b.fill(branch!, ["pin_digital_write"], "DO");

    const code = b.code();
    expect(code).toContain("if (true) {");
    expectValidSketch(code);
  });

  it("`a < 5 && b > 2` ortiqcha qavssiz chiqadi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "a");
    b.ws = addVariable(b.ws, "b");

    const forever = b.put("event_forever", 0, 0);
    const [branch] = b.fill(forever, ["logic_if"]);

    const andOr = b.plug("logic_and_or", branch!, "IF");
    b.field(andOr, "OP", "&&");

    const left = b.plug("logic_compare", andOr, "A");
    b.field(b.plug("variables_get", left, "A"), "VAR", "a");
    b.field(left, "OP", "<");
    b.field(left, "B", "5");

    const right = b.plug("logic_compare", andOr, "B");
    b.field(b.plug("variables_get", right, "A"), "VAR", "b");
    b.field(right, "OP", ">");
    b.field(right, "B", "2");

    const code = b.code();
    expect(code).toContain("if (a < 5 && b > 2) {");
    expectValidSketch(code);
  });

  it("inkor shartni qavsga oladi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "a");

    const forever = b.put("event_forever", 0, 0);
    const [branch] = b.fill(forever, ["logic_if"]);

    const not = b.plug("logic_not", branch!, "IF");
    const compare = b.plug("logic_compare", not, "A");
    b.field(b.plug("variables_get", compare, "A"), "VAR", "a");
    b.field(compare, "OP", "<");
    b.field(compare, "B", "5");

    const code = b.code();
    expect(code).toContain("if (!(a < 5)) {");
    expectValidSketch(code);
  });
});

describe("matematika bloklari", () => {
  it("map — sensor qiymatini PWM oralig'iga o'tkazadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [write] = b.fill(forever, ["pin_analog_write"]);

    const map = b.plug("math_map", write!, "VALUE");
    b.plug("pin_analog_read", map, "VALUE");

    const code = b.code();
    expect(code).toContain("analogWrite(9, map(analogRead(A0), 0, 1023, 0, 255));");
    expectValidSketch(code);
  });

  it("`(a + 1) * 2` da kerakli qavs qo'yiladi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "a");
    b.ws = addVariable(b.ws, "natija");

    const forever = b.put("event_forever", 0, 0);
    const [assign] = b.fill(forever, ["variables_set"]);
    b.field(assign!, "VAR", "natija");

    const outer = b.plug("math_arithmetic", assign!, "VALUE");
    b.field(outer, "OP", "*");
    b.field(outer, "B", "2");

    const inner = b.plug("math_arithmetic", outer, "A");
    b.field(b.plug("variables_get", inner, "A"), "VAR", "a");
    b.field(inner, "OP", "+");
    b.field(inner, "B", "1");

    const code = b.code();
    expect(code).toContain("natija = (a + 1) * 2;");
    expectValidSketch(code);
  });

  it("random, min/max va constrain Arduino funksiyalarini chaqiradi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "x");
    const forever = b.put("event_forever", 0, 0);

    const ids = b.fill(forever, ["variables_set", "variables_set", "variables_set"]);
    for (const id of ids) b.field(id, "VAR", "x");

    b.plug("math_random", ids[0]!, "VALUE");

    const minMax = b.plug("math_min_max", ids[1]!, "VALUE");
    b.field(minMax, "OP", "max");
    b.field(minMax, "A", "3");
    b.field(minMax, "B", "7");

    const constrain = b.plug("math_constrain", ids[2]!, "VALUE");
    b.field(constrain, "VALUE", "300");

    const code = b.code();
    expect(code).toContain("x = random(1, 10);");
    expect(code).toContain("x = max(3, 7);");
    expect(code).toContain("x = constrain(300, 0, 255);");
    expectValidSketch(code);
  });
});

describe("o'zgaruvchi bloklari", () => {
  it("e'lon, o'zlashtirish va oshirish birga ishlaydi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "hisob");

    const start = b.put("event_on_start", 40, 40);
    const forever = b.put("event_forever", 40, 240);

    const [reset] = b.fill(start, ["variables_set"]);
    b.field(reset!, "VAR", "hisob");
    b.field(reset!, "VALUE", "0");

    const [step] = b.fill(forever, ["variables_change"]);
    b.field(step!, "VAR", "hisob");
    b.field(step!, "DELTA", "1");

    const program = generateProgram(b.ws);
    expect(program.code).toBe(
      [
        "int hisob = 0;",
        "",
        "void setup() {",
        "  hisob = 0;",
        "}",
        "",
        "void loop() {",
        "  hisob += 1;",
        "}",
        "",
      ].join("\n"),
    );
    expect(program.warnings).toHaveLength(0);
    expectValidSketch(program.code);
  });

  it("ro'yxat ish maydonidagi o'zgaruvchilardan quriladi", () => {
    expect(dropdownValues("variables_get", "VAR")).toEqual([]);
    expect(dropdownValues("variables_set", "VAR", ["hisob", "vaqt"])).toEqual(["hisob", "vaqt"]);
  });

  it("o'zgaruvchi tanlanmagan bo'lsa buzuq qator yozilmaydi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    b.fill(forever, ["variables_set"]);

    const program = generateProgram(b.ws);
    expect(program.warnings.map((w) => w.code)).toContain("missing-variable");
    expect(program.code).not.toContain("=");
    expectValidSketch(program.code);
  });

  it("band nomli o'zgaruvchi umuman yaratilmaydi", () => {
    const ws = addVariable(emptyWorkspace(), "int");
    expect(ws.variables).toHaveLength(0);
    expect(checkVariableName(emptyWorkspace(), "int")).toEqual({ ok: false, reason: "reserved" });
  });
});

describe("analog pin bloklari", () => {
  it("analogRead faqat A0–A5 dan o'qiydi", () => {
    expect(dropdownValues("pin_analog_read", "pin")).toEqual(["A0", "A1", "A2", "A3", "A4", "A5"]);
  });

  it("analogWrite ro'yxatida faqat PWM pinlar bor", () => {
    const values = dropdownValues("pin_analog_write", "pin");
    expect(values).toEqual(["3", "5", "6", "9", "10", "11"]);
    expect(values).not.toContain("13");
  });
});

describe("Serial bloklari", () => {
  it("begin unutilgan bo'lsa setup() ga o'zi qo'shiladi va ogohlantiradi (§25)", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [print] = b.fill(forever, ["serial_println"]);
    b.field(print!, "TEXT", "Salom");

    const program = generateProgram(b.ws);
    expect(program.code).toBe(
      [
        "void setup() {",
        "  Serial.begin(9600);",
        "}",
        "",
        "void loop() {",
        '  Serial.println("Salom");',
        "}",
        "",
      ].join("\n"),
    );
    expect(program.warnings.map((w) => w.code)).toEqual(["serial-begin-missing"]);
    expectValidSketch(program.code);
  });

  it("begin bloki qo'yilgan bo'lsa ikkinchi marta qo'shilmaydi", () => {
    const b = new Builder();
    const start = b.put("event_on_start", 40, 40);
    const forever = b.put("event_forever", 40, 240);

    const [begin] = b.fill(start, ["serial_begin"]);
    b.field(begin!, "BAUD", "115200");
    b.fill(forever, ["serial_print"]);

    const program = generateProgram(b.ws);
    expect(program.code).toContain("Serial.begin(115200);");
    expect(program.code.match(/Serial\.begin/g)).toHaveLength(1);
    expect(program.warnings).toHaveLength(0);
    expectValidSketch(program.code);
  });

  it("`if` ichidagi Serial ham hisobga olinadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [branch] = b.fill(forever, ["logic_if"]);
    b.plug("logic_boolean", branch!, "IF");
    b.fill(branch!, ["serial_println"], "DO");

    const program = generateProgram(b.ws);
    expect(program.code).toContain("Serial.begin(9600);");
    expect(program.warnings.map((w) => w.code)).toContain("serial-begin-missing");
    expectValidSketch(program.code);
  });

  it("Serial ishlatilmasa hech narsa qo'shilmaydi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    b.fill(forever, ["pin_digital_write"]);

    const program = generateProgram(b.ws);
    expect(program.code).not.toContain("Serial");
    expect(program.warnings).toHaveLength(0);
  });
});

describe("Faza 2 bloklarini saqlash", () => {
  it("har bir yangi blok turi saqlanib-tiklanadi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "hisob");
    const forever = b.put("event_forever", 40, 40);

    const [branch] = b.fill(forever, ["logic_if_else"]);
    const compare = b.plug("logic_compare", branch!, "IF");
    b.plug("pin_analog_read", compare, "A");

    const body = b.fill(
      branch!,
      ["variables_set", "variables_change", "pin_analog_write", "serial_begin", "serial_println"],
      "DO",
    );
    b.field(body[0]!, "VAR", "hisob");
    b.field(body[1]!, "VAR", "hisob");

    const [elseLine] = b.fill(branch!, ["variables_set"], "ELSE");
    b.field(elseLine!, "VAR", "hisob");
    b.plug("math_map", elseLine!, "VALUE");

    const restored = parseWorkspace(JSON.parse(JSON.stringify(b.ws)));
    expect(restored).not.toBeNull();
    expect(generateProgram(restored!).code).toBe(b.code());
    expect(Object.keys(restored!.blocks)).toHaveLength(Object.keys(b.ws.blocks).length);
  });

  it("bir xil ish maydoni har doim bir xil kod beradi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "hisob");
    const forever = b.put("event_forever", 0, 0);
    const [branch] = b.fill(forever, ["logic_if"]);
    b.plug("logic_compare", branch!, "IF");
    b.fill(branch!, ["serial_println", "variables_change"], "DO");

    expect(b.code()).toBe(b.code());
  });
});

describe("Faza 2 matnlari", () => {
  it("har bir blokning yorlig'i va tooltipi tarjima jadvalida bor", () => {
    const missing: string[] = [];
    for (const def of allBlockDefinitions()) {
      if (t(def.messageKey) === def.messageKey) missing.push(def.messageKey);
      if (def.tooltipKey && t(def.tooltipKey) === def.tooltipKey) missing.push(def.tooltipKey);
    }
    expect(missing).toEqual([]);
  });

  it("yorliqdagi joy egallovchilar mavjud uyalarga mos keladi", () => {
    const wrong: string[] = [];
    for (const def of allBlockDefinitions()) {
      const names = new Set(def.slots.map((slot) => slot.name));
      for (const part of splitLabel(def.messageKey)) {
        if (part.kind === "slot" && !names.has(part.name)) wrong.push(`${def.type}.${part.name}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

/* ═══════════════════════════ FAZA 3 ═══════════════════════════ */

/**
 * Faza 3: sensorlar, motorlar, ekran.
 *
 * Asosiy xavf — TAKRORLANISH: o'nta servo bloki o'nta `#include` yoki o'nta
 * `attach` bergan bo'lsa, kod kompilyatsiya bo'lmasdi. Shuning uchun
 * testlarning ko'pi "necha marta chiqdi?" degan savolga javob beradi.
 */

/** Matnda naqsh necha marta uchraganini sanaydi. */
function countOf(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

describe("sensor bloklari", () => {
  it("TMP36 formulani yordamchi funksiyaga chiqaradi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "harorat");
    const forever = b.put("event_forever", 0, 0);
    const [assign] = b.fill(forever, ["variables_set"]);
    b.field(assign!, "VAR", "harorat");
    b.plug("sensor_tmp36", assign!, "VALUE");

    const code = b.code();
    expect(code).toContain(
      [
        "float okuHarorat(int pin) {",
        "  return (analogRead(pin) * 5.0 / 1024.0 - 0.5) * 100;",
        "}",
      ].join("\n"),
    );
    expect(code).toContain("harorat = okuHarorat(A0);");
    expectValidSketch(code);
  });

  it("HC-SR04 yordamchi funksiyasi bir marta chiqadi va pinlarni sozlaydi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "masofa");
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["variables_set", "variables_set"]);
    for (const id of ids) {
      b.field(id, "VAR", "masofa");
      b.plug("sensor_ultrasonic", id, "VALUE");
    }

    const code = b.code();
    expect(code).toContain(
      [
        "long okuMasofa(int trig, int echo) {",
        "  digitalWrite(trig, LOW);",
        "  delayMicroseconds(2);",
        "  digitalWrite(trig, HIGH);",
        "  delayMicroseconds(10);",
        "  digitalWrite(trig, LOW);",
        "  return pulseIn(echo, HIGH) / 58;",
        "}",
      ].join("\n"),
    );
    expect(countOf(code, /long okuMasofa/g)).toBe(1);
    expect(code).toContain("pinMode(9, OUTPUT);");
    expect(code).toContain("pinMode(10, INPUT);");
    expect(code).toContain("masofa = okuMasofa(9, 10);");
    expectValidSketch(code);
  });

  it("tuproq namligi foiz rejimida map() beradi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "namlik");
    const forever = b.put("event_forever", 0, 0);
    const [assign] = b.fill(forever, ["variables_set"]);
    b.field(assign!, "VAR", "namlik");
    const soil = b.plug("sensor_soil", assign!, "VALUE");

    b.field(soil, "MODE", "percent");
    expect(b.code()).toContain("namlik = map(analogRead(A0), 0, 1023, 0, 100);");

    b.field(soil, "MODE", "raw");
    expect(b.code()).toContain("namlik = analogRead(A0);");
    expectValidSketch(b.code());
  });

  it("pull-up bilan ulangan tugma LOW da bosilgan hisoblanadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [branch] = b.fill(forever, ["logic_if"]);
    const button = b.plug("sensor_button", branch!, "IF");
    b.fill(branch!, ["output_led_on"], "DO");

    expect(b.code()).toContain("if (digitalRead(2) == LOW) {");
    expect(b.code()).toContain("pinMode(2, INPUT_PULLUP);");

    b.field(button, "MODE", "INPUT");
    expect(b.code()).toContain("if (digitalRead(2) == HIGH) {");
    expect(b.code()).toContain("pinMode(2, INPUT);");
    expectValidSketch(b.code());
  });

  it("DHT11 va LCD birga — har bir #include bittadan", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["display_lcd_value", "display_lcd_value", "display_lcd_clear"]);
    b.plug("sensor_dht_temp", ids[0]!, "VALUE");
    b.plug("sensor_dht_hum", ids[1]!, "VALUE");

    const program = generateProgram(b.ws);
    expect(countOf(program.code, /#include <DHT\.h>/g)).toBe(1);
    expect(countOf(program.code, /#include <LiquidCrystal\.h>/g)).toBe(1);
    // Ikkala DHT bloki bir xil pinda — bitta obyekt.
    expect(countOf(program.code, /DHT dht\(/g)).toBe(1);
    expect(countOf(program.code, /LiquidCrystal lcd\(/g)).toBe(1);
    expect(countOf(program.code, /lcd\.begin/g)).toBe(1);
    expect(program.libraries).toEqual(["DHT", "LiquidCrystal"]);
    expectValidSketch(program.code);
  });

  it("ikki xil pindagi DHT ikkita obyekt beradi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "a");
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["variables_set", "variables_set"]);
    for (const id of ids) b.field(id, "VAR", "a");
    b.field(b.plug("sensor_dht_temp", ids[0]!, "VALUE"), "pin", "2");
    b.field(b.plug("sensor_dht_temp", ids[1]!, "VALUE"), "pin", "4");

    const code = b.code();
    expect(code).toContain("DHT dht(2, DHT11);");
    expect(code).toContain("DHT dht2(4, DHT11);");
    expect(code).toContain("dht.begin();");
    expect(code).toContain("dht2.begin();");
    expectValidSketch(code);
  });
});

describe("motor bloklari", () => {
  it("servo — attach setup() da, write loop() da", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [write] = b.fill(forever, ["motor_servo_write"]);
    b.field(write!, "ANGLE", "45");

    const program = generateProgram(b.ws);
    expect(program.code).toBe(
      [
        "#include <Servo.h>",
        "",
        "Servo servo1;",
        "",
        "void setup() {",
        "  servo1.attach(9);",
        "}",
        "",
        "void loop() {",
        "  servo1.write(45);",
        "}",
        "",
      ].join("\n"),
    );
    expect(program.libraries).toEqual(["Servo"]);
    expectValidSketch(program.code);
  });

  it("ikkita servo — servo1 va servo2, ikkita alohida attach", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["motor_servo_write", "motor_servo_write"]);
    b.field(ids[0]!, "pin", "9");
    b.field(ids[1]!, "pin", "10");

    const code = b.code();
    expect(code).toContain("Servo servo1;");
    expect(code).toContain("Servo servo2;");
    expect(code).toContain("servo1.attach(9);");
    expect(code).toContain("servo2.attach(10);");
    expect(countOf(code, /#include <Servo\.h>/g)).toBe(1);
    expectValidSketch(code);
  });

  it("bir xil pindagi ikki servo bloki bitta obyekt beradi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["motor_servo_write", "motor_servo_write"]);
    b.field(ids[0]!, "ANGLE", "0");
    b.field(ids[1]!, "ANGLE", "180");

    const code = b.code();
    expect(countOf(code, /Servo servo/g)).toBe(1);
    expect(countOf(code, /\.attach\(/g)).toBe(1);
    expect(code).toContain("servo1.write(0);");
    expect(code).toContain("servo1.write(180);");
    expectValidSketch(code);
  });

  it("DC motor yo'nalish va tezlik pinlarini boshqaradi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["motor_dc_speed", "motor_dc_forward", "motor_dc_stop"]);
    b.field(ids[0]!, "SPEED", "180");

    const code = b.code();
    expect(code).toContain("analogWrite(6, 180);");
    expect(code).toContain("digitalWrite(8, HIGH);");
    expect(code).toContain("digitalWrite(7, LOW);");
    // `pinMode` kalit pin bo'yicha — uch blok ham 8 va 7 ni ishlatadi.
    expect(countOf(code, /pinMode\(8, OUTPUT\);/g)).toBe(1);
    expectValidSketch(code);
  });
});

describe("chiqish bloklari", () => {
  it("LED bloklari pin rejimini o'zi sozlaydi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    b.fill(forever, ["output_led_on", "control_wait_seconds", "output_led_off"]);

    const program = generateProgram(b.ws);
    expect(program.code).toBe(
      [
        "void setup() {",
        "  pinMode(13, OUTPUT);",
        "}",
        "",
        "void loop() {",
        "  digitalWrite(13, HIGH);",
        "  delay(1000);",
        "  digitalWrite(13, LOW);",
        "}",
        "",
      ].join("\n"),
    );
    expect(program.warnings).toHaveLength(0);
    expectValidSketch(program.code);
  });

  it("umumiy anodli RGB LEDda qiymat teskarilanadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [rgb] = b.fill(forever, ["output_rgb_color"]);
    b.field(rgb!, "R", "255");
    b.field(rgb!, "G", "0");
    b.field(rgb!, "B", "64");

    expect(b.code()).toContain("analogWrite(9, 255);");
    expect(b.code()).toContain("analogWrite(11, 64);");

    b.field(rgb!, "COMMON", "anode");
    const code = b.code();
    expect(code).toContain("analogWrite(9, 0);");
    expect(code).toContain("analogWrite(10, 255);");
    expect(code).toContain("analogWrite(11, 191);");
    expectValidSketch(code);
  });

  it("buzzer «bip» bloki uch qator beradi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    b.fill(forever, ["output_buzzer_beep"]);

    const code = b.code();
    expect(code).toContain("  tone(8, 1000);\n  delay(200);\n  noTone(8);");
    expectValidSketch(code);
  });
});

describe("ekran bloklari", () => {
  it("LCD obyekti va begin() bir marta chiqadi", () => {
    const b = new Builder();
    const start = b.put("event_on_start", 40, 40);
    const forever = b.put("event_forever", 40, 240);
    b.fill(start, ["display_lcd_clear"]);
    const ids = b.fill(forever, ["display_lcd_cursor", "display_lcd_print"]);
    b.field(ids[0]!, "ROW", "1");
    b.field(ids[1]!, "TEXT", "Salom");

    const program = generateProgram(b.ws);
    expect(program.code).toBe(
      [
        "#include <LiquidCrystal.h>",
        "",
        "LiquidCrystal lcd(12, 11, 5, 4, 3, 2);",
        "",
        "void setup() {",
        "  lcd.begin(16, 2);",
        "  lcd.clear();",
        "}",
        "",
        "void loop() {",
        "  lcd.setCursor(0, 1);",
        '  lcd.print("Salom");',
        "}",
        "",
      ].join("\n"),
    );
    expectValidSketch(program.code);
  });

  it("boshqa ulanish tanlansa ikkinchi LCD obyekti chiqadi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["display_lcd_clear", "display_lcd_clear"]);
    b.field(ids[1]!, "PINS", "8,9,4,5,6,7");

    const code = b.code();
    expect(code).toContain("LiquidCrystal lcd(12, 11, 5, 4, 3, 2);");
    expect(code).toContain("LiquidCrystal lcd2(8, 9, 4, 5, 6, 7);");
    expect(countOf(code, /#include <LiquidCrystal\.h>/g)).toBe(1);
    expectValidSketch(code);
  });
});

/* ═══════════════════════════ FAZA 4 ═══════════════════════════ */

/**
 * Faza 4: bloklar SXEMANI ko'radi.
 *
 * Bu yerdagi testlar HAQIQIY sxema quradi (komponentlar + simlar) va
 * `buildNetlist` orqali tekshiradi. Soxta netlist ishlatilmaydi: agar
 * `boardPinFor` rezistor orqali o'ta olmasa yoki pin nomi katalogdagidan
 * farq qilsa, aynan shu testlar buni ushlaydi.
 */

/** Sxema quruvchi: komponent qo'yish va sim tortish. */
class Circuit {
  nodes: CircuitNode[] = [];
  wires: WireConnection[] = [];
  private seq = 0;

  add(type: string, settings: Record<string, string | number | boolean> = {}): string {
    const id = `${type}-${++this.seq}`;
    this.nodes.push({ id, type, x: 0, y: 0, rotation: 0, settings });
    return id;
  }

  wire(fromNode: string, fromPin: string, toNode: string, toPin: string): void {
    this.wires.push({
      id: `w${this.wires.length + 1}`,
      from: { nodeId: fromNode, pinId: fromPin },
      to: { nodeId: toNode, pinId: toPin },
      color: "blue",
    });
  }

  get value(): LabCircuit {
    return { nodes: this.nodes, wires: this.wires };
  }

  get context() {
    return { circuit: this.value, netlist: buildNetlist(this.value), variables: [] };
  }
}

/** LED, rezistor va Arduino'dan iborat eng oddiy ishlaydigan sxema. */
function ledCircuit(pin = "D8"): { circuit: Circuit; board: string; led: string } {
  const c = new Circuit();
  const board = c.add("arduino-uno");
  const led = c.add("led");
  const resistor = c.add("resistor", { ohms: 220 });

  c.wire(board, pin, resistor, "a");
  c.wire(resistor, "b", led, "anode");
  c.wire(led, "cathode", board, "GND1");
  return { circuit: c, board, led };
}

describe("komponentga bog'langan bloklar (§33)", () => {
  it("sxemadagi LED pini koddan chiqadi", () => {
    const { circuit, led } = ledCircuit("D8");

    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [on] = b.fill(forever, ["component_led_on"]);
    b.field(on!, "NODE", led);

    const program = generateProgram(b.ws, { circuit: circuit.value });
    expect(program.code).toContain("pinMode(8, OUTPUT);");
    expect(program.code).toContain("digitalWrite(8, HIGH);");
    expect(program.warnings).toHaveLength(0);
    expectValidSketch(program.code);
  });

  it("LED boshqa pinga ko'chirilsa blokka tegmasdan kod o'zgaradi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [on] = b.fill(forever, ["component_led_on"]);

    const first = ledCircuit("D8");
    b.field(on!, "NODE", first.led);
    expect(generateProgram(b.ws, { circuit: first.circuit.value }).code).toContain(
      "digitalWrite(8, HIGH);",
    );

    // Aynan o'sha ish maydoni, boshqa sxema.
    const second = ledCircuit("D5");
    b.field(on!, "NODE", second.led);
    expect(generateProgram(b.ws, { circuit: second.circuit.value }).code).toContain(
      "digitalWrite(5, HIGH);",
    );
  });

  it("analog sensor pini A0 ko'rinishida chiqadi", () => {
    const c = new Circuit();
    const board = c.add("arduino-uno");
    const ldr = c.add("ldr");
    c.wire(board, "A2", ldr, "signal");
    c.wire(board, "5V", ldr, "vcc");
    c.wire(board, "GND1", ldr, "gnd");

    const b = new Builder();
    b.ws = addVariable(b.ws, "yorugllik");
    const forever = b.put("event_forever", 0, 0);
    const [assign] = b.fill(forever, ["variables_set"]);
    b.field(assign!, "VAR", "yorugllik");
    b.field(b.plug("component_light", assign!, "VALUE"), "NODE", ldr);

    const code = generateProgram(b.ws, { circuit: c.value }).code;
    expect(code).toContain("yorugllik = analogRead(A2);");
    expectValidSketch(code);
  });

  it("komponent tanlanmagan bo'lsa xavfsiz pin va ogohlantirish beradi", () => {
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    b.fill(forever, ["component_led_on"]);

    const program = generateProgram(b.ws, { circuit: { nodes: [], wires: [] } });
    expect(program.warnings.map((w) => w.code)).toContain("component-missing");
    expect(program.code).toContain("digitalWrite(13, HIGH);");
    expectValidSketch(program.code);
  });

  it("LCD oltala pinni sxemadan o'qiydi", () => {
    const c = new Circuit();
    const board = c.add("arduino-uno");
    const lcd = c.add("lcd1602");
    const wiring: [string, string][] = [
      ["D12", "rs"],
      ["D11", "e"],
      ["D5", "d4"],
      ["D4", "d5"],
      ["D3", "d6"],
      ["D2", "d7"],
    ];
    for (const [boardPin, lcdPin] of wiring) c.wire(board, boardPin, lcd, lcdPin);
    c.wire(board, "5V", lcd, "vcc");
    c.wire(board, "GND1", lcd, "gnd");

    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [print] = b.fill(forever, ["component_lcd_print"]);
    b.field(print!, "NODE", lcd);
    b.field(print!, "TEXT", "Salom");

    const program = generateProgram(b.ws, { circuit: c.value });
    expect(program.code).toContain("LiquidCrystal lcd(12, 11, 5, 4, 3, 2);");
    expect(program.code).toContain("lcd.begin(16, 2);");
    expect(program.code).toContain('lcd.print("Salom");');
    expect(program.warnings).toHaveLength(0);
    expectValidSketch(program.code);
  });

  it("servo pini sxemadan olinadi, obyekt bir marta e'lon qilinadi", () => {
    const c = new Circuit();
    const board = c.add("arduino-uno");
    const servo = c.add("servo");
    c.wire(board, "D6", servo, "signal");
    c.wire(board, "5V", servo, "vcc");
    c.wire(board, "GND1", servo, "gnd");

    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["component_servo_write", "component_servo_write"]);
    for (const id of ids) b.field(id, "NODE", servo);
    b.field(ids[1]!, "ANGLE", "180");

    const code = generateProgram(b.ws, { circuit: c.value }).code;
    expect(code).toContain("servo1.attach(6);");
    expect(countOf(code, /Servo servo/g)).toBe(1);
    expect(countOf(code, /\.attach\(/g)).toBe(1);
    expect(code).toContain("servo1.write(180);");
    expectValidSketch(code);
  });
});

describe("sxema tekshiruvi (§34)", () => {
  it("to'g'ri ulangan LEDda muammo yo'q", () => {
    const { circuit, led } = ledCircuit("D8");
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [on] = b.fill(forever, ["component_led_on"]);
    b.field(on!, "NODE", led);

    expect(validateWorkspace(b.ws, circuit.context)).toEqual([]);
  });

  it("komponent sxemadan o'chirilsa xato beradi", () => {
    const { circuit, led } = ledCircuit("D8");
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [on] = b.fill(forever, ["component_led_on"]);
    b.field(on!, "NODE", led);

    // LEDni sxemadan olib tashlaymiz — blok o'sha id ga ishora qilib qoladi.
    circuit.nodes = circuit.nodes.filter((n) => n.id !== led);
    const issues = validateWorkspace(b.ws, circuit.context);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      blockId: on,
      severity: "error",
      messageKey: "blocks.issue.componentMissing",
    });
  });

  it("LED Arduino piniga ulanmagan bo'lsa xato beradi", () => {
    const c = new Circuit();
    c.add("arduino-uno");
    const led = c.add("led");

    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [on] = b.fill(forever, ["component_led_on"]);
    b.field(on!, "NODE", led);

    const issues = validateWorkspace(b.ws, c.context);
    expect(issues.map((i) => i.messageKey)).toEqual(["blocks.issue.pinNotConnected"]);
  });

  it("HC-SR04 da ECHO ulanmagan bo'lsa xato beradi", () => {
    const c = new Circuit();
    const board = c.add("arduino-uno");
    const sonar = c.add("ultrasonic");
    c.wire(board, "5V", sonar, "vcc");
    c.wire(board, "GND1", sonar, "gnd");
    c.wire(board, "D9", sonar, "trig");
    // ECHO ATAYLAB ulanmagan.

    const b = new Builder();
    b.ws = addVariable(b.ws, "masofa");
    const forever = b.put("event_forever", 0, 0);
    const [assign] = b.fill(forever, ["variables_set"]);
    b.field(assign!, "VAR", "masofa");
    const sensor = b.plug("component_ultrasonic", assign!, "VALUE");
    b.field(sensor, "NODE", sonar);

    const issues = validateWorkspace(b.ws, c.context);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.params).toMatchObject({ pin: "echo" });
  });

  it("PWM bo'lmagan pinga analogWrite xato beradi", () => {
    // D8 — PWM emas (PWM: 3, 5, 6, 9, 10, 11).
    const { circuit, led } = ledCircuit("D8");
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [dim] = b.fill(forever, ["component_led_brightness"]);
    b.field(dim!, "NODE", led);

    const issues = validateWorkspace(b.ws, circuit.context);
    expect(issues.map((i) => i.messageKey)).toEqual(["blocks.issue.notPwm"]);

    // Xuddi shu blok PWM pinda toza o'tadi.
    const pwm = ledCircuit("D9");
    b.field(dim!, "NODE", pwm.led);
    expect(validateWorkspace(b.ws, pwm.circuit.context)).toEqual([]);
  });

  it("quvvatsiz sensor uchun VCC va GND xatolari chiqadi", () => {
    const c = new Circuit();
    const board = c.add("arduino-uno");
    const dht = c.add("dht11");
    c.wire(board, "D4", dht, "data");

    const b = new Builder();
    b.ws = addVariable(b.ws, "t");
    const forever = b.put("event_forever", 0, 0);
    const [assign] = b.fill(forever, ["variables_set"]);
    b.field(assign!, "VAR", "t");
    b.field(b.plug("component_dht_temp", assign!, "VALUE"), "NODE", dht);

    const issues = validateWorkspace(b.ws, c.context);
    expect(issues.map((i) => i.messageKey)).toEqual([
      "blocks.issue.noPower",
      "blocks.issue.noGround",
    ]);
  });

  it("D0/D1 Serial bloklari bilan birga ishlatilsa ogohlantiradi", () => {
    const c = new Circuit();
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["output_led_on", "serial_println"]);
    b.field(ids[0]!, "pin", "1");

    const issues = validateWorkspace(b.ws, c.context);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      blockId: ids[0],
      severity: "warning",
      messageKey: "blocks.issue.serialPinConflict",
    });

    // Serial bloki bo'lmasa D1 muammo emas.
    b.ws = removeBlock(b.ws, ids[1]!);
    expect(validateWorkspace(b.ws, c.context)).toEqual([]);
  });

  it("DC motor to'g'ridan-to'g'ri platага ulansa ogohlantiradi", () => {
    const c = new Circuit();
    const board = c.add("arduino-uno");
    const motor = c.add("dc-motor");
    c.wire(board, "D8", motor, "t1");
    c.wire(board, "GND1", motor, "t2");

    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const [go] = b.fill(forever, ["motor_dc_forward"]);

    const issues = validateWorkspace(b.ws, c.context);
    expect(issues).toEqual([
      { blockId: go, severity: "warning", messageKey: "blocks.issue.motorNeedsDriver" },
    ]);
  });

  it("tekshiruv natijasi deterministik", () => {
    const { circuit, led } = ledCircuit("D8");
    const b = new Builder();
    const forever = b.put("event_forever", 0, 0);
    const ids = b.fill(forever, ["component_led_on", "component_led_off"]);
    for (const id of ids) b.field(id, "NODE", led);
    circuit.nodes = circuit.nodes.filter((n) => n.id !== led);

    const once = validateWorkspace(b.ws, circuit.context);
    const twice = validateWorkspace(b.ws, circuit.context);
    expect(once).toEqual(twice);
    expect(once).toHaveLength(2);
  });
});

describe("loyihani saqlash — blok maydoni (§29)", () => {
  function project(blocks?: BlockWorkspace): SavedProject {
    return {
      id: "p1",
      name: "Sinov",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      circuit: { nodes: [], wires: [] },
      code: "void setup() {}\nvoid loop() {}\n",
      lessonSlug: null,
      sensors: {},
      ...(blocks ? { blocks } : {}),
    };
  }

  it("ish maydoni JSON orqali aylanib qaytganda AYNAN o'shani beradi", () => {
    const b = new Builder();
    b.ws = addVariable(b.ws, "hisob");
    const start = b.put("event_on_start", 40, 40);
    const forever = b.put("event_forever", 40, 240);
    b.fill(start, ["serial_begin"]);
    const [branch] = b.fill(forever, ["logic_if_else"]);
    b.plug("logic_compare", branch!, "IF");
    b.fill(branch!, ["output_led_on", "variables_change"], "DO");
    b.fill(branch!, ["output_led_off"], "ELSE");

    const json = exportProject(project(b.ws));
    const result = importProject(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.project.blocks).toBeDefined();
    expect(generateProgram(result.project.blocks!).code).toBe(b.code());
    expect(result.project.blockWorkspaceVersion).toBe(1);
  });

  it("ESKI loyiha (blocks maydoni YO'Q) ochilganda buzilmaydi", () => {
    const old = project();
    expect("blocks" in old).toBe(false);

    const json = exportProject(old);
    expect(json).not.toContain("blocks");

    const result = importProject(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.blocks).toBeUndefined();
    expect(result.project.code).toBe(old.code);
  });

  it("buzuq blok maydoni butun loyihani yiqitmaydi", () => {
    const broken = {
      ...project(),
      blocks: {
        version: 1,
        blocks: {
          x: { id: "x", type: "yoq-bunday", fields: {}, inputs: {}, statements: {}, next: null },
        },
        tops: { x: { x: 0, y: 0 } },
        variables: [],
      },
    };

    const result = importProject(JSON.stringify(broken));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Noma'lum blok tashlab yuborildi, loyihaning qolgani joyida.
    expect(Object.keys(result.project.blocks!.blocks)).toHaveLength(0);
    expect(result.project.name).toBe("Sinov");
  });
});

/* ═══════════════════════════ FAZA 5 ═══════════════════════════ */

describe("i18n to'liqligi (§41)", () => {
  it("o'zbekchadagi HAR BIR kalit ru va en da ham bor", () => {
    const uz = messageKeysOf("uz");
    for (const locale of ["ru", "en"] as const) {
      const other = new Set(messageKeysOf(locale));
      expect({ locale, missing: uz.filter((key) => !other.has(key)) }).toEqual({
        locale,
        missing: [],
      });
    }
  });

  it("ru va en da ortiqcha (o'zbekchada yo'q) kalit yo'q", () => {
    const uz = new Set(messageKeysOf("uz"));
    for (const locale of ["ru", "en"] as const) {
      expect({ locale, extra: messageKeysOf(locale).filter((k) => !uz.has(k)) }).toEqual({
        locale,
        extra: [],
      });
    }
  });

  it("har bir blokning yorlig'i uchala tilda ham tarjima qilingan", () => {
    const missing: string[] = [];
    for (const def of allBlockDefinitions()) {
      const keys = [def.messageKey, def.messageKeyBeginner, def.tooltipKey].filter(
        (k): k is string => typeof k === "string",
      );
      for (const locale of BLOCK_LOCALES) {
        for (const key of keys) {
          if (t(key, undefined, locale) === key) missing.push(`${locale}:${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("tarjimalarda joy egallovchilar bir xil qoladi", () => {
    // `{pin}` tarjimada tushib qolsa, blokda uya umuman chizilmaydi.
    const wrong: string[] = [];
    for (const key of messageKeysOf("uz")) {
      const base = [...t(key).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      for (const locale of ["ru", "en"] as const) {
        const other = [...t(key, undefined, locale).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        if (base.join(",") !== other.join(",")) wrong.push(`${locale}:${key}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("beginner yorlig'i asosiy yorliq bilan BIR XIL uyalarni ishlatadi", () => {
    // Aks holda boshlang'ich rejimda uya yo'qolib, uni tahrirlab bo'lmasdi.
    for (const def of allBlockDefinitions()) {
      if (!def.messageKeyBeginner) continue;
      const slotsOf = (key: string) =>
        splitLabel(key)
          .filter((p) => p.kind === "slot")
          .map((p) => p.name)
          .sort();
      expect({ type: def.type, slots: slotsOf(def.messageKeyBeginner) }).toEqual({
        type: def.type,
        slots: slotsOf(def.messageKey),
      });
    }
  });
});

describe("daraja bo'linishi (§32)", () => {
  it("boshlang'ich rejimda har bir asosiy bo'lim bo'sh emas", () => {
    for (const category of [
      "events",
      "control",
      "logic",
      "sensors",
      "output",
      "motors",
      "display",
    ] as const) {
      expect({ category, count: blocksInCategory(category, "beginner").length > 0 }).toEqual({
        category,
        count: true,
      });
    }
  });

  it("xom pin bloklari faqat kengaytirilgan rejimda ko'rinadi", () => {
    const beginner = blocksInCategory("pins", "beginner").map((d) => d.type);
    const advanced = blocksInCategory("pins", "advanced").map((d) => d.type);
    expect(beginner).toEqual([]);
    expect(advanced).toContain("pin_digital_write");
    expect(advanced).toContain("pin_analog_read");
  });

  it("kengaytirilgan rejimda boshlang'ich bloklar ham qoladi", () => {
    const advanced = blocksInCategory("output", "advanced").map((d) => d.type);
    expect(advanced).toContain("output_led_on");
  });
});

describe("blok tizimining butunligi", () => {
  it("har bir blok kod hosil qila oladi", () => {
    const missing = allBlockDefinitions().filter((def) => {
      if (def.shape === "hat") return false;
      return def.shape === "statement" ? !def.generateStatement : !def.generateValue;
    });
    expect(missing.map((d) => d.type)).toEqual([]);
  });

  it("qiymat bloklarida `output` e'lon qilingan", () => {
    const missing = allBlockDefinitions().filter(
      (def) => (def.shape === "value" || def.shape === "boolean") && !def.output,
    );
    expect(missing.map((d) => d.type)).toEqual([]);
  });

  it("HAR BIR blok turi saqlanib-tiklanadi va bir xil kod beradi", () => {
    /*
     * Bitta katta ish maydoni: har bir blok turidan bittadan. Shu bilan
     * serializatsiya, sanitizatsiya va generator bir yo'la sinaladi —
     * yangi blok qo'shilganda bu test uni AVTOMATIK qamrab oladi.
     */
    const b = new Builder();
    b.ws = addVariable(b.ws, "hisob");
    const forever = b.put("event_forever", 40, 40);

    let previous: string | null = null;
    for (const def of allBlockDefinitions()) {
      if (def.shape !== "statement") continue;
      const id = b.put(def.type, 500, 500);
      b.ws = previous
        ? connectAfter(b.ws, id, previous)
        : connectIntoStatement(b.ws, id, forever, "DO");
      previous = id;
    }
    // Qiymat va shart bloklari — ildiz sifatida (ular ham saqlanishi kerak).
    for (const def of allBlockDefinitions()) {
      if (def.shape === "value" || def.shape === "boolean") b.put(def.type, 900, 900);
    }

    const restored = parseWorkspace(JSON.parse(JSON.stringify(b.ws)));
    expect(restored).not.toBeNull();
    expect(Object.keys(restored!.blocks)).toHaveLength(Object.keys(b.ws.blocks).length);
    expect(generateProgram(restored!).code).toBe(b.code());
    expectValidSketch(b.code());
  });
});

/**
 * Registr modul qayta baholanishiga chidamlimi.
 *
 * Dasturlash muhitida `blocks/index.ts` qayta baholanishi mumkin, registr
 * moduli esa keshda qolishi mumkin. Ilgari shu holatda birinchi
 * `registerBlocks` chaqiruvi «Blok turi takrorlandi: event_on_start» deb
 * yiqilardi va butun laboratoriya ochilmasdi (3D sahna ham, 2D ham).
 */
describe("blok registri", () => {
  it("qayta to'ldirilganda xato bermaydi va tartib saqlanadi", () => {
    const before = allBlockDefinitions();

    resetRegistry();
    expect(allBlockDefinitions()).toHaveLength(0);

    expect(() => registerBlocks(before)).not.toThrow();
    expect(allBlockDefinitions().map((d) => d.type)).toEqual(before.map((d) => d.type));
  });

  it("BITTA to'ldirish ichidagi takroriy tur baribir xato beradi", () => {
    // Bu himoya qolishi kerak: ikki xil blok bir xil ID bilan saqlansa
    // loyihalar buzilardi.
    const existing = allBlockDefinitions()[0]!;
    expect(() => registerBlocks([existing])).toThrow(/takrorlandi/);
  });
});
