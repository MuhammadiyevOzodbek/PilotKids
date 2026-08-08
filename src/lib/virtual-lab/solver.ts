/**
 * Doimiy tok (DC) yechuvchisi — tugunlar usuli.
 *
 * Nima uchun kerak edi. Ilgari yorqinlik "manbagacha bo'lgan eng kichik
 * qarshilik" orqali taxmin qilinardi. Ketma-ket ulangan oddiy zanjirda bu
 * to'g'ri javob beradi, lekin:
 *   • parallel ulangan ikkita LED bir-birining tokiga ta'sir qilmasdi;
 *   • kuchlanish bo'luvchi (ikki rezistor) o'rtasidagi nuqta noto'g'ri edi;
 *   • bir nechta batareya bo'lsa faqat kattasi hisobga olinardi.
 * Bu yerda esa Kirxgof qonunlari to'g'ridan-to'g'ri yechiladi, shuning uchun
 * javob sxema qanday yig'ilganidan qat'i nazar to'g'ri chiqadi.
 *
 * Model ataylab soddalashtirilgan: faqat DC, faqat rezistiv elementlar va
 * chegaraviy-chiziqli diod. Sig'im va induktivlik yo'q — o'quv sxemalarida
 * ular uchramaydi va ularsiz yechim bir necha mikrosekundda chiqadi.
 */

/** Manba ideal emas: har bir manbaning ichki qarshiligi bor. */
export interface SolverSource {
  id: string;
  kind: "source";
  /** Musbat uchi ulangan tugun. */
  a: string;
  /** Manfiy uchi ulangan tugun. */
  b: string;
  volts: number;
  /** Ichki (chiqish) qarshilik, Ω. Nol bo'lishi mumkin emas. */
  ohms: number;
}

export interface SolverResistor {
  id: string;
  kind: "resistor";
  a: string;
  b: string;
  ohms: number;
}

/**
 * Diod (LED ham shu).
 *
 * `vf` dan past kuchlanishda umuman o'tkazmaydi, undan yuqorisida esa
 * `vf` kuchlanish tushishi va `ohms` differensial qarshilik bilan
 * o'tkazadi — haqiqiy LED egri chizig'ining o'quv maqsadi uchun yetarli
 * darajadagi soddalashtirilgan ko'rinishi.
 */
export interface SolverDiode {
  id: string;
  kind: "diode";
  /** Anod. */
  a: string;
  /** Katod. */
  b: string;
  vf: number;
  ohms: number;
}

/**
 * Boshqariladigan kalit — kuchlanish bilan ochiladigan qarshilik.
 *
 * Diod bilan bir xil iteratsiya siklida yechiladi: har o'tishda boshqaruv
 * uchlaridagi kuchlanish farqi o'lchanadi va kalit ochiq/yopiq deb
 * belgilanadi. Shu bitta element tranzistorning kollektor-emitter yo'lini
 * ham, H-ko'prik tarmog'ini ham qoplaydi.
 *
 * `onVolts` va `offVolts` ataylab har xil (gisterezis): usiz kalit chegara
 * atrofida har o'tishda holatini o'zgartirib, yechim tebranib qolardi.
 */
export interface SolverSwitch {
  id: string;
  kind: "switch";
  a: string;
  b: string;
  /** Boshqaruv kuchlanishi shu ikki tugun orasidan o'lchanadi. */
  controlA: string;
  controlB: string;
  /** Ochilish chegarasi (V). */
  onVolts: number;
  /** Yopilish chegarasi (V) — `onVolts` dan kichik bo'lishi kerak. */
  offVolts: number;
  /** Ochiq holatdagi qarshilik (Ω). */
  onOhms: number;
  /** Yopiq holatdagi qarshilik (Ω) — juda katta. */
  offOhms: number;
}

/**
 * Kondensator.
 *
 * Yechuvchi hozir faqat O'RNASHGAN holatni (DC steady state) hisoblaydi,
 * unda kondensator uzilgan zanjir bo'lib turadi — shuning uchun u shunday
 * shtamplanadi. `farads` esa ataylab saqlanadi: keyinchalik o'tkinchi
 * (transient) tahlil qo'shilganda element turini o'zgartirmasdan, faqat
 * shtamplashni kengaytirish yetarli bo'ladi.
 */
export interface SolverCapacitor {
  id: string;
  kind: "capacitor";
  a: string;
  b: string;
  farads: number;
}

export type SolverElement =
  SolverSource | SolverResistor | SolverDiode | SolverSwitch | SolverCapacitor;

