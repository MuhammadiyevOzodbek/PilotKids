/**
 * Laboratoriya turlari.
 *
 * URL segmenti (`/lab/onlayn`) va bazadagi qiymat (`lab_project.kind`) ataylab
 * alohida: manzil o'zbekcha o'qiladi, bazada esa ingliz `online`/`offline`
 * qoladi (`lab_project_kind_check` cheklovi shuni kutadi).
 */

export const LAB_KINDS = {
  onlayn: {
    /** `lab_project.kind` dagi qiymat. */
    dbKind: "online",
    title: "Onlayn laboratoriya",
    hint: "Brauzerda bajariladi — hech qanday qurilma kerak emas",
    long: "Virtual sxema yig'ish maydoni: komponentlarni tortib qo'yasiz, simlar bilan ulaysiz, Arduino kodini yozasiz va simulyatsiyani ishga tushirasiz. LED ekranda haqiqiy yonadi.",
    /** Loyihalar soni o'rniga ko'rsatiladigan yorliq. */
    badge: "Interaktiv simulyator",
    icon: "computer",
    accent: "var(--primary)",
    accentText: "var(--on-primary)",
    accentSoft: "var(--primary-soft)",
    empty:
      "Onlayn loyiha ro'yxati bo'sh. Brauzer simulyatoridan foydalanish uchun /lab/onlayn sahifasini oching yoki admin paneldan loyiha qo'shing.",
  },
  offline: {
    dbKind: "offline",
    title: "Offline laboratoriya",
    hint: "Haqiqiy qurilmalar bilan — Arduino, sensorlar, LED",
    long: "Haqiqiy detallar bilan ishlaydigan loyihalar. Arduino, sensor va LED'larni ulab, o'z qurilmangizni yig'asiz.",
    icon: "memory",
    accent: "var(--fun-orange)",
    accentText: "var(--on-fun-orange)",
    accentSoft: "var(--fun-orange-soft)",
    empty: "Offline loyiha ro'yxati bo'sh. Bu bo'limdagi loyihalarni admin paneldan qo'shing.",
  },
} as const;

export type LabKindSlug = keyof typeof LAB_KINDS;

export function isLabKindSlug(value: string): value is LabKindSlug {
  return value === "onlayn" || value === "offline";
}

/**
 * 3D virtual laboratoriya — hozircha tayyorlanmoqda.
 *
 * `LAB_KINDS` ga ATAYLAB qo'shilmagan. U yerdagi turlar bazadagi
 * `lab_project.kind` bilan bog'langan (`lab_project_kind_check` faqat
 * `online` va `offline` ga ruxsat beradi) va `/lab/[kind]` sahifasi
 * loyihalar ro'yxatini o'sha ustundan quradi. 3D bo'limida esa hali
 * loyiha yo'q: uni `LAB_KINDS` ga qo'shish bazada mavjud bo'lmagan
 * turni qidiradigan, doim bo'sh ro'yxat beradigan sahifa hosil qilardi.
 *
 * Shu sababli u mustaqil marshrut — xuddi `/lab/onlayn` simulyatori kabi.
 */
export const LAB_3D = {
  slug: "3d",
  title: "3D virtual laboratoriya",
  hint: "Sxemani uch o'lchamda ko'rish — tayyorlanmoqda",
  long: "Yig'ilgan sxemani uch o'lchamda ko'rish: Arduino, breadboard, sensor va simlar haqiqiy stol ustidagidek turadi. Bo'lim tayyorlanmoqda.",
  badge: "Tez orada",
  icon: "view_in_ar",
  accent: "var(--fun-purple)",
  accentText: "var(--on-fun-purple)",
  accentSoft: "var(--fun-purple-soft)",
} as const;
