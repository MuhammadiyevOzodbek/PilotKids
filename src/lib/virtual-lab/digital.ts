import { boardPinFor, type Netlist } from "./netlist";
import { SHIFT_REGISTER_BITS } from "./catalog";
import type { ArduinoBoardState, Circuit } from "./types";

/**
 * Raqamli komponentlarning ichki holati.
 *
 * Nima uchun alohida qatlam. Elektr yechuvchisi (`solver.ts`) holatsiz:
 * unga elementlar beriladi, u kuchlanish va tokni qaytaradi. Ammo 74HC595
 * kabi chiplar XOTIRAGA ega — ular takt signalining FRONTIGA qarab ishlaydi,
 * ya'ni javob faqat hozirgi kuchlanishlarga emas, oldingi holatga ham
 * bog'liq. Buni yechuvchi ichiga tiqib bo'lmaydi.
 *
 * Shu bois lifecycle ataylab bir tomonlama:
 *
 *   Arduino pinga yozadi → `stepDigital()` frontni aniqlaydi va registrni
 *   yangilaydi → `buildElements()` chiqishlarni manba sifatida qo'yadi →
 *   yechuvchi kuchlanishlarni hisoblaydi.
 *
 * Teskari yo'nalish YO'Q: raqamli qatlam yechuvchi natijasini o'qimaydi.
 * Shuning uchun cheksiz yangilanish sikli hosil bo'lishi mumkin emas.
 */

export interface ShiftRegisterState {
  /** Siljitish registri: [0] — eng oxirgi kirgan bit (Q0 tomon). */
  shift: boolean[];
  /** Chiqish (latch) registri — Q0…Q7 shu yerdan o'qiladi. */
  latch: boolean[];
  /** Chiqishlar yoqilganmi (`OE` past bo'lsa yoqiq). */
  enabled: boolean;
  /** Oldingi kadrdagi takt darajasi — front shu bilan aniqlanadi. */
  lastClock: boolean;
  lastLatch: boolean;
}

export type DigitalState = Record<string, ShiftRegisterState>;

function emptyRegister(): ShiftRegisterState {
  return {
    shift: new Array<boolean>(SHIFT_REGISTER_BITS).fill(false),
    latch: new Array<boolean>(SHIFT_REGISTER_BITS).fill(false),
    enabled: true,
    lastClock: false,
    lastLatch: false,
  };
}

export function initialDigitalState(circuit: Circuit): DigitalState {
  const state: DigitalState = {};
  for (const node of circuit.nodes) {
    if (node.type === "shift-register") state[node.id] = emptyRegister();
  }
  return state;
}

/**
 * Chip kirishidagi mantiqiy daraja.
 *
 * Kirish Arduino pinига ulangan bo'lsa — o'sha pinning holati. Ulanmagan
 * kirish `fallback` qiymatini oladi: haqiqiy chipda u "suzib yuradi", lekin
 * o'quv maqsadida aniq qiymat foydaliroq (masalan `SRCLR` odatda 5V ga
 * ulangan bo'ladi va uni unutish keng tarqalgan xato emas).
 */
function inputLevel(
  netlist: Netlist,
  board: ArduinoBoardState,
  nodeId: string,
  pinId: string,
  fallback: boolean,
): boolean {
  const pin = boardPinFor(netlist, nodeId, pinId);
  if (pin === null) return fallback;
  if (board.modes[pin] !== "output") return fallback;
  return (board.digital[pin] ?? 0) === 1 || (board.pwm[pin] ?? 0) > 127;
}

/**
 * Bir qadam oldinga: barcha raqamli chiplarning holatini yangilaydi.
 *
 * Sof funksiya — kirish holatini o'zgartirmaydi, yangi obyekt qaytaradi.
 * Shu tufayli uni xohlagancha chaqirish mumkin: front faqat daraja
 * HAQIQATAN o'zgarganda hisobga olinadi.
 */
export function stepDigital(
  circuit: Circuit,
  netlist: Netlist,
  board: ArduinoBoardState,
  previous: DigitalState,
): DigitalState {
  const next: DigitalState = {};

  for (const node of circuit.nodes) {
    if (node.type !== "shift-register") continue;
    const prev = previous[node.id] ?? emptyRegister();

    const ser = inputLevel(netlist, board, node.id, "ser", false);
    const clock = inputLevel(netlist, board, node.id, "srclk", false);
    const latchClock = inputLevel(netlist, board, node.id, "rclk", false);
    // `SRCLR` past bo'lsa tozalaydi; ulanmagan bo'lsa "tozalanmagan" (HIGH).
    const clear = inputLevel(netlist, board, node.id, "srclr", true);
    // `OE` past bo'lsa chiqish yoniq; ulanmagan bo'lsa yoniq (LOW).
    const outputEnable = inputLevel(netlist, board, node.id, "oe", false);

    let shift = [...prev.shift];
    let latch = [...prev.latch];

    if (!clear) {
      shift = new Array<boolean>(SHIFT_REGISTER_BITS).fill(false);
    } else if (clock && !prev.lastClock) {
      // Ko'tariluvchi front: hamma bit bittaga suriladi, SER eng boshiga.
      shift = [ser, ...shift.slice(0, SHIFT_REGISTER_BITS - 1)];
    }

    // Latch fronti: siljitish registri chiqishga ko'chiriladi.
    if (latchClock && !prev.lastLatch) latch = [...shift];

    next[node.id] = {
      shift,
      latch,
      enabled: !outputEnable,
      lastClock: clock,
      lastLatch: latchClock,
    };
  }

  return next;
}

/**
 * Chip chiqishidagi bit.
 *
 * `q0` — registrning eng oxirgi kirgan biti. `shiftOut(MSBFIRST)` bilan
 * yuborilgan bayt shu tartibda Q7…Q0 ga tushadi, ya'ni haqiqiy chipdagidek.
 */
export function shiftRegisterOutput(state: ShiftRegisterState | undefined, index: number): boolean {
  if (!state || !state.enabled) return false;
  return state.latch[index] === true;
}

/** `Q7'` — keyingi chipga uzatiladigan bit (zanjirlash uchun). */
export function shiftRegisterOverflow(state: ShiftRegisterState | undefined): boolean {
  if (!state) return false;
  return state.shift[SHIFT_REGISTER_BITS - 1] === true;
}
