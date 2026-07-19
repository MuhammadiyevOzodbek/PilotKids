// PilotKids statik kontenti.
//
// Bu yerda FAQAT ikki xil ma'lumot qoladi:
//  1. Landing sahifa marketing matnlari (jamoa, sharhlar, hamkorlar) — ular
//     ma'lumotlar bazasiga tegishli emas.
//  2. Kurs/kategoriya/nishon kabi kontentning SEED manbasi (src/lib/db/seed.ts).
//
// Foydalanuvchi progressi, XP, nishon va sertifikatlar bu yerdan OLINMAYDI —
// ularning hammasi real DB'dan keladi (src/lib/queries.ts).

export interface Iconized {
  icon: string;
  color: string;
  soft: string;
}

export const howSteps = [
  {
    n: "01",
    icon: "app_registration",
    color: "#2F6BF3",
    soft: "var(--primary-soft)",
    title: "Ro'yxatdan o'ting",
    body: "Yosh va qiziqishni tanlang — biz mos yo'lni tavsiya qilamiz.",
  },
  {
    n: "02",
    icon: "menu_book",
    color: "#8B5CF6",
    soft: "rgba(139,92,246,.12)",
    title: "Darsni boshlang",
    body: "Qisqa video va interaktiv topshiriqlar bilan qadam-baqadam o'rganing.",
  },
  {
    n: "03",
    icon: "build_circle",
    color: "#EA9A0E",
    soft: "rgba(234,154,14,.13)",
    title: "Loyiha quring",
    body: "Haqiqiy robot yoki dastur yasab, bilimni amalda sinang.",
  },
  {
    n: "04",
    icon: "workspace_premium",
    color: "#0FA46E",
    soft: "var(--success-soft)",
    title: "Sertifikat oling",
    body: "Yo'lni tugatib, ulashiladigan sertifikat va nishonlar yig'ing.",
  },
];

export const partners = [
  { icon: "school", name: "EduLab" },
  { icon: "rocket_launch", name: "STEMhub" },
  { icon: "science", name: "TexnoMaktab" },
  { icon: "robot_2", name: "RoboClub" },
  { icon: "psychology", name: "CodeAcademy" },
];

export const footerCols = [
  { title: "Mahsulot", links: ["Kurslar", "Laboratoriya", "Sertifikatlar", "AI Tutor", "Narxlar"] },
  { title: "Ota-onalar", links: ["Ota-ona paneli", "Xavfsizlik", "Ekran vaqti", "Ko'p bola"] },
  { title: "Kompaniya", links: ["Biz haqimizda", "Jamoa", "Karyera", "Bog'lanish"] },
];

export const team = [
  {
    name: "Sardor Aliyev",
    role: "Asoschi va CEO",
    bio: "Robototexnika muhandisi, 10+ yil STEM ta'limida.",
    init: "SA",
    color: "#2F6BF3",
  },
  {
    name: "Kamola Yusupova",
    role: "Ta'lim rahbari",
    bio: "Pedagog, bolalar uchun o'quv dasturi muallifi.",
    init: "KY",
    color: "#8B5CF6",
  },
  {
    name: "Bekzod Rahimov",
    role: "Bosh muhandis",
    bio: "Arduino va IoT bo'yicha ekspert, kit dizayneri.",
    init: "BR",
    color: "#0FA46E",
  },
  {
    name: "Nilufar Karimova",
    role: "Mahsulot dizayneri",
    bio: "Bolalarga mos, xavfsiz interfeys ustida ishlaydi.",
    init: "NK",
    color: "#EA9A0E",
  },
];

export const testimonials = [
  {
    text: "O'g'lim endi kompyuterda faqat o'yin emas, robot yasayapti. Ota-ona paneli menga tinchlik beradi.",
    name: "Dilnoza R.",
    role: "Ota-ona · 11 yoshli bola",
    init: "DR",
    color: "#2F6BF3",
  },
  {
    text: "Scratch'dan Python'ga o'tish juda tabiiy bo'ldi. Darslar qiziqarli va tushunarli.",
    name: "Aziz M.",
    role: "O'quvchi · 14 yosh",
    init: "AM",
    color: "#8B5CF6",
  },
  {
    text: "Maktabda STEM to'garagiga PilotKids'ni qo'shdik. Bolalarning ishtiyoqi oshdi.",
    name: "Nigora T.",
    role: "O'qituvchi",
    init: "NT",
    color: "#0FA46E",
  },
];