export interface SolveResult {
  /** Tugun → kuchlanish (V). Tayanch tugun doim 0. */
  voltage: Map<string, number>;
  /**
   * Element → tok (A), `a` dan `b` ga oqayotgani musbat.
   *
   * Belgi barcha element turlarida bir xil. Zaryadsizlanayotgan batareyada
   * u manfiy bo'ladi — tok musbat uchdan TASHQARIGA chiqadi, ya'ni element
   * ichida `b` dan `a` ga qarab oqadi.
   */
  current: Map<string, number>;
}

/**
 * Har bir tugundan tayanchgacha qo'yiladigan juda katta qarshilik.
 *
 * Usiz "osilib qolgan" tugun (masalan hech narsaga ulanmagan LED oyog'i)
 * matritsani yechib bo'lmaydigan holga keltiradi. Qiymat shunchalik
 * kichikki, natijaga sezilarli ta'sir qilmaydi.
 */
const GMIN = 1e-9;

/** O'chiq diodning o'tkazuvchanligi — nolga teng emas, lekin amalda nol. */
const OFF_CONDUCTANCE = 1e-12;

/** Diod holatlarini barqarorlashtirish uchun eng ko'p necha marta urinamiz. */
const MAX_PASSES = 24;

/**
 * Chiziqli tenglamalar sistemasini yechadi (Gauss usuli, ustun bo'yicha
 * bosh element tanlash bilan). Yechim bo'lmasa `null`.
 */
function solveLinear(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  // Nusxada ishlaymiz — chaqiruvchi matritsani qayta ishlatishi mumkin.
  const m = matrix.map((row) => [...row]);
  const b = [...rhs];

  for (let col = 0; col < n; col++) {
    // Eng katta modulli qatorni tanlaymiz: aks holda kichik bosh element
    // bo'linishda xatoni kattalashtiradi.
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row]![col]!) > Math.abs(m[pivot]![col]!)) pivot = row;
    }
    if (Math.abs(m[pivot]![col]!) < 1e-14) return null;

    if (pivot !== col) {
      [m[col], m[pivot]] = [m[pivot]!, m[col]!];
      [b[col], b[pivot]] = [b[pivot]!, b[col]!];
    }

    const head = m[col]!;
    for (let row = col + 1; row < n; row++) {
      const factor = m[row]![col]! / head[col]!;
      if (factor === 0) continue;
      const current = m[row]!;
      for (let k = col; k < n; k++) current[k]! -= factor * head[k]!;
      b[row]! -= factor * b[col]!;
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row]!;
    for (let col = row + 1; col < n; col++) sum -= m[row]![col]! * x[col]!;
    x[row] = sum / m[row]![row]!;
  }
  return x;
}

/**
 * Sxemani yechadi.
 *
 * `groundNets` — nol deb olinadigan tugunlar. Bittasi tayanch qilib
 * tanlanadi, qolganlari unga qisqa tutashtiriladi (haqiqiy sxemada ham
 * barcha GND nuqtalari bir xil potensialda).
 */
