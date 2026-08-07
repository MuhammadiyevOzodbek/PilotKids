import { batteryVoltage, formatOhms, getDefinition, getPin } from "./catalog";
import {
  boardPinFor,
  buildNetlist,
  isGrounded,
  isPowered,
  netFor,
  pinKey,
  reachableNets,
  resistanceToDrive,
  resistanceToGround,
  splitPinKey,
  supplyVoltage,
  type Netlist,
} from "./netlist";
import { LED_FORWARD_VOLTAGE, ledCurrentMa } from "./simulator";
import type { Circuit, CircuitIssue, WireConnection } from "./types";

/**
 * Sxema validatori.
 *
 * Simulyatsiyadan OLDIN ishlaydi va foydalanuvchiga sodda o'zbek tilida
 * nima noto'g'ri ekanini aytadi. Maqsad — "ishlamadi" degan tushunarsiz
 * holat o'rniga aniq sabab va tuzatish yo'lini ko'rsatish.
 */

let issueSeq = 0;
function issue(
  severity: CircuitIssue["severity"],
  message: string,
  hint: string,
  nodeIds: string[],
): CircuitIssue {
  return { id: `iss-${issueSeq++}`, severity, message, hint, nodeIds };
}

/** Ikki pinni sim bilan ulash mumkinmi (ulashdan oldin tekshiriladi). */
export function canConnect(
  circuit: Circuit,
  from: { nodeId: string; pinId: string },
  to: { nodeId: string; pinId: string },
): { ok: true } | { ok: false; reason: string } {
  if (from.nodeId === to.nodeId && from.pinId === to.pinId) {
    return { ok: false, reason: "Pinni o'ziga ulab bo'lmaydi." };
  }

  const fromPin = getPin(circuit.nodes.find((n) => n.id === from.nodeId)?.type ?? "", from.pinId);
  const toPin = getPin(circuit.nodes.find((n) => n.id === to.nodeId)?.type ?? "", to.pinId);

  if (!fromPin || !toPin) {
    return { ok: false, reason: "Bunday pin mavjud emas." };
  }

  if (!fromPin.connectable || !toPin.connectable) {
    return { ok: false, reason: "Bu pin ulanish uchun ochiq emas." };
  }

  // Bir xil juftlik ikki marta ulanmasin.
  const already = circuit.wires.some(
    (w) =>
      (w.from.nodeId === from.nodeId &&
        w.from.pinId === from.pinId &&
        w.to.nodeId === to.nodeId &&
        w.to.pinId === to.pinId) ||
      (w.from.nodeId === to.nodeId &&
        w.from.pinId === to.pinId &&
        w.to.nodeId === from.nodeId &&
        w.to.pinId === from.pinId),
  );
  if (already) return { ok: false, reason: "Bu pinlar allaqachon ulangan." };

  // Bitta batareyaning ikki qutbini bevosita ulash — qisqa tutashuv.
  if (from.nodeId === to.nodeId) {
    const type = circuit.nodes.find((n) => n.id === from.nodeId)?.type;
    if (type === "battery") {
      return {
        ok: false,
        reason: "Batareyaning + va − qutblarini bevosita ulab bo'lmaydi — qisqa tutashuv.",
      };
    }
  }

  // 5V ni to'g'ridan-to'g'ri GND ga ulash — qisqa tutashuv.
  if (
    (fromPin.role === "power" && toPin.role === "ground") ||
    (fromPin.role === "ground" && toPin.role === "power")
  ) {
    return {
      ok: false,
      reason: "5V va GND ni to'g'ridan-to'g'ri ulab bo'lmaydi — qisqa tutashuv.",
    };
  }

  return { ok: true };
}

/** Sim rangini pin rolidan taxmin qiladi (qizil — quvvat, qora — GND). */
export function suggestWireColor(
  circuit: Circuit,
  from: { nodeId: string; pinId: string },
  to: { nodeId: string; pinId: string },
): WireConnection["color"] {
  const roles = [from, to].map((e) => {
    const type = circuit.nodes.find((n) => n.id === e.nodeId)?.type ?? "";
    return getPin(type, e.pinId)?.role;
  });
  if (roles.includes("ground")) return "black";
  if (roles.includes("power")) return "red";
  return "blue";
}

/**
 * Butun sxemani tekshiradi.
 *
 * `error` — simulyatsiyani boshlashga to'sqinlik qiladi.
 * `warning` — ishlaydi, lekin haqiqiy hayotda muammo bo'lardi.
 */