export const valueCards = [
  {
    icon: "precision_manufacturing",
    color: "#6366F1",
    soft: "rgba(99,102,241,.12)",
    title: "Haqiqiy robotlar quring",
    body: "Motor, sensor va platalar bilan ishlab, o'z robotingizni bosqichma-bosqich yig'ing.",
  },
  {
    icon: "code",
    color: "#0FA46E",
    soft: "rgba(15,164,110,.12)",
    title: "Bloklardan Python'gacha",
    body: "Scratch bloklaridan boshlab, asta-sekin haqiqiy kod yozishga o'ting.",
  },
  {
    icon: "auto_awesome",
    color: "#EA9A0E",
    soft: "rgba(234,154,14,.14)",
    title: "STEM'ni qilib o'rganing",
    body: "XP, yulduz va nishonlar bilan har bir qadamda rivojlaning.",
  },
];

export interface Course extends Iconized {
  title: string;
  level: string;
  lessons: number;
  hours: string;
  pct: string;
}

export const featured: Course[] = [
  {
    icon: "smart_toy",
    color: "#6366F1",
    soft: "rgba(99,102,241,.12)",
    title: "Robototexnika 101",
    level: "BOSHLANG'ICH",
    lessons: 12,
    hours: "3 soat",
    pct: "0%",
  },
  {
    icon: "sports_esports",
    color: "#F97316",
    soft: "rgba(249,115,22,.12)",
    title: "Scratch o'yin yaratish",
    level: "BOSHLANG'ICH",
    lessons: 9,
    hours: "2.5 soat",
    pct: "0%",
  },
  {
    icon: "memory",
    color: "#0EA5E9",
    soft: "rgba(14,165,233,.12)",
    title: "Micro:bit asoslari",
    level: "O'RTA",
    lessons: 10,
    hours: "3 soat",
    pct: "0%",
  },
  {
    icon: "terminal",
    color: "#0FA46E",
    soft: "rgba(15,164,110,.12)",
    title: "Python boshlang'ich",
    level: "O'RTA",
    lessons: 14,
    hours: "4 soat",
    pct: "0%",
  },
];

export const categories = [
  {
    icon: "smart_toy",
    color: "#6366F1",
    soft: "rgba(99,102,241,.12)",
    title: "Robototexnika",
    count: "24 kurs",
  },
  {
    icon: "developer_board",
    color: "#0EA5A5",
    soft: "rgba(14,165,165,.12)",
    title: "Arduino",
    count: "18 kurs",
  },
  {
    icon: "extension",
    color: "#EAB308",
    soft: "rgba(234,179,8,.14)",
    title: "LEGO Robotics",
    count: "12 kurs",
  },
  {
    icon: "dashboard",
    color: "#EC4899",
    soft: "rgba(236,72,153,.12)",
    title: "Micro:bit",
    count: "9 kurs",
  },
  {
    icon: "memory",
    color: "#8B5CF6",
    soft: "rgba(139,92,246,.12)",
    title: "ESP32",
    count: "7 kurs",
  },
  {
    icon: "sports_esports",
    color: "#F97316",
    soft: "rgba(249,115,22,.12)",
    title: "Scratch",
    count: "15 kurs",
  },
  {
    icon: "code",
    color: "#0EA5E9",
    soft: "rgba(14,165,233,.12)",
    title: "Python",
    count: "11 kurs",
  },
  {
    icon: "auto_awesome",
    color: "#0FA46E",
    soft: "rgba(15,164,110,.12)",
    title: "STEM loyihalar",
    count: "20 kurs",
  },
];

export type LessonState = "done" | "current" | "locked";
export const detailLessons: { n: number; t: string; meta: string; state: LessonState }[] = [
  { n: 1, t: "Robot to'plamingiz bilan tanishing", meta: "6 daq · Video", state: "done" },
  { n: 2, t: "Motorlarni ulash", meta: "8 daq · Video", state: "current" },
  { n: 3, t: "Sensorlarni sozlash", meta: "10 daq · Video", state: "locked" },
  { n: 4, t: "Birinchi harakat kodi", meta: "12 daq · Kod", state: "locked" },
  { n: 5, t: "To'siqdan qochish mantig'i", meta: "14 daq · Kod", state: "locked" },
  { n: 6, t: "Loyihani sinash va tugatish", meta: "Quiz · Lab", state: "locked" },
];

export const quizOptions = [
  { l: "Ultratovush sensori" },
  { l: "LED chiroq" },
  { l: "Rezistor" },
  { l: "Batareya bloki" },
];
export const quizCorrect = 0;

