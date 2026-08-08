import { beforeEach, describe, expect, it } from "vitest";
import { useCircuitStore, useProjectStore } from "./virtual-lab";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { buildNetlist, netFor } from "@/lib/virtual-lab/netlist";

/**
 * Sxema store'i testlari.
 *
 * Asosiy e'tibor — cheksiz render halqasining oldini olish. React Flow
 * `onSelectionChange` ni har renderda YANGI massiv bilan chaqiradi; store uni
 * shartsiz saqlasa, "Maximum update depth exceeded" xatosi chiqadi.
 */

beforeEach(() => {
  useCircuitStore.setState({
    circuit: { nodes: [], wires: [] },
    selectedIds: [],
    past: [],
    future: [],
    clipboard: [],
    movingNodeId: null,
  });
  useProjectStore.setState({
    projects: [],
    currentId: null,
    name: "Yangi loyiha",
    lessonSlug: null,
    dirty: false,
    lastError: null,
  });
});

describe("tanlov (selection)", () => {
  it("bir xil mazmunli yangi massiv holatni O'ZGARTIRMAYDI", () => {
    const { setSelection } = useCircuitStore.getState();

    setSelection(["a", "b"]);
    const afterFirst = useCircuitStore.getState().selectedIds;

    // React Flow aynan shunday qiladi: mazmuni bir xil, lekin yangi massiv.
    setSelection(["a", "b"]);
    const afterSecond = useCircuitStore.getState().selectedIds;

    // Havola o'zgarmasa — React qayta render qilmaydi, halqa uzilgan.
    expect(afterSecond).toBe(afterFirst);
  });

  it("mazmun o'zgarsa yangilanadi", () => {
    const { setSelection } = useCircuitStore.getState();

    setSelection(["a"]);
    const before = useCircuitStore.getState().selectedIds;
    setSelection(["a", "b"]);
    const after = useCircuitStore.getState().selectedIds;

    expect(after).not.toBe(before);
    expect(after).toEqual(["a", "b"]);
  });

  it("tanlov bo'shatilganini qayd etadi", () => {
    const { setSelection } = useCircuitStore.getState();
    setSelection(["a"]);
    setSelection([]);
    expect(useCircuitStore.getState().selectedIds).toEqual([]);
  });
});