export function validateCircuit(circuit: Circuit): CircuitIssue[] {
  const issues: CircuitIssue[] = [];
  const net = buildNetlist(circuit);

  /* ── Qisqa tutashuv: 5V va GND bitta tugunda ── */
  for (const powerNet of net.powerNets) {
    if (net.groundNets.has(powerNet)) {
      const nodeIds = (net.pinsOf.get(powerNet) ?? []).map((k) => splitPinKey(k).nodeId);
      issues.push(
        issue(
          "error",
          "5V va GND orasida qisqa tutashuv aniqlandi.",
          "Quvvat va yer simlarini bir-biriga to'g'ridan-to'g'ri ulamang.",
          [...new Set(nodeIds)],
        ),
      );
      break;
    }
  }

  issues.push(...batteryIssues(circuit, net));

  /*
   * Arduino yo'q bo'lishi endi to'xtatuvchi hol emas: batareya bilan yig'ilgan
   * sxema (batareya → rezistor → LED) mutlaqo to'g'ri. Shuning uchun faqat
   * signal talab qiladigan komponentlar uchun xato beriladi, qolgan
   * tekshiruvlar esa har holatda ishlaydi.
   */
  const board = circuit.nodes.find((n) => getDefinition(n.type)?.isBoard) ?? null;
  if (!board) {
    const needsArduino = circuit.nodes.some((n) =>
      [
        "servo",
        "potentiometer",
        "ldr",
        "rgb-led",
        "ultrasonic",
        "tmp36",
        "soil-moisture",
        "pir",
      ].includes(n.type),
    );
    if (needsArduino) {
      issues.push(
        issue(
          "error",
          "Sxemada Arduino plata yo'q.",
          "Signal bilan ishlaydigan komponentlar uchun chap paneldan «Arduino Uno» ni ish maydoniga tashlang.",
          [],
        ),
      );
    }
  }

  /* ── Arduino GND ulanganmi ── */
  if (board) {
    // GND pinlari ro'yxati katalogdan olinadi: platada ular bir nechta
    // (pastki qatorda ikkita, yuqori qatorda bittasi) va istalgani yaraydi.
    const boardGroundPins = (getDefinition(board.type)?.pins ?? []).filter(
      (p) => p.role === "ground",
    );
    const boardGrounded = boardGroundPins.some((p) => {
      const n = netFor(net, board.id, p.id);
      return n !== null && (net.pinsOf.get(n) ?? []).length > 1;
    });
    const needsGround = circuit.nodes.some((n) => {
      if (
        ![
          "led",
          "buzzer",
          "servo",
          "potentiometer",
          "ldr",
          "rgb-led",
          "ultrasonic",
          "tmp36",
          "soil-moisture",
          "pir",
        ].includes(n.type)
      ) {
        return false;
      }
      const def = getDefinition(n.type);
      return (def?.pins ?? []).some((p) => boardPinFor(net, n.id, p.id) !== null);
    });
    if (needsGround && !boardGrounded) {
      issues.push(
        issue(
          "error",
          "Arduino GND pini sxemaga ulanmagan.",
          "Zanjir yopilishi uchun komponentning manfiy uchini Arduino GND piniga ulang.",
          [board.id],
        ),
      );
    }
  }

  /* ── Har bir komponentni alohida tekshiramiz ── */
  for (const node of circuit.nodes) {
    const def = getDefinition(node.type);
    if (!def || def.isBoard || def.pins.length === 0) continue;

    // Umuman ulanmagan komponent.
    const connected = def.pins.some((p) => {
      const n = netFor(net, node.id, p.id);
      return n !== null && (net.pinsOf.get(n) ?? []).length > 1;
    });
    if (!connected) {
      issues.push(
        issue(
          "warning",
          `«${def.name}» hech narsaga ulanmagan.`,
          "Pinlarini sim bilan Arduino yoki boshqa komponentga ulang.",
          [node.id],
        ),
      );
      continue;
    }

    if (node.type === "led") {
      const anodePin = boardPinFor(net, node.id, "anode");
      const cathodePin = boardPinFor(net, node.id, "cathode");

      // Rezistor zanjirda bormi — anod TOMONIDA ham, katod tomonida ham
      // bo'lishi mumkin (ikkalasi ham tokni bir xil cheklaydi).
      const anodeNet = netFor(net, node.id, "anode");
      const cathodeNet = netFor(net, node.id, "cathode");
      const reachesResistor = (start: string | null) =>
        start !== null &&
        [...reachableNets(net, start)].some((netId) =>
          (net.pinsOf.get(netId) ?? []).some(
            (k) => circuit.nodes.find((n) => n.id === splitPinKey(k).nodeId)?.type === "resistor",
          ),
        );
      const hasResistor = reachesResistor(anodeNet) || reachesResistor(cathodeNet);

      if (!hasResistor) {
        issues.push(
          issue(
            "warning",
            "LED uchun rezistor ulanmagan.",
            "LED kuyib qolmasligi uchun anod tomoniga 220 Ω rezistor qo'ying.",
            [node.id],
          ),
        );
      }

      /*
       * Qarshilik to'g'ri tanlanganmi. Bu — rezistor darsining butun mag'zi:
       * juda kichigi LEDni kuydiradi, juda kattasi esa uni deyarli
       * yoqmaydi. Kuchlanish batareyadan yoki 5V relsdan olinadi; Arduino
       * chiqishi doim 5 V beradi.
       */
      const supply = supplyVoltage(net, node.id, "anode") ?? (anodePin !== null ? 5 : null);
      const seriesOhms =
        (resistanceToDrive(net, node.id, "anode") ?? 0) +
        (resistanceToGround(net, node.id, "cathode") ?? 0);

      if (supply !== null && supply > LED_FORWARD_VOLTAGE && seriesOhms > 0) {
        const currentMa = ledCurrentMa(supply, seriesOhms);
        if (currentMa > LED_MAX_CURRENT_MA) {
          issues.push(
            issue(
              "warning",
              `Rezistor juda kichik — LED orqali ~${Math.round(currentMa)} mA tok o'tadi.`,
              `${supply} V uchun kamida ${formatOhms(
                recommendedOhms(supply),
              )} qo'ying, aks holda LED kuyadi.`,
              [node.id],
            ),
          );
        } else if (currentMa < LED_MIN_VISIBLE_MA) {
          issues.push(
            issue(
              "warning",
              `Rezistor juda katta — LED deyarli yonmaydi (~${currentMa.toFixed(1)} mA).`,
              `Qarshilikni kamaytiring: ${supply} V uchun ${formatOhms(
                recommendedOhms(supply),
              )} atrofida bo'lsa yaxshi.`,
              [node.id],
            ),
          );
        }
      }

      // Teskari polarite: katod Arduino chiqishida, anod GND'da.
      const cathodeGrounded = netFor(net, node.id, "cathode");
      const anodeGrounded = netFor(net, node.id, "anode");
      const anodeOnGnd = anodeGrounded !== null && net.groundNets.has(anodeGrounded);
      const cathodeOnGnd = cathodeGrounded !== null && net.groundNets.has(cathodeGrounded);
      const anodePowered = isPowered(net, node.id, "anode");
      const cathodePowered = isPowered(net, node.id, "cathode");

      if (anodeOnGnd && (cathodePin !== null || cathodePowered)) {
        issues.push(
          issue(
            "error",
            "LED teskari ulangan.",
            "Uzun oyoq (anod) Arduino piniga, kalta oyoq (katod) GND ga ulanadi.",
            [node.id],
          ),
        );
      } else if (anodePin === null && !anodePowered && !anodeOnGnd) {
        issues.push(
          issue(
            "warning",
            board ? "LED Arduino piniga ulanmagan." : "LED quvvat manbaiga ulanmagan.",
            board
              ? "Anodni rezistor orqali Arduino raqamli piniga ulang."
              : "Uzun oyoqni (anod) rezistor orqali batareyaning + qutbiga ulang.",
            [node.id],
          ),
        );
      } else if (!cathodeOnGnd) {
        issues.push(
          issue(
            "warning",
            "LED katodi GND ga ulanmagan.",
            "Kalta oyoqni Arduino GND piniga ulang — aks holda zanjir yopilmaydi.",
            [node.id],
          ),
        );
      }
    }

    const signalPinOf: Record<string, string> = {
      servo: "signal",
      potentiometer: "wiper",
      ldr: "signal",
      tmp36: "signal",
      "soil-moisture": "signal",
      pir: "out",
    };
    if (board && signalPinOf[node.type]) {
      const signal = signalPinOf[node.type]!;
      if (boardPinFor(net, node.id, signal) === null) {
        issues.push(
          issue(
            "warning",
            `«${def.name}» signal pini Arduino'ga ulanmagan.`,
            "Signal pinini Arduino'ning tegishli piniga ulang.",
            [node.id],
          ),
        );
      }
    }

    if (board && node.type === "ultrasonic") {
      for (const [pinId, label] of [
        ["trig", "Trig"],
        ["echo", "Echo"],
      ] as const) {
        if (boardPinFor(net, node.id, pinId) !== null) continue;
        issues.push(
          issue(
            "warning",
            `«${def.name}» ${label} pini Arduino'ga ulanmagan.`,
            `${label} pinini Arduino'ning raqamli piniga ulang.`,
            [node.id],
          ),
        );
      }
    }

    if (node.type === "push-button") {
      const releasedNet = buildNetlist({
        ...circuit,
        nodes: circuit.nodes.map((n) =>
          n.id === node.id ? { ...n, settings: { ...n.settings, pressed: false } } : n,
        ),
      });
      const connectedToBoard =
        boardPinFor(releasedNet, node.id, "a") !== null ||
        boardPinFor(releasedNet, node.id, "b") !== null;
      const hasReference =
        isPowered(releasedNet, node.id, "a") ||
        isPowered(releasedNet, node.id, "b") ||
        isGrounded(releasedNet, node.id, "a") ||
        isGrounded(releasedNet, node.id, "b");

      if (connectedToBoard && !hasReference) {
        issues.push(
          issue(
            "warning",
            `«${def.name}» ikkinchi oyog'i GND yoki 5V ga ulanmagan.`,
            "Tugma barqaror o'qilishi uchun bir oyog'ini Arduino piniga, ikkinchisini GND yoki 5V ga ulang.",
            [node.id],
          ),
        );
      }
    }

    if (node.type === "dc-motor") {
      // Motorni to'g'ridan-to'g'ri Arduino pinidan quvvatlantirish tavsiya etilmaydi.
      const onBoard =
        boardPinFor(net, node.id, "t1") !== null || boardPinFor(net, node.id, "t2") !== null;
      if (onBoard) {
        issues.push(
          issue(
            "warning",
            "DC motor to'g'ridan-to'g'ri Arduino piniga ulangan.",
            "Arduino pini motorni tortolmaydi va shikastlanishi mumkin — tranzistor yoki motor drayveri (L293D) ishlating.",
            [node.id],
          ),
        );
      }
    }

    if (
      ["servo", "potentiometer", "ldr", "ultrasonic", "tmp36", "soil-moisture", "pir"].includes(
        node.type,
      )
    ) {
      if (!isPowered(net, node.id, "vcc")) {
        issues.push(
          issue(
            "warning",
            `«${def.name}» VCC/5V pini quvvatga ulanmagan.`,
            "Komponent ishlashi uchun VCC pinini 5V ga ulang.",
            [node.id],
          ),
        );
      }
      if (!isGrounded(net, node.id, "gnd")) {
        issues.push(
          issue(
            "warning",
            `«${def.name}» GND pini yerga ulanmagan.`,
            "Komponent ishlashi uchun GND pinini Arduino GND yoki GND elementiga ulang.",
            [node.id],
          ),
        );
      }
    }
  }

  /* ── Ikki chiqish pini o'zaro ulangan ── */
  for (const [netId, keys] of board ? net.pinsOf : []) {
    const outputs = keys.filter((k) => {
      const { nodeId, pinId } = splitPinKey(k);
      const type = circuit.nodes.find((n) => n.id === nodeId)?.type ?? "";
      const d = getDefinition(type);
      if (!d?.isBoard) return false;
      const pin = getPin(type, pinId);
      return pin?.role === "digital" || pin?.role === "pwm";
    });
    if (outputs.length > 1) {
      issues.push(
        issue(
          "warning",
          "Ikkita Arduino chiqish pini bir-biriga ulangan.",
          "Chiqish pinlarini o'zaro ulamang — bu platani shikastlashi mumkin.",
          board ? [board.id] : [],
        ),
      );
      void netId;
      break;
    }
  }

  return issues;
}