export const labProjects = [
  {
    icon: "smart_toy",
    color: "#6366F1",
    soft: "rgba(99,102,241,.12)",
    title: "To'siqdan qochuvchi bot",
    desc: "Sensor bilan yo'lni sezib buriladigan robot.",
    diff: "Qiyin",
    diffCol: "#E5484D",
    diffBg: "rgba(229,72,77,.12)",
    parts: "Arduino · 2 motor · HC-SR04",
  },
  {
    icon: "lightbulb",
    color: "#EAB308",
    soft: "rgba(234,179,8,.14)",
    title: "Aqlli tungi chiroq",
    desc: "Qorong'uda avtomat yonadigan LED tizim.",
    diff: "O'rta",
    diffCol: "#EA9A0E",
    diffBg: "rgba(234,154,14,.13)",
    parts: "LDR · LED · Rezistor",
  },
  {
    icon: "traffic",
    color: "#0FA46E",
    soft: "rgba(15,164,110,.12)",
    title: "LED svetofor",
    desc: "Vaqt asosida ishlaydigan 3-rangli svetofor.",
    diff: "Oson",
    diffCol: "#0FA46E",
    diffBg: "var(--success-soft)",
    parts: "3 LED · Rezistor",
  },
  {
    icon: "precision_manufacturing",
    color: "#EC4899",
    soft: "rgba(236,72,153,.12)",
    title: "Robot qo'l",
    desc: "Servo motorlar bilan boshqariladigan qo'l.",
    diff: "Qiyin",
    diffCol: "#E5484D",
    diffBg: "rgba(229,72,77,.12)",
    parts: "3 servo · Joystick",
  },
  {
    icon: "device_thermostat",
    color: "#0EA5E9",
    soft: "rgba(14,165,233,.12)",
    title: "Harorat monitori",
    desc: "Haroratni o'lchab ekranga chiqaradi.",
    diff: "O'rta",
    diffCol: "#EA9A0E",
    diffBg: "rgba(234,154,14,.13)",
    parts: "DHT11 · OLED",
  },
  {
    icon: "music_note",
    color: "#8B5CF6",
    soft: "rgba(139,92,246,.12)",
    title: "Musiqa qutisi",
    desc: "Tugma bosilganda ohang chaladi.",
    diff: "Oson",
    diffCol: "#0FA46E",
    diffBg: "var(--success-soft)",
    parts: "Buzzer · Tugmalar",
  },
];

export const badges = [
  {
    icon: "bolt",
    color: "#2F6BF3",
    soft: "var(--primary-soft)",
    name: "Birinchi qadam",
    earned: true,
  },
  {
    icon: "psychology",
    color: "#8B5CF6",
    soft: "rgba(139,92,246,.12)",
    name: "Quiz Master",
    earned: true,
  },
  {
    icon: "local_fire_department",
    color: "#EA6A0E",
    soft: "rgba(234,106,14,.13)",
    name: "7 kun streak",
    earned: true,
  },
  {
    icon: "smart_toy",
    color: "#6366F1",
    soft: "rgba(99,102,241,.12)",
    name: "Robot quruvchi",
    earned: true,
  },
  { icon: "code", color: "#0FA46E", soft: "var(--success-soft)", name: "Kod ustasi", earned: true },
  {
    icon: "rocket_launch",
    color: "#EC4899",
    soft: "rgba(236,72,153,.12)",
    name: "STEM yulduzi",
    earned: false,
  },
  {
    icon: "diamond",
    color: "#0EA5E9",
    soft: "rgba(14,165,233,.12)",
    name: "100 dars",
    earned: false,
  },
  {
    icon: "emoji_events",
    color: "#EAB308",
    soft: "rgba(234,179,8,.14)",
    name: "Chempion",
    earned: false,
  },
];

export const quickChips = [
  "Simlarni tekshir",
  "Kodni ko'rsat",
  "Keyingi qadam",
  "Xatoni tushuntir",
];

export type CertState = "done" | "progress" | "locked";
export const certs: {
  title: string;
  date: string;
  state: CertState;
  color: string;
  soft: string;
}[] = [
  {
    title: "Robototexnika 101",
    date: "12 Mart 2026",
    state: "done",
    color: "#6366F1",
    soft: "rgba(99,102,241,.12)",
  },
  {
    title: "Scratch o'yin ustasi",
    date: "28 Fevral 2026",
    state: "done",
    color: "#F97316",
    soft: "rgba(249,115,22,.12)",
  },
  {
    title: "Arduino quruvchisi",
    date: "68% tugallandi",
    state: "progress",
    color: "#0EA5A5",
    soft: "rgba(14,165,165,.12)",
  },
  {
    title: "Python asoslari",
    date: "Qulflangan",
    state: "locked",
    color: "#0EA5E9",
    soft: "rgba(14,165,233,.12)",
  },
];

export const navItems = [
  { icon: "grid_view", label: "Bosh sahifa", href: "/dashboard" },
  { icon: "menu_book", label: "Kurslar", href: "/courses" },
  { icon: "science", label: "Laboratoriya", href: "/lab" },
  { icon: "leaderboard", label: "Reyting", href: "/leaderboard" },
  { icon: "forum", label: "AI Tutor", href: "/tutor" },
  { icon: "workspace_premium", label: "Sertifikatlar", href: "/certificates" },
  { icon: "person", label: "Profil", href: "/profile" },
];