describe("undo / redo", () => {
  it("komponent qo'shishni ortga qaytaradi va qaytaradi", () => {
    const store = useCircuitStore.getState();

    store.addNode("led", 10, 20);
    expect(useCircuitStore.getState().circuit.nodes).toHaveLength(1);

    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.nodes).toHaveLength(0);

    useCircuitStore.getState().redo();
    expect(useCircuitStore.getState().circuit.nodes).toHaveLength(1);
  });

  it("komponent o'chirilganda unga ulangan simlar ham ketadi", () => {
    const store = useCircuitStore.getState();
    store.addNode("arduino-uno", 0, 0);
    store.addNode("led", 200, 0);

    const [uno, led] = useCircuitStore.getState().circuit.nodes;
    if (!uno || !led) throw new Error("komponentlar yaratilmadi");

    useCircuitStore
      .getState()
      .addWire({ nodeId: uno.id, pinId: "D13" }, { nodeId: led.id, pinId: "anode" });
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(1);

    useCircuitStore.getState().setSelection([led.id]);
    useCircuitStore.getState().removeSelected();

    expect(useCircuitStore.getState().circuit.nodes).toHaveLength(1);
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
  });

  it("tanlangan simni o'chiradi", () => {
    const store = useCircuitStore.getState();
    store.addNode("arduino-uno", 0, 0);
    store.addNode("led", 200, 0);
    const [uno, led] = useCircuitStore.getState().circuit.nodes;
    if (!uno || !led) throw new Error("komponentlar yaratilmadi");

    useCircuitStore
      .getState()
      .addWire({ nodeId: uno.id, pinId: "D13" }, { nodeId: led.id, pinId: "anode" });
    const wire = useCircuitStore.getState().circuit.wires[0];
    if (!wire) throw new Error("sim yaratilmadi");

    useCircuitStore.getState().setSelection([wire.id]);
    useCircuitStore.getState().removeSelected();

    expect(useCircuitStore.getState().circuit.nodes).toHaveLength(2);
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
  });

  it("drag bilan ko'chirish bitta undo qadamda eski joyiga qaytadi", () => {
    const store = useCircuitStore.getState();
    store.addNode("led", 10, 20);
    const led = useCircuitStore.getState().circuit.nodes[0];
    if (!led) throw new Error("komponent yaratilmadi");

    useCircuitStore.getState().moveNode(led.id, 50, 70);
    useCircuitStore.getState().moveNode(led.id, 80, 100);
    useCircuitStore.getState().commitMove();

    expect(useCircuitStore.getState().circuit.nodes[0]).toMatchObject({ x: 80, y: 100 });
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.nodes[0]).toMatchObject({ x: 10, y: 20 });
  });

  it("loyiha almashtirilganda undo eski loyihani qaytarmaydi", () => {
    const store = useCircuitStore.getState();
    store.addNode("led", 10, 20);
    expect(useCircuitStore.getState().circuit.nodes).toHaveLength(1);

    useCircuitStore.getState().replaceCircuit({ nodes: [], wires: [] });
    useCircuitStore.getState().undo();

    expect(useCircuitStore.getState().circuit.nodes).toHaveLength(0);
    expect(useCircuitStore.getState().past).toHaveLength(0);
  });

  it("komponent sozlamasi undo bilan qaytadi", () => {
    const store = useCircuitStore.getState();
    store.addNode("led", 10, 20);
    const led = useCircuitStore.getState().circuit.nodes[0];
    if (!led) throw new Error("komponent yaratilmadi");

    useCircuitStore.getState().updateSetting(led.id, "color", "blue");
    expect(useCircuitStore.getState().circuit.nodes[0]?.settings.color).toBe("blue");

    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.nodes[0]?.settings.color).toBe("red");
  });

  it("komponent sozlamalarini katalogdagi chegaradan chiqarmaydi", () => {
    const store = useCircuitStore.getState();
    store.addNode("servo", 10, 20);
    const servo = useCircuitStore.getState().circuit.nodes[0];
    if (!servo) throw new Error("komponent yaratilmadi");

    useCircuitStore.getState().updateSetting(servo.id, "angle", 999);
    expect(useCircuitStore.getState().circuit.nodes[0]?.settings.angle).toBe(180);

    useCircuitStore.getState().updateSetting(servo.id, "angle", -20);
    expect(useCircuitStore.getState().circuit.nodes[0]?.settings.angle).toBe(0);
  });

  it("noma'lum yoki ruxsat etilmagan sozlama qiymatini yozmaydi", () => {
    const store = useCircuitStore.getState();
    store.addNode("led", 10, 20);
    const led = useCircuitStore.getState().circuit.nodes[0];
    if (!led) throw new Error("komponent yaratilmadi");

    useCircuitStore.getState().updateSetting(led.id, "color", "purple");
    useCircuitStore.getState().updateSetting(led.id, "unknown", 1);

    expect(useCircuitStore.getState().circuit.nodes[0]?.settings).toEqual({ color: "red" });
    expect(useCircuitStore.getState().past).toHaveLength(1);
  });

  it("sim rangi undo bilan qaytadi", () => {
    const store = useCircuitStore.getState();
    store.addNode("arduino-uno", 0, 0);
    store.addNode("led", 200, 0);
    const [uno, led] = useCircuitStore.getState().circuit.nodes;
    if (!uno || !led) throw new Error("komponentlar yaratilmadi");

    useCircuitStore
      .getState()
      .addWire({ nodeId: uno.id, pinId: "D13" }, { nodeId: led.id, pinId: "anode" });
    const wire = useCircuitStore.getState().circuit.wires[0];
    if (!wire) throw new Error("sim yaratilmadi");

    useCircuitStore.getState().setWireColor(wire.id, "green");
    expect(useCircuitStore.getState().circuit.wires[0]?.color).toBe("green");

    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.wires[0]?.color).toBe("blue");
  });
});

describe("sim ulash qoidalari", () => {
  it("5V va GND ni to'g'ridan-to'g'ri ulashni rad etadi", () => {
    const store = useCircuitStore.getState();
    store.addNode("arduino-uno", 0, 0);
    const uno = useCircuitStore.getState().circuit.nodes[0];
    if (!uno) throw new Error("plata yaratilmadi");

    const result = useCircuitStore
      .getState()
      .addWire({ nodeId: uno.id, pinId: "5V" }, { nodeId: uno.id, pinId: "GND1" });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("qisqa tutashuv");
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
  });

  it("bir juft pinni ikki marta ulashga yo'l qo'ymaydi", () => {
    const store = useCircuitStore.getState();
    store.addNode("arduino-uno", 0, 0);
    store.addNode("led", 200, 0);
    const [uno, led] = useCircuitStore.getState().circuit.nodes;
    if (!uno || !led) throw new Error("komponentlar yaratilmadi");

    const from = { nodeId: uno.id, pinId: "D13" };
    const to = { nodeId: led.id, pinId: "anode" };

    expect(useCircuitStore.getState().addWire(from, to).ok).toBe(true);
    expect(useCircuitStore.getState().addWire(from, to).ok).toBe(false);
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(1);
  });

  it("LED pinini breadboard teshigiga ulaydi", () => {
    const store = useCircuitStore.getState();
    store.addNode("breadboard", 0, 0);
    store.addNode("led", 360, 0);
    const [breadboard, led] = useCircuitStore.getState().circuit.nodes;
    if (!breadboard || !led) throw new Error("komponentlar yaratilmadi");

    const result = useCircuitStore
      .getState()
      .addWire({ nodeId: led.id, pinId: "anode" }, { nodeId: breadboard.id, pinId: "t1-1" });

    expect(result.ok).toBe(true);
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(1);
  });

  it("breadboard bir ustundagi teshiklarni elektr jihatdan birlashtiradi", () => {
    const store = useCircuitStore.getState();
    store.addNode("breadboard", 0, 0);
    const breadboard = useCircuitStore.getState().circuit.nodes[0];
    if (!breadboard) throw new Error("breadboard yaratilmadi");

    const net = buildNetlist(useCircuitStore.getState().circuit);

    expect(netFor(net, breadboard.id, "t1-1")).toBe(netFor(net, breadboard.id, "t1-3"));
    expect(netFor(net, breadboard.id, "t1-1")).not.toBe(netFor(net, breadboard.id, "b1-1"));
  });
});

