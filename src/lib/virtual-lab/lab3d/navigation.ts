/**
 * Klaviatura bilan yurish hisobi.
 *
 * Bu modul SOF: three.js ham, React ham import qilmaydi va hech narsani
 * o'zgartirmaydi — faqat "kamera qancha siljishi kerak" degan savolga
 * javob beradi. Shu sababli uni `.ts` testida to'liq tekshirish mumkin,
 * sahna esa natijani olib qo'llaydi.
 */

export interface Vec {
  x: number;
  y: number;
  z: number;
}

/** Bosilgan tugmalardan yig'ilgan yo'nalish. */
export interface Movement {
  /** Oldinga (+1) yoki orqaga (−1). */
  forward: number;
  /** O'ngga (+1) yoki chapga (−1). */
  strafe: number;
  /** Yuqoriga (+1) yoki pastga (−1). */
  lift: number;
}

/**
 * Tugma → yo'nalish.
 *
 * Kalit sifatida `KeyboardEvent.code` ISHLATILADI, `key` emas: `code`
 * klaviaturadagi FIZIK tugmani bildiradi. Foydalanuvchi kirill yoki
 * o'zbek tartibiga o'tsa `key` "ц" bo'lib qoladi, `code` esa baribir
 * `KeyW` — ya'ni tugmalar har qanday tilda ishlaydi.
 */
export const MOVE_KEYS: Readonly<Record<string, Partial<Movement>>> = {
  KeyW: { forward: 1 },
  ArrowUp: { forward: 1 },
  KeyS: { forward: -1 },
  ArrowDown: { forward: -1 },
  KeyA: { strafe: -1 },
  ArrowLeft: { strafe: -1 },
  KeyD: { strafe: 1 },
  ArrowRight: { strafe: 1 },
  KeyE: { lift: 1 },
  KeyQ: { lift: -1 },
};

/**
 * Bosib turilgan tugmalardan umumiy yo'nalish.
 *
 * Qarama-qarshi tugmalar (masalan `W` va `S`) bir-birini yo'qotadi —
 * ikkalasi ham bosilgan bo'lsa kamera joyida turadi.
 */
export function movementFrom(codes: Iterable<string>): Movement {
  const total: Movement = { forward: 0, strafe: 0, lift: 0 };
  for (const code of codes) {
    const move = MOVE_KEYS[code];
    if (!move) continue;
    total.forward += move.forward ?? 0;
    total.strafe += move.strafe ?? 0;
    total.lift += move.lift ?? 0;
  }
  return total;
}

export interface NavigationInput extends Movement {
  /** Kameraning joriy o'rni. */
  camera: Vec;
  /** `OrbitControls` nishoni — kamera shu nuqta atrofida aylanadi. */
  target: Vec;
  /** Kameraning qarash yo'nalishi (normalizatsiya shart emas). */
  direction: Vec;
  /** Oxirgi kadrdan beri o'tgan vaqt (sekund). */
  delta: number;
  /** Shift bosilganmi — tez yurish. */
  boost: boolean;
  /** Nishon qaysi to'rtburchak ichida qola oladi (markazdan, sm). */
  bounds: { x: number; z: number };
}

/**
 * Bitta kadrda hisobga olinadigan eng katta vaqt (sekund).
 *
 * ── Buning oldini olayotgan xato ────────────────────────────────────────
 * Sahna `frameloop="demand"` rejimida ishlaydi: bo'sh turganda kadr
 * UMUMAN chizilmaydi. `useFrame` beradigan `delta` esa — oxirgi CHIZILGAN
 * kadrdan beri o'tgan vaqt. Ya'ni foydalanuvchi sahnaga tegmasdan yarim
 * daqiqa turib, keyin `W` ni bossa, birinchi kadrga `delta ≈ 30` keladi
 * va kamera bitta kadrda o'n metrlab uchib ketardi.
 *
 * 1/20 s — sezilarli sakrashsiz eng katta qadam. Bundan sekin ishlaydigan
 * kompyuterda harakat biroz sekinlashadi, lekin uzilib ketmaydi.
 */
