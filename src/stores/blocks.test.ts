import { beforeEach, describe, expect, it } from "vitest";
import { emptyWorkspace, generateProgram, stackIds } from "@/lib/virtual-lab/blocks";
import { useBlocksStore } from "./blocks";

/**
 * Blok muharriri store'i (§30).
 *
 * Bu yerdagi savol bitta: FOYDALANUVCHI harakati bitta undo qadamimi?
 * Bola uchun «bir marta Ctrl+Z bosdim — bitta ish ortga qaytdi» degan
 * kutish bor va sudrash o'nlab siljishdan iborat bo'lgani uni buzmasligi
 * kerak.
 */

function reset() {
  useBlocksStore.setState({
    workspace: emptyWorkspace(),
    past: [],
    future: [],
    selectedId: null,
    clipboard: null,
    dragActive: false,
    draggingId: null,
  });
}

const store = () => useBlocksStore.getState();

describe("blok store — tarix", () => {
  beforeEach(reset);

  it("10 amaldan keyin 10 marta undo boshlang'ich holatga qaytaradi", () => {
    const start = store().workspace;

    for (let i = 0; i < 10; i++) store().addBlock("output_led_on", i * 10, i * 10);
    expect(Object.keys(store().workspace.blocks)).toHaveLength(10);

    for (let i = 0; i < 10; i++) store().undo();
    expect(store().workspace).toBe(start);
    expect(store().canUndo()).toBe(false);
  });

  it("redo undo qilingan amallarni qaytaradi", () => {
    store().addBlock("event_forever", 0, 0);
    const afterAdd = store().workspace;

    store().undo();
    expect(Object.keys(store().workspace.blocks)).toHaveLength(0);

    store().redo();
    expect(store().workspace).toBe(afterAdd);
    expect(store().canRedo()).toBe(false);
  });

  it("yangi amal redo tarixini tozalaydi", () => {
    store().addBlock("event_forever", 0, 0);
    store().undo();
    expect(store().canRedo()).toBe(true);

    store().addBlock("event_on_start", 0, 0);
    expect(store().canRedo()).toBe(false);
  });

  it("sudrash — bitta undo qadam", () => {
    const id = store().addBlock("event_forever", 0, 0)!;
    const beforeDrag = store().workspace;

    // Sudrash: boshida bir marta surat, keyin o'nlab siljish.
    store().beginDrag();
    for (let i = 1; i <= 20; i++) store().moveTop(id, i * 5, i * 5, false);
    store().endDrag();

    expect(store().workspace.tops[id]).toEqual({ x: 100, y: 100 });
    store().undo();
    expect(store().workspace).toBe(beforeDrag);
  });

  it("uya qiymati o'zgarmasa tarixga yozilmaydi", () => {
    const id = store().addBlock("output_led_on", 0, 0)!;
    const depth = store().past.length;

    store().changeField(id, "pin", "13"); // allaqachon 13
    expect(store().past.length).toBe(depth);

    store().changeField(id, "pin", "9");
    expect(store().past.length).toBe(depth + 1);
  });
});

describe("blok store — nusxa buferi", () => {
  beforeEach(reset);

  it("nusxa olib joylash yangi ID beradi va tuzilishni saqlaydi", () => {
    const hat = store().addBlock("event_forever", 0, 0)!;
    const first = store().addBlock("output_led_on", 0, 0)!;
    const second = store().addBlock("control_wait_seconds", 0, 0)!;
    store().attachIntoStatement(first, hat, "DO");
    store().attachAfter(second, first);

    store().copy(hat);
    store().paste();

    const pasted = store().selectedId!;
    expect(pasted).not.toBe(hat);
    expect(
      stackIds(store().workspace, store().workspace.blocks[pasted]!.statements.DO),
    ).toHaveLength(2);
    expect(Object.keys(store().workspace.blocks)).toHaveLength(6);
  });

  it("bitta nusxani ikki marta joylash mumkin", () => {
    const id = store().addBlock("output_led_on", 0, 0)!;
    store().copy(id);
    store().paste();
    store().paste();

    const ids = Object.keys(store().workspace.blocks);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it("manba blok o'chirilsa ham bufer yaroqli qoladi", () => {
    const id = store().addBlock("output_led_on", 0, 0)!;
    store().copy(id);
    store().remove(id);

    store().paste();
    expect(Object.keys(store().workspace.blocks)).toHaveLength(1);
  });

  it("bo'sh buferda joylash hech narsa qilmaydi", () => {
    const before = store().workspace;
    store().paste();
    expect(store().workspace).toBe(before);
  });
});

describe("blok store — ish maydonini almashtirish", () => {
  beforeEach(reset);

  it("replaceWorkspace tarixni tozalaydi va maydonni tiklaydi", () => {
    store().addBlock("event_forever", 0, 0);
    store().markCodeDirty(true);

    const restored = {
      version: 1,
      blocks: {
        a: {
          id: "a",
          type: "event_on_start",
          fields: {},
          inputs: {},
          statements: { DO: null },
          next: null,
        },
      },
      tops: { a: { x: 10, y: 20 } },
      variables: [],
    };
    store().replaceWorkspace(restored);

    expect(Object.keys(store().workspace.blocks)).toEqual(["a"]);
    expect(store().canUndo()).toBe(false);
    expect(store().canRedo()).toBe(false);
    expect(store().codeDirty).toBe(false);
  });

  it("tozalash ortga qaytariladi", () => {
    store().addBlock("event_forever", 0, 0);
    const before = store().workspace;
    store().clear();
    expect(Object.keys(store().workspace.blocks)).toHaveLength(0);
    store().undo();
    expect(store().workspace).toBe(before);
  });
});

describe("blok store — tezlik shartlari (§39)", () => {
  beforeEach(reset);

  it("bitta blok o'zgarganda BOSHQA bloklar havolasi o'zgarmaydi", () => {
    /*
     * Bu `React.memo` va zustand selektorlari ishlashining SHARTI: agar
     * har o'zgarishda hamma blok yangi obyektga aylansa, 100+ blokli ish
     * maydonida sudrash sekinlashadi.
     */
    const ids = Array.from({ length: 20 }, (_, i) => store().addBlock("output_led_on", i, i)!);
    const before = ids.map((id) => store().workspace.blocks[id]);

    store().changeField(ids[0]!, "pin", "9");

    const after = ids.map((id) => store().workspace.blocks[id]);
    expect(after[0]).not.toBe(before[0]);
    for (let i = 1; i < ids.length; i++) expect(after[i]).toBe(before[i]);
  });

  it("o'zgaruvchi qo'shilganda bloklar havolasi o'zgarmaydi", () => {
    const id = store().addBlock("output_led_on", 0, 0)!;
    const before = store().workspace.blocks[id];
    store().addVar("hisob");
    expect(store().workspace.blocks[id]).toBe(before);
  });

  it("undo tarixidagi eski ish maydoni buzilmaydi", () => {
    // Copy-on-write xato bo'lsa, keyingi o'zgartirish ESKI nusxaga ham
    // tegib ketardi va undo boshqa natija berardi.
    const id = store().addBlock("output_led_on", 0, 0)!;
    const snapshot = store().workspace;
    const codeBefore = generateProgram(snapshot).code;

    store().changeField(id, "pin", "9");
    expect(generateProgram(snapshot).code).toBe(codeBefore);
  });
});
