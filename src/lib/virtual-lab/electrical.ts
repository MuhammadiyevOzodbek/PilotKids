import { batteryVoltage, getDefinition, resistorOhms, SHIFT_REGISTER_BITS } from "./catalog";
import { boardPinFor, netFor, supplyVoltage, type Netlist } from "./netlist";
import { shiftRegisterOutput, shiftRegisterOverflow, type DigitalState } from "./digital";
import type { SolverElement } from "./solver";
import type { ArduinoBoardState, Circuit, CircuitNode, MotorDriverMode } from "./types";

/**
 * Sxemani yechuvchi tushunadigan elementlar ro'yxatiga aylantiradi.
 *
 * Bu qatlam ataylab alohida: katalogdagi komponent ("servo", "LCD") bilan
 * elektr modeli ("100 Ω yuk") orasidagi bog'liqlik faqat shu yerda turadi.
 * Yangi komponent qo'shilganda uning elektr xatti-harakati bitta yozuv
 * bilan ta'riflanadi va yechuvchiga tegilmaydi.
 */

/** LED ochilish kuchlanishi (V) va ochilgandan keyingi qarshiligi (Ω). */
export const LED_VF = 1.8;
const LED_DYNAMIC_OHMS = 12;

/** Arduino raqamli chiqishining ichki qarshiligi — pin ideal manba emas. */
const PIN_OUTPUT_OHMS = 25;

/** Plata quvvat relslarining ichki qarshiligi. */
const RAIL_OHMS = 0.5;

/**
 * Batareyaning ichki qarshiligi.
 *
 * Qasddan kichik: haqiqiy batareyada u 1–2 Ω bo'ladi va multimetr 12 V
 * o'rniga 11.9 V ko'rsatardi. Bola uchun bu foydali emas — u sozlagan
 * qiymat ekranda o'sha bo'yicha turishi kerak. Nol emasligi esa qisqa
 * tutashuvda tokni cheksiz bo'lishdan saqlaydi.
 */
const BATTERY_OHMS = 0.05;

/** `INPUT_PULLUP` ichki tortuvchi qarshiligi (Arduino'da ~20–50 kΩ). */
const PULLUP_OHMS = 20000;

/** Multimetrning ichki qarshiligi — o'lchov zanjirga ta'sir qilmasin. */
const METER_OHMS = 10_000_000;

/**
 * Ikki uchli yuklarning taxminiy qarshiligi (Ω).
 *
 * Qiymatlar haqiqiy detallardan olingan: buzzer 5 V da ~30 mA,
 * o'yinchoq motor ~80 mA, rele chulg'ami ~70 mA tortadi.
 */
const LOAD_OHMS: Record<string, { a: string; b: string; ohms: number }> = {
  buzzer: { a: "plus", b: "minus", ohms: 160 },
  "dc-motor": { a: "t1", b: "t2", ohms: 60 },
};

/**
 * VCC va GND orasidan tok tortadigan modullar (Ω).
 *
 * Ular zanjirni yopadi: shuning uchun ham quvvat berilgan sensor
 * "sxemadagi tirik element" sifatida hisobga olinadi.
 */
const MODULE_OHMS: Record<string, number> = {
  servo: 100,
  relay: 70,
  lcd1602: 200,
  dht11: 2500,
  ldr: 5000,
  tmp36: 10000,
  "soil-moisture": 1000,
  pir: 1000,
  ultrasonic: 400,
};

/**
 * LCD orqa yoritish LEDlari (Ω).
 *
 * Haqiqiy modulda ular ~20 mA tortadi, ya'ni 5 V da taxminan 250 Ω.
 * Ko'pchilik modulda cheklovchi rezistor plataning o'zida bor, shuning
 * uchun bu yerda ham qarshilik ichkarida hisoblanadi.
 */
const LCD_BACKLIGHT_OHMS = 250;

/** Potensiometr yo'lakchasining to'liq qarshiligi. */
const POT_TOTAL_OHMS = 10000;

/** Oddiy kremniy diodning ochilgandan keyingi qarshiligi (Ω). */
const DIODE_DYNAMIC_OHMS = 8;