export const MAX_FRAME = 0.05;

/**
 * Tezlik chegaralari (sm/s) va masshtabga bog'liqlik.
 *
 * Tezlik kameraning nishondan uzoqligiga qarab o'sadi: uzoqdan qaraganda
 * butun stolni kesib o'tish kerak, yaqindan esa millimetrlab surilish.
 * Doimiy tezlik ikkala holatda ham noqulay bo'lardi.
 */
export const SPEED = { min: 6, max: 45, factor: 0.85, boost: 2.6 } as const;

/** Kamera stol yuzasidan pastga tushmasin (sm). */
export const MIN_HEIGHT = 1.5;

/**
 * Kamera va nishon shu kadrda qancha siljishi kerak.
 *
 * Kamera ham, nishon ham AYNAN bir xil vektorga siljiydi: `OrbitControls`
 * kamerani nishon atrofida aylantiradi, shuning uchun faqat kamerani
 * ko'chirish "yurish" o'rniga "aylanish" bo'lib chiqardi.
 */
export function navigationShift(input: NavigationInput): Vec {
  const { forward, strafe, lift } = input;
  if (forward === 0 && strafe === 0 && lift === 0) return { x: 0, y: 0, z: 0 };

  const step = frameSpeed(input) * Math.min(input.delta, MAX_FRAME);

  /*
   * Oldinga yo'nalish — qarash yo'nalishining GORIZONTAL proyeksiyasi.
   * Aks holda pastga qarab turib "oldinga" bosilsa kamera stol ichiga
   * kirib ketardi.
   */
  const ahead = flatten(input.direction);
  // O'ngga yo'nalish: oldinga × yuqoriga.
  const side = { x: -ahead.z, z: ahead.x };

  const shift = {
    x: (ahead.x * forward + side.x * strafe) * step,
    y: lift * step,
    z: (ahead.z * forward + side.z * strafe) * step,
  };

  return clampShift(shift, input);
}

/** Qarash yo'nalishining gorizontal, birlik uzunlikdagi ko'rinishi. */
function flatten(direction: Vec): { x: number; z: number } {
  const length = Math.hypot(direction.x, direction.z);
  // Kamera tik pastga qarab turibdi — oldinga qayerligini aytib bo'lmaydi.
  // Shunda "shimol" tanlanadi, aks holda harakat butunlay to'xtab qolardi.
  if (length < 1e-6) return { x: 0, z: -1 };
  return { x: direction.x / length, z: direction.z / length };
}

/** Shu kadrdagi tezlik (sm/s). */
function frameSpeed(input: NavigationInput): number {
  const distance = Math.hypot(
    input.camera.x - input.target.x,
    input.camera.y - input.target.y,
    input.camera.z - input.target.z,
  );
  const base = clamp(distance * SPEED.factor, SPEED.min, SPEED.max);
  return input.boost ? base * SPEED.boost : base;
}

/**
 * Siljishni chegaralarga sig'dirish.
 *
 * Gorizontal bo'yicha NISHON stol atrofida qoladi — shunda foydalanuvchi
 * bo'sh qorong'ilikka uchib ketib, "qaytib kelolmayapman" holatiga
 * tushmaydi. Vertikal bo'yicha esa KAMERA tekshiriladi: nishon stol
 * ostida bo'lishi mumkin (pastga qarash uchun kerak), lekin kameraning
 * o'zi yer ostiga tushsa sahna ag'darilgan ko'rinardi.
 */
function clampShift(shift: Vec, input: NavigationInput): Vec {
  const { target, camera, bounds } = input;

  const x = clamp(target.x + shift.x, -bounds.x, bounds.x) - target.x;
  const z = clamp(target.z + shift.z, -bounds.z, bounds.z) - target.z;
  const y = Math.max(camera.y + shift.y, MIN_HEIGHT) - camera.y;

  return { x, y, z };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