/** LED uchun xavfsiz tok chegaralari (mA). */
const LED_MAX_CURRENT_MA = 25;
const LED_MIN_VISIBLE_MA = 1;

/** Berilgan kuchlanish uchun ~15 mA beradigan qarshilik. */
function recommendedOhms(volts: number): number {
  const ohms = (volts - LED_FORWARD_VOLTAGE) / 0.015;
  // Eng yaqin standart nominalga yaxlitlaymiz.
  const standard = [100, 150, 220, 330, 470, 680, 1000];
  return standard.reduce((best, s) => (Math.abs(s - ohms) < Math.abs(best - ohms) ? s : best), 220);
}

/**
 * Batareyaga oid tekshiruvlar.
 *
 * Bular alohida funksiyada, chunki ularning hech biri Arduino'ga bog'liq
 * emas: batareya bilan yig'ilgan sxema plata bo'lmasa ham to'liq tekshiriladi.
 */
function batteryIssues(circuit: Circuit, net: Netlist): CircuitIssue[] {
  const found: CircuitIssue[] = [];
  const batteries = circuit.nodes.filter((n) => n.type === "battery");
  if (batteries.length === 0) return found;

  for (const battery of batteries) {
    const volts = batteryVoltage(battery.settings);
    const plusNet = netFor(net, battery.id, "plus");
    const minusNet = netFor(net, battery.id, "minus");
    const wired = [plusNet, minusNet].every(
      (n) => n !== null && (net.pinsOf.get(n) ?? []).length > 1,
    );

    /* Ikki qutb bitta tugunda — bevosita qisqa tutashuv. */
    if (plusNet !== null && plusNet === minusNet) {
      found.push(
        issue(
          "error",
          "Batareya qutblari qisqa tutashgan.",
          "+ va − orasiga hech bo'lmasa bitta yuk (rezistor, LED, buzzer) qo'ying.",
          [battery.id],
        ),
      );
      continue;
    }

    /* Yoqilgan, lekin faqat bitta uchi ulangan — zanjir yopilmagan. */
    if (battery.settings.enabled !== false && !wired && (plusNet || minusNet)) {
      const half = [plusNet, minusNet].some(
        (n) => n !== null && (net.pinsOf.get(n) ?? []).length > 1,
      );
      if (half) {
        found.push(
          issue(
            "warning",
            "Batareya zanjiri yopilmagan.",
            "Tok yurishi uchun batareyaning ikkala qutbi ham ulangan bo'lishi kerak.",
            [battery.id],
          ),
        );
      }
    }

    /* O'chirilgan batareya — sxema ishlamayotganining eng ko'p uchraydigan sababi. */
    if (battery.settings.enabled === false && wired) {
      found.push(
        issue("warning", "Batareya o'chirilgan.", "O'ng paneldagi «Yoqilgan» katagini belgilang.", [
          battery.id,
        ]),
      );
    }

    /* Teskari solingan batareya. */
    if (volts < 0 && wired) {
      found.push(
        issue(
          "warning",
          "Batareya teskari solingan.",
          "Qutblanishni «To'g'ri» ga o'zgartiring — aks holda tok teskari yo'nalishda bo'ladi.",
          [battery.id],
        ),
      );
    }
  }

  /* Batareya Arduino'ning 5V yoki 3V3 piniga ulangan — plata kuyadi. */
  const board = circuit.nodes.find((n) => getDefinition(n.type)?.isBoard);
  if (board) {
    for (const pinId of ["5V", "3V3"]) {
      const limit = pinId === "5V" ? 5 : 3.3;
      const start = netFor(net, board.id, pinId);
      if (start === null) continue;
      /*
       * Faqat ANIQ tashqi manba kuchlanishlarini (batareya, 5V element)
       * hisobga olamiz. Plata pinining o'zi ichki "quvvat relsi" deb
       * belgilangani (`powerNets`) buni qo'zg'atmasligi kerak — aks holda
       * hech narsa ulanmagan 3V3 pini ham 5 V ko'rinib, batareya bor har
       * qanday sxemada soxta "ortiqcha kuchlanish" xatosi chiqardi.
       */
      let supply: number | null = null;
      for (const id of reachableNets(net, start)) {
        const source = net.sourceNets.get(id);
        if (source !== undefined) supply = supply === null ? source : Math.max(supply, source);
      }
      if (supply === null || supply <= limit + 0.25) continue;
      found.push(
        issue(
          "error",
          `Arduino ${pinId} piniga ${supply} V berilgan.`,
          `Bu pin ${limit} V uchun mo'ljallangan. Yuqori kuchlanishni VIN piniga bering yoki batareyani plataga ulamang.`,
          [board.id],
        ),
      );
    }
  }

  /* Bitta tugunda turli kuchlanishdagi manbalar. */
  const perNet = new Map<string, Set<number>>();
  for (const battery of batteries) {
    const volts = batteryVoltage(battery.settings);
    if (volts <= 0) continue;
    const positive = netFor(net, battery.id, "plus");
    if (positive === null) continue;
    const set = perNet.get(positive) ?? new Set<number>();
    set.add(volts);
    perNet.set(positive, set);
  }
  for (const [netId, volts] of perNet) {
    if (volts.size < 2) continue;
    const nodeIds = (net.pinsOf.get(netId) ?? []).map((k) => splitPinKey(k).nodeId);
    found.push(
      issue(
        "error",
        "Turli kuchlanishdagi manbalar bir-biriga ulangan.",
        "Har xil kuchlanishli batareyalarni parallel ulab bo'lmaydi.",
        [...new Set(nodeIds)],
      ),
    );
  }

  return found;
}

/** Faqat to'sqinlik qiladigan xatolar bormi. */
export function hasBlockingErrors(issues: CircuitIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

void pinKey;