describe("breadboard pin modeli", () => {
  it("teshiklar haqiqiy va barqaror connector sifatida katalogda bor", () => {
    const breadboard = getDefinition("breadboard");
    // 24 ustun × 5 qator × 2 yarim + 4 rels × 24 teshik.
    expect(breadboard?.pins).toHaveLength(24 * 5 * 2 + 4 * 24);
    expect(breadboard?.pins.find((p) => p.id === "t1-1")).toMatchObject({
      kind: "passive",
      direction: "bidirectional",
      connectable: true,
      electricalGroupId: "breadboard:top:1",
    });
  });

  it("eski sxemalardagi teshik nomlari saqlanib qolgan", () => {
    // Relslar qo'shilganda ustun teshiklari qayta nomlanmagan bo'lishi
    // kerak, aks holda saqlangan loyihalardagi simlar uzilib qolardi.
    const ids = new Set((getDefinition("breadboard")?.pins ?? []).map((p) => p.id));
    for (const id of ["t1-1", "t24-3", "b1-1", "b24-3"]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("relsning barcha teshiklari bitta tugunda", () => {
    const rail = (getDefinition("breadboard")?.pins ?? []).filter((p) => p.id.startsWith("pt"));
    expect(rail).toHaveLength(24);
    expect(new Set(rail.map((p) => p.electricalGroupId)).size).toBe(1);
  });
});

describe("loyiha store'i", () => {
  it("brauzer storage bo'lmaganda save xatosini holatda ko'rsatadi", () => {
    useProjectStore.getState().save({ nodes: [], wires: [] }, "void setup(){} void loop(){}", {});

    expect(useProjectStore.getState().lastError).toBe("Brauzer emas");
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("import qilingan loyihani storage xatosida dirty qilib belgilaydi", () => {
    useProjectStore.getState().addImported({
      id: "p",
      name: "Import",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      circuit: { nodes: [], wires: [] },
      code: "void setup(){} void loop(){}",
      lessonSlug: null,
      sensors: {},
    });

    expect(useProjectStore.getState().currentId).toBeTruthy();
    expect(useProjectStore.getState().lastError).toBe("Brauzer emas");
    expect(useProjectStore.getState().dirty).toBe(true);
  });
});

describe("komponent qo'yish joyi", () => {
  it("bir xil nuqtaga qo'yilgan komponentlar ustma-ust tushmaydi", () => {
    const store = useCircuitStore.getState();
    store.addNode("led", 100, 100);
    store.addNode("led", 100, 100);
    store.addNode("led", 100, 100);

    const nodes = useCircuitStore.getState().circuit.nodes;
    expect(nodes).toHaveLength(3);

    // Har bir juftlik kesishmasligi kerak.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const da = getDefinition(a.type)!;
        const db = getDefinition(b.type)!;
        const overlap =
          a.x < b.x + db.width &&
          a.x + da.width > b.x &&
          a.y < b.y + db.height &&
          a.y + da.height > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it("bo'sh joyga qo'yilgan komponent so'ralgan nuqtada qoladi", () => {
    useCircuitStore.getState().addNode("led", 250, 180);
    expect(useCircuitStore.getState().circuit.nodes[0]).toMatchObject({ x: 250, y: 180 });
  });
});

describe("tanlov barqarorligi", () => {
  it("bir xil to'plam boshqa tartibda kelsa holat o'zgarmaydi", () => {
    /*
     * React Flow tanlovni o'zgarishlar to'plami sifatida beradi; bir xil
     * to'plam boshqa tartibda hosil bo'lishi mumkin. Agar shunda yangi
     * massiv yozilsa, sxema qayta chiziladi va React Flow yana o'zgarish
     * yuboradi — "Maximum update depth exceeded" shundan kelib chiqadi.
     */
    const { setSelection } = useCircuitStore.getState();
    setSelection(["a", "b", "c"]);
    const before = useCircuitStore.getState().selectedIds;

    setSelection(["c", "a", "b"]);
    expect(useCircuitStore.getState().selectedIds).toBe(before);
  });

  it("to'plam haqiqatan o'zgarganda yangilanadi", () => {
    const { setSelection } = useCircuitStore.getState();
    setSelection(["a", "b"]);
    setSelection(["a", "c"]);
    expect(useCircuitStore.getState().selectedIds).toEqual(["a", "c"]);
  });
});
