import { describe, expect, it } from "vitest";
import {
  addSubtree,
  addTopBlock,
  addVariable,
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
  parseWorkspace,
  removeBlock,
  sanitizeWorkspace,
  setField,
  splitLabel,
  stackIds,
  t,
  type BlockWorkspace,
} from ".";
import { parseSketch } from "../parser";

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

  /** Bloklarni ketma-ket boshlanish blokining ichki stekiga joylaydi. */
  fill(hatId: string, types: string[]): string[] {
    const ids: string[] = [];
    let previous: string | null = null;

    for (const type of types) {
      const id = this.put(type, 500, 500);
      this.ws = previous
        ? connectAfter(this.ws, id, previous)
        : connectIntoStatement(this.ws, id, hatId, "DO");
      ids.push(id);
      previous = id;
    }
    return ids;
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

  it("tarjimasi yo'q tilda o'zbekchaga tushadi", () => {
    expect(t("blocks.events.forever", undefined, "en")).toBe("Doim takrorla");
  });

  it("yorliqni uya bo'laklariga ajratadi", () => {
    const parts = splitLabel("blocks.pins.digitalWrite");
    expect(parts.filter((p) => p.kind === "slot").map((p) => p.name)).toEqual(["pin", "level"]);
  });
});