/**
 * Tranzistorning kollektor-emitter yo'li.
 *
 * Model ataylab kalit darajasida: baza ochilsa yo'l `ON` qarshilikka
 * tushadi, aks holda amalda uzilgan bo'ladi. Haqiqiy tranzistorning
 * chiziqli (ACTIVE) sohasi bunda modellanmaydi — o'quv sxemalarida
 * tranzistor deyarli har doim kalit sifatida ishlatiladi. `beta` esa
 * bekor emas: u yordamida baza toki yetarlimi yoki yo'qmi hisoblanadi va
 * inspektorda `ACTIVE`/`SATURATED` farqi ko'rsatiladi.
 */
const BJT_ON_OHMS = 6;
const BJT_OFF_OHMS = 1e9;
/** Baza-emitter o'tishining ochilgandan keyingi qarshiligi. */
const BJT_BASE_OHMS = 12;

/** Joystik potensiometrlarining to'liq qarshiligi. */
const JOYSTICK_TOTAL_OHMS = 10000;
/** Joystik tugmasi bosilganda GND ga ulanish qarshiligi. */
const SWITCH_CLOSED_OHMS = 5;

/** L298N chiqish tranzistorlarining qarshiligi. */
const DRIVER_OHMS = 2;

/** 74HC595 chiqishining ichki qarshiligi. */
const LOGIC_OUTPUT_OHMS = 25;

/** L298N kanali uchun IN/EN darajalaridan holat va tezlikni chiqaradi. */
export function motorDriverChannel(
  in1: boolean,
  in2: boolean,
  enableDuty: number,
): { mode: MotorDriverMode; direction: number; duty: number } {
  if (enableDuty <= 0) return { mode: "stop", direction: 0, duty: 0 };
  // Ikkala kirish bir xil bo'lsa ko'prik motorni qisqa tutashtiradi — tormoz.
  if (in1 === in2) return { mode: "brake", direction: 0, duty: enableDuty };
  return in1
    ? { mode: "forward", direction: 1, duty: enableDuty }
    : { mode: "reverse", direction: -1, duty: enableDuty };
}

export interface ElementBuildResult {
  elements: SolverElement[];
  /**
   * Komponent va uning pin juftligi → element identifikatori.
   * Tokni o'qish uchun: `currentOf("led1")`.
   */
  elementOfNode: Map<string, string>;
}

/**
 * Elementlarni yig'adi.
 *
 * `board` — plataning joriy holati: qaysi pin chiqish, qaysisi HIGH. Usiz
 * Arduino tomon umuman manba bermaydi va hech narsa yonmaydi.
 */