export function solveCircuit(
  elements: readonly SolverElement[],
  groundNets: ReadonlySet<string>,
): SolveResult {
  const empty: SolveResult = { voltage: new Map(), current: new Map() };
  if (elements.length === 0) return empty;

  /* ── Tugunlar ro'yxati ── */
  const index = new Map<string, number>();
  const nodes: string[] = [];
  const register = (net: string) => {
    if (index.has(net)) return;
    index.set(net, nodes.length);
    nodes.push(net);
  };
  for (const el of elements) {
    register(el.a);
    register(el.b);
    if (el.kind === "switch") {
      register(el.controlA);
      register(el.controlB);
    }
  }

  // Tayanch: imkon bo'lsa yer, aks holda birinchi tugun.
  const reference = nodes.find((net) => groundNets.has(net)) ?? nodes[0]!;
  const refIndex = index.get(reference)!;

  const n = nodes.length;
  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const I = new Array<number>(n).fill(0);

  const addConductance = (a: number, b: number, g: number) => {
    G[a]![a]! += g;
    G[b]![b]! += g;
    G[a]![b]! -= g;
    G[b]![a]! -= g;
  };

  /* ── Diod va kalit holatlari: har o'tishda qayta baholanadi ── */
  const conducting = new Map<string, boolean>();
  for (const el of elements) {
    if (el.kind === "diode" || el.kind === "switch") conducting.set(el.id, false);
  }

  let voltages: number[] | null = null;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    for (let i = 0; i < n; i++) {
      I[i] = 0;
      G[i]!.fill(0);
      // Osilib qolgan tugunlar uchun ozgina o'tkazuvchanlik.
      if (i !== refIndex) G[i]![i]! += GMIN;
    }

    for (const el of elements) {
      const a = index.get(el.a)!;
      const b = index.get(el.b)!;

      if (el.kind === "resistor") {
        addConductance(a, b, 1 / Math.max(el.ohms, 1e-6));
        continue;
      }

      if (el.kind === "capacitor") {
        // O'rnashgan holatda kondensator orqali tok o'tmaydi.
        addConductance(a, b, OFF_CONDUCTANCE);
        continue;
      }

      if (el.kind === "switch") {
        const ohms = conducting.get(el.id) === true ? el.onOhms : el.offOhms;
        addConductance(a, b, 1 / Math.max(ohms, 1e-6));
        continue;
      }

      if (el.kind === "source") {
        /*
         * Tevenen (kuchlanish + ichki qarshilik) → Norton (tok + shu
         * o'tkazuvchanlik). Shu almashtirish tufayli qo'shimcha noma'lum
         * kerak emas: sistema faqat tugun kuchlanishlaridan iborat qoladi.
         */
        const g = 1 / Math.max(el.ohms, 1e-6);
        addConductance(a, b, g);
        const current = el.volts * g;
        I[a]! += current;
        I[b]! -= current;
        continue;
      }

      /*
       * Diod. Ochiq holatda u — ketma-ket ulangan `vf` kuchlanish va
       * `ohms` qarshilik, ya'ni manba bilan BIR XIL shtamp. Belgisi ham
       * o'sha: shoxdagi tok `(Va − Vb − vf) / R`.
       */
      if (conducting.get(el.id) === true) {
        const g = 1 / Math.max(el.ohms, 1e-6);
        addConductance(a, b, g);
        const current = el.vf * g;
        I[a]! += current;
        I[b]! -= current;
      } else {
        addConductance(a, b, OFF_CONDUCTANCE);
      }
    }

    // Tayanch tugun: V = 0.
    G[refIndex]!.fill(0);
    G[refIndex]![refIndex] = 1;
    I[refIndex] = 0;
    // Qolgan yer tugunlari ham tayanchga tenglashtiriladi.
    for (let i = 0; i < n; i++) {
      if (i === refIndex || !groundNets.has(nodes[i]!)) continue;
      G[i]!.fill(0);
      G[i]![i] = 1;
      I[i] = 0;
    }

    const solution = solveLinear(G, I);
    if (!solution) return empty;
    voltages = solution;

    // Diod va kalit holatlarini yangilaymiz; o'zgarmasa — yechim topildi.
    let changed = false;
    for (const el of elements) {
      let next: boolean;
      if (el.kind === "diode") {
        const across = solution[index.get(el.a)!]! - solution[index.get(el.b)!]!;
        next = conducting.get(el.id) === true ? across > el.vf - 0.05 : across > el.vf;
      } else if (el.kind === "switch") {
        const control = solution[index.get(el.controlA)!]! - solution[index.get(el.controlB)!]!;
        next = conducting.get(el.id) === true ? control > el.offVolts : control > el.onVolts;
      } else {
        continue;
      }
      if (next !== conducting.get(el.id)) {
        conducting.set(el.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  if (!voltages) return empty;

  /* ── Natija ── */
  const voltage = new Map<string, number>();
  for (let i = 0; i < n; i++) voltage.set(nodes[i]!, voltages[i]!);

  const current = new Map<string, number>();
  for (const el of elements) {
    const va = voltages[index.get(el.a)!]!;
    const vb = voltages[index.get(el.b)!]!;
    if (el.kind === "resistor") {
      current.set(el.id, (va - vb) / Math.max(el.ohms, 1e-6));
    } else if (el.kind === "source") {
      current.set(el.id, (va - vb - el.volts) / Math.max(el.ohms, 1e-6));
    } else if (el.kind === "capacitor") {
      current.set(el.id, 0);
    } else if (el.kind === "switch") {
      const ohms = conducting.get(el.id) === true ? el.onOhms : el.offOhms;
      current.set(el.id, (va - vb) / Math.max(ohms, 1e-6));
    } else {
      current.set(
        el.id,
        conducting.get(el.id) === true ? (va - vb - el.vf) / Math.max(el.ohms, 1e-6) : 0,
      );
    }
  }

  return { voltage, current };
}