export function buildElements(
  circuit: Circuit,
  netlist: Netlist,
  board: ArduinoBoardState,
  sensors: Record<string, number> = {},
  digital: DigitalState = {},
): ElementBuildResult {
  const elements: SolverElement[] = [];
  const elementOfNode = new Map<string, string>();

  const net = (node: CircuitNode, pinId: string) => netFor(netlist, node.id, pinId);

  /** Ikki pin ham tugunda bo'lsa element qo'shadi. */
  const between = (
    node: CircuitNode,
    aPin: string,
    bPin: string,
    make: (a: string, b: string, id: string) => SolverElement,
  ) => {
    const a = net(node, aPin);
    const b = net(node, bPin);
    if (a === null || b === null || a === b) return;
    const id = `${node.id}`;
    elements.push(make(a, b, id));
    elementOfNode.set(node.id, id);
  };

  /*
   * Yer tayanchi. `ground` va `power-5v` kabi bitta pinli belgilar uchun
   * qaytish yo'li kerak: haqiqiy sxemada u manbaning ikkinchi uchi.
   */
  const groundReference = [...netlist.groundNets][0] ?? null;

  /**
   * Modul kirishidagi mantiqiy daraja va PWM to'ldirish koeffitsiyenti.
   *
   * Kirish Arduino pinига ulangan bo'lsa — o'sha pinning haqiqiy holati.
   * Bu «signal» taxmin qilinmaydi: qaysi pin ulanganini netlist aytadi.
   */
  const driveOf = (node: CircuitNode, pinId: string): { high: boolean; duty: number } => {
    const pin = boardPinFor(netlist, node.id, pinId);
    if (pin === null || board.modes[pin] !== "output") return { high: false, duty: 0 };
    const pwm = board.pwm[pin] ?? 0;
    if (pwm > 0) return { high: true, duty: Math.min(1, pwm / 255) };
    const high = (board.digital[pin] ?? 0) === 1;
    return { high, duty: high ? 1 : 0 };
  };

  for (const node of circuit.nodes) {
    const def = getDefinition(node.type);
    if (!def) continue;

    if (def.isBoard) continue; // Plata quyida alohida ko'riladi.

    switch (node.type) {
      case "battery": {
        const volts = batteryVoltage(node.settings);
        // Teskari solingan batareya manfiy qiymat qaytaradi — uchlarini
        // almashtiramiz, shunda yechuvchi uchun oddiy manba bo'lib qoladi.
        const plus = volts >= 0 ? "plus" : "minus";
        const minus = volts >= 0 ? "minus" : "plus";
        between(node, plus, minus, (a, b, id) => ({
          id,
          kind: "source",
          a,
          b,
          volts: Math.abs(volts),
          ohms: BATTERY_OHMS,
        }));
        break;
      }

      case "power-5v": {
        const out = net(node, "out");
        if (out === null || groundReference === null || out === groundReference) break;
        elements.push({
          id: node.id,
          kind: "source",
          a: out,
          b: groundReference,
          volts: 5,
          ohms: RAIL_OHMS,
        });
        elementOfNode.set(node.id, node.id);
        break;
      }

      case "resistor":
        between(node, "a", "b", (a, b, id) => ({
          id,
          kind: "resistor",
          a,
          b,
          ohms: resistorOhms(node.settings),
        }));
        break;

      case "led":
        between(node, "anode", "cathode", (a, b, id) => ({
          id,
          kind: "diode",
          a,
          b,
          vf: LED_VF,
          ohms: LED_DYNAMIC_OHMS,
        }));
        break;

      case "rgb-led":
        // Uchta alohida kristall, umumiy katod.
        for (const channel of ["r", "g", "b"] as const) {
          const a = net(node, channel);
          const b = net(node, "common");
          if (a === null || b === null || a === b) continue;
          elements.push({
            id: `${node.id}:${channel}`,
            kind: "diode",
            a,
            b,
            vf: LED_VF,
            ohms: LED_DYNAMIC_OHMS,
          });
        }
        break;

      case "potentiometer": {
        /*
         * Potensiometr — kuchlanish bo'luvchi: sirg'anuvchi kontakt yo'lakni
         * ikkiga bo'ladi. Ilgari u umuman modellanmagan edi, natijada
         * "wiper" nuqtasidagi kuchlanish sxemadan emas, faqat slayderdan
         * olinardi.
         */
        const raw =
          sensors[node.id] ?? (typeof node.settings.value === "number" ? node.settings.value : 512);
        const ratio = Math.max(0, Math.min(1, raw / 1023));
        const top = net(node, "vcc");
        const wiper = net(node, "wiper");
        const bottom = net(node, "gnd");
        if (top !== null && wiper !== null && top !== wiper) {
          elements.push({
            id: `${node.id}:top`,
            kind: "resistor",
            a: top,
            b: wiper,
            ohms: Math.max(1, POT_TOTAL_OHMS * (1 - ratio)),
          });
        }
        if (wiper !== null && bottom !== null && wiper !== bottom) {
          elements.push({
            id: `${node.id}:bottom`,
            kind: "resistor",
            a: wiper,
            b: bottom,
            ohms: Math.max(1, POT_TOTAL_OHMS * ratio),
          });
        }
        break;
      }

      case "diode": {
        const vf = typeof node.settings.vf === "number" ? node.settings.vf : 0.7;
        between(node, "a", "k", (a, b, id) => ({
          id,
          kind: "diode",
          a,
          b,
          vf,
          ohms: DIODE_DYNAMIC_OHMS,
        }));
        break;
      }

      case "capacitor": {
        const uf = typeof node.settings.microfarads === "number" ? node.settings.microfarads : 100;
        between(node, "plus", "minus", (a, b, id) => ({
          id,
          kind: "capacitor",
          a,
          b,
          farads: uf * 1e-6,
        }));
        break;
      }

      case "npn-transistor": {
        /*
         * NPN tranzistor ikki elementdan yig'iladi:
         *   • baza-emitter — oddiy diod (shu bois baza toki cheklangan);
         *   • kollektor-emitter — baza kuchlanishi bilan ochiladigan kalit.
         *
         * Kalit ataylab BOSHQARILADIGAN element: agar kollektor yo'li
         * shunchaki qarshilik bo'lganida, tranzistor doim ochiq turardi va
         * "baza toki bo'lmasa yopiq" degan asosiy g'oya yo'qolardi.
         */
        const vbe = typeof node.settings.vbe === "number" ? node.settings.vbe : 0.7;
        const baseNet = net(node, "b");
        const emitterNet = net(node, "e");
        const collectorNet = net(node, "c");

        if (baseNet !== null && emitterNet !== null && baseNet !== emitterNet) {
          elements.push({
            id: `${node.id}:be`,
            kind: "diode",
            a: baseNet,
            b: emitterNet,
            vf: vbe,
            ohms: BJT_BASE_OHMS,
          });
        }
        if (
          collectorNet !== null &&
          emitterNet !== null &&
          baseNet !== null &&
          collectorNet !== emitterNet
        ) {
          elements.push({
            id: node.id,
            kind: "switch",
            a: collectorNet,
            b: emitterNet,
            controlA: baseNet,
            controlB: emitterNet,
            onVolts: vbe,
            offVolts: vbe - 0.05,
            onOhms: BJT_ON_OHMS,
            offOhms: BJT_OFF_OHMS,
          });
          elementOfNode.set(node.id, node.id);
        }
        break;
      }

      case "joystick": {
        /*
         * Joystik — ikkita potensiometr va bitta tugma. Har bir o'q
         * kuchlanish bo'luvchi bo'lgani uchun `analogRead` qiymati
         * sxemadan chiqadi: 5 V da o'rta holat ≈ 2.5 V ≈ 512.
         */
        const top = net(node, "vcc");
        const bottom = net(node, "gnd");
        const axis = (pinId: string, settingKey: string) => {
          const raw =
            typeof node.settings[settingKey] === "number"
              ? (node.settings[settingKey] as number)
              : 0;
          // −100…+100 → 0…1 (markaz 0.5).
          const ratio = Math.max(0, Math.min(1, (raw + 100) / 200));
          const wiper = net(node, pinId);
          if (wiper === null) return;
          if (top !== null && top !== wiper) {
            elements.push({
              id: `${node.id}:${pinId}-top`,
              kind: "resistor",
              a: top,
              b: wiper,
              ohms: Math.max(1, JOYSTICK_TOTAL_OHMS * (1 - ratio)),
            });
          }
          if (bottom !== null && bottom !== wiper) {
            elements.push({
              id: `${node.id}:${pinId}-bottom`,
              kind: "resistor",
              a: wiper,
              b: bottom,
              ohms: Math.max(1, JOYSTICK_TOTAL_OHMS * ratio),
            });
          }
        };
        axis("vrx", "x");
        axis("vry", "y");

        // Tugma bosilganda SW yerga tortiladi (haqiqiy modulda ham shunday).
        if (node.settings.pressed === true) {
          const sw = net(node, "sw");
          if (sw !== null && bottom !== null && sw !== bottom) {
            elements.push({
              id: `${node.id}:sw`,
              kind: "resistor",
              a: sw,
              b: bottom,
              ohms: SWITCH_CLOSED_OHMS,
            });
          }
        }
        break;
      }

      case "seven-segment": {
        /*
         * Har bir segment — alohida LED. Shu sababli ular oddiy LED bilan
         * bir xil qoidalarga bo'ysunadi: rezistorsiz ulansa tok haddan
         * oshadi va ogohlantirish chiqadi.
         */
        const commonAnode = node.settings.common === "anode";
        const com = net(node, "com");
        for (const segment of ["a", "b", "c", "d", "e", "f", "g", "dp"]) {
          const pinNet = net(node, segment);
          if (pinNet === null || com === null || pinNet === com) continue;
          elements.push({
            id: `${node.id}:${segment}`,
            kind: "diode",
            // Umumiy anodda tok COM dan segmentga qarab oqadi.
            a: commonAnode ? com : pinNet,
            b: commonAnode ? pinNet : com,
            vf: LED_VF,
            ohms: LED_DYNAMIC_OHMS,
          });
        }
        break;
      }

      case "shift-register": {
        /*
         * 74HC595 — chiqishlari mantiqiy qatlam holatidan olinadigan
         * manbalar. Registrning o'zi `digital.ts` da yuritiladi, bu yerda
         * faqat "shu bit 1 bo'lsa chiqishda 5 V turadi" degan elektr
         * ta'rifi bor.
         */
        const gnd = net(node, "gnd");
        const vcc = net(node, "vcc");
        if (gnd !== null && vcc !== null && gnd !== vcc) {
          elements.push({
            id: `${node.id}:supply`,
            kind: "resistor",
            a: vcc,
            b: gnd,
            ohms: 20000,
          });
        }
        const state = digital[node.id];
        if (gnd === null || !state?.enabled) break;

        for (let i = 0; i < SHIFT_REGISTER_BITS; i++) {
          const outNet = net(node, `q${i}`);
          if (outNet === null || outNet === gnd) continue;
          elements.push({
            id: `${node.id}:q${i}`,
            kind: "source",
            a: outNet,
            b: gnd,
            volts: shiftRegisterOutput(state, i) ? 5 : 0,
            ohms: LOGIC_OUTPUT_OHMS,
          });
        }
        const overflow = net(node, "q7s");
        if (overflow !== null && overflow !== gnd) {
          elements.push({
            id: `${node.id}:q7s`,
            kind: "source",
            a: overflow,
            b: gnd,
            volts: shiftRegisterOverflow(state) ? 5 : 0,
            ohms: LOGIC_OUTPUT_OHMS,
          });
        }
        break;
      }

      case "l298n": {
        /*
         * H-ko'prik. Har bir chiqish yo motor kuchlanishiga, yo yerga
         * ulanadi — aynan shu ikki manba orasidagi FARQ motorni aylantiradi.
         *
         * Motor tezligi shu yerdan chiqmaydi: u OUT1–OUT2 orasiga ulangan
         * motor elementidan o'tgan HAQIQIY tok orqali hisoblanadi. Ya'ni
         * motorni ulashni unutgan bola hech qanday harakat ko'rmaydi.
         */
        const gnd = net(node, "gnd");
        if (gnd === null) break;

        // Kuchlanish avval simdan olinadi; ulanmagan bo'lsa sozlamadagi
        // nominal qiymat ishlatiladi (validator buni ogohlantiradi).
        const wired = supplyVoltage(netlist, node.id, "vin");
        const nominal =
          typeof node.settings.supplyVoltage === "number" ? node.settings.supplyVoltage : 12;
        const vin = wired ?? nominal;

        const channel = (enPin: string, aPin: string, bPin: string, outA: string, outB: string) => {
          const enable = driveOf(node, enPin);
          const in1 = driveOf(node, aPin).high;
          const in2 = driveOf(node, bPin).high;
          /*
           * ENA/ENB ulanmagan bo'lsa haqiqiy modulda jumper bilan doim
           * yoqilgan bo'ladi — ko'p sxemada shunday ishlatiladi.
           */
          const enabled =
            boardPinFor(netlist, node.id, enPin) === null ? { high: true, duty: 1 } : enable;
          const { mode } = motorDriverChannel(in1, in2, enabled.duty);
          if (mode === "stop") return;

          const drive = (pinId: string, volts: number) => {
            const outNet = net(node, pinId);
            if (outNet === null || outNet === gnd) return;
            elements.push({
              id: `${node.id}:${pinId}`,
              kind: "source",
              a: outNet,
              b: gnd,
              volts,
              ohms: DRIVER_OHMS,
            });
          };

          if (mode === "brake") {
            // Ikkala uch ham yerga — motor o'z inersiyasi bilan tormozlanadi.
            drive(outA, 0);
            drive(outB, 0);
            return;
          }
          drive(outA, mode === "forward" ? vin : 0);
          drive(outB, mode === "forward" ? 0 : vin);
        };

        channel("ena", "in1", "in2", "out1", "out2");
        channel("enb", "in3", "in4", "out3", "out4");
        break;
      }

      case "lcd1602": {
        // Mantiq qismi VDD–VSS orasidan tok tortadi.
        between(node, "vcc", "gnd", (a, b, id) => ({
          id,
          kind: "resistor",
          a,
          b,
          ohms: MODULE_OHMS.lcd1602!,
        }));
        /*
         * Orqa yoritish ALOHIDA zanjir: A (anod) va K (katod).
         *
         * Haqiqiy modulda ham u mantiqdan mustaqil — VDD ulanmasa ham
         * yoritish yonaveradi. Shu sababli u yerda ham alohida element:
         * bolaning "ekran yorug', lekin matn yo'q" holatini ko'rishi
         * xatoni topishga yordam beradi.
         */
        between(node, "a", "k", (a, b, id) => ({
          id,
          kind: "resistor",
          a,
          b,
          ohms: LCD_BACKLIGHT_OHMS,
        }));
        break;
      }

      case "multimeter": {
        // O'lchagichning o'zi ham element: shundagina uchlari turgan
        // tugunlar yechimda paydo bo'ladi va kuchlanishni o'qish mumkin.
        between(node, "probe-plus", "probe-minus", (a, b, id) => ({
          id,
          kind: "resistor",
          a,
          b,
          ohms: METER_OHMS,
        }));
        break;
      }

      default: {
        const load = LOAD_OHMS[node.type];
        if (load) {
          between(node, load.a, load.b, (a, b, id) => ({
            id,
            kind: "resistor",
            a,
            b,
            ohms: load.ohms,
          }));
          break;
        }
        const moduleOhms = MODULE_OHMS[node.type];
        if (moduleOhms !== undefined) {
          between(node, "vcc", "gnd", (a, b, id) => ({
            id,
            kind: "resistor",
            a,
            b,
            ohms: moduleOhms,
          }));
        }
        break;
      }
    }
  }

  /* ── Plata: quvvat relslari va chiqish pinlari ── */
  const boardNode = circuit.nodes.find((n) => getDefinition(n.type)?.isBoard);
  if (boardNode) {
    // Platadagi barcha GND pinlari ichkarida ulangan, shuning uchun
    // istalgan biri qaytish yo'li bo'la oladi.
    const returnNet = netFor(netlist, boardNode.id, "GND1") ?? groundReference;

    if (returnNet !== null) {
      const rail = (pinId: string, volts: number) => {
        const netId = netFor(netlist, boardNode.id, pinId);
        if (netId === null || netId === returnNet) return;
        elements.push({
          id: `${boardNode.id}:${pinId}`,
          kind: "source",
          a: netId,
          b: returnNet,
          volts,
          ohms: RAIL_OHMS,
        });
      };
      rail("5V", 5);
      rail("3V3", 3.3);

      /*
       * Raqamli chiqish pinlari. LOW ham manba: u tugunni yerga tortadi,
       * shuning uchun 0 V li manba sifatida qo'shiladi — aks holda o'chgan
       * pin "osilib" qolardi va unga ulangan LED noto'g'ri yonardi.
       *
       * PWM da to'liq 5 V ni qo'yamiz: haqiqiy pin ham shu kuchlanishni
       * tez o'chirib-yoqadi, o'rtacha yorqinlik esa to'ldirish
       * koeffitsiyentiga ko'paytiriladi.
       */
      for (const [pin, netId] of netlist.boardPinNets) {
        if (netId === returnNet) continue;
        const mode = board.modes[pin];
        if (mode === "output") {
          const high = (board.digital[pin] ?? 0) === 1 || (board.pwm[pin] ?? 0) > 0;
          elements.push({
            id: `${boardNode.id}:pin${pin}`,
            kind: "source",
            a: netId,
            b: returnNet,
            volts: high ? 5 : 0,
            ohms: PIN_OUTPUT_OHMS,
          });
        } else if (mode === "input_pullup") {
          elements.push({
            id: `${boardNode.id}:pullup${pin}`,
            kind: "source",
            a: netId,
            b: returnNet,
            volts: 5,
            ohms: PULLUP_OHMS,
          });
        }
        // `input` va sozlanmagan pin — yuqori qarshilik, element qo'shilmaydi.
      }
    }
  }

  return { elements, elementOfNode };
}
