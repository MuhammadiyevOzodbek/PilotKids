import {
  Award,
  BrainCircuit,
  Clock,
  Cpu,
  Crown,
  Footprints,
  Gem,
  type LucideIcon,
  Medal,
  Rocket,
  Star,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";

/* ── Statistika ── */
export const STATS = [
  { value: "5 000+", label: "O'quvchi" },
  { value: "50+", label: "Kurs" },
  { value: "98%", label: "Mamnunlik" },
] as const;

/* ── Afzalliklar ── */
export interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}
export const BENEFITS: Benefit[] = [
  {
    icon: Wrench,
    title: "Amaliy Loyihalar",
    description: "Nazariya emas — real robotlar quring va o'z qo'lingiz bilan sinab ko'ring.",
  },
  {
    icon: Users,
    title: "Mentor Qo'llab-quvvatlash",
    description: "Tajribali muhandislar har qadamda yoningizda, savollaringizga javob beradi.",
  },
  {
    icon: Cpu,
    title: "Zamonaviy Dastur",
    description: "Arduino, Python va sun'iy intellekt — bugungi eng dolzarb texnologiyalar.",
  },
  {
    icon: Trophy,
    title: "Yutuq va XP Tizimi",
    description: "O'yin kabi: XP to'plang, darajalar oshiring va medallar yig'ing.",
  },
  {
    icon: Clock,
    title: "Moslashuvchan Jadval",
    description: "Istagan vaqtingizda, o'z sur'atingizda o'rganing — hech qanday shoshilish yo'q.",
  },
  {
    icon: Award,
    title: "Rasmiy Sertifikat",
    description: "Har bir kursni yakunlaganingizda tan olingan sertifikatga ega bo'lasiz.",
  },
];

/* ── Yo'l xaritasi ── */
export interface RoadmapStep {
  step: number;
  title: string;
  description: string;
}
export const ROADMAP: RoadmapStep[] = [
  {
    step: 1,
    title: "Asoslar",
    description: "Robototexnika va elektronika asoslari bilan tanishuv.",
  },
  { step: 2, title: "Arduino", description: "Platalar, sensorlar va aktuatorlar bilan ishlash." },
  {
    step: 3,
    title: "Dasturlash",
    description: "Scratch'dan Python'gacha — robotlarni boshqarish.",
  },
  { step: 4, title: "Loyihalar", description: "Mustaqil ravishda o'z robotingizni loyihalash." },
  {
    step: 5,
    title: "Sun'iy Intellekt",
    description: "AI va mashinali o'qitish asoslarini o'zlashtirish.",
  },
  {
    step: 6,
    title: "Mutaxassislik",
    description: "Murakkab tizimlar va musobaqalarga tayyorgarlik.",
  },
];

/* ── Mashhur kurslar (namuna — keyin DB'dan) ── */
export interface FeaturedCourse {
  title: string;
  category: string;
  level: string;
  lessons: number;
  hours: number;
  premium: boolean;
}
export const FEATURED_COURSES: FeaturedCourse[] = [
  {
    title: "Robototexnikaga kirish",
    category: "Asoslar",
    level: "Boshlang'ich",
    lessons: 24,
    hours: 12,
    premium: false,
  },
  {
    title: "Arduino bilan birinchi qadamlar",
    category: "Arduino",
    level: "Boshlang'ich",
    lessons: 30,
    hours: 16,
    premium: false,
  },
  {
    title: "Python bilan robotlarni boshqarish",
    category: "Dasturlash",
    level: "O'rta",
    lessons: 40,
    hours: 24,
    premium: true,
  },
  {
    title: "Sun'iy intellekt asoslari",
    category: "AI",
    level: "Yuqori",
    lessons: 48,
    hours: 30,
    premium: true,
  },
];

/* ── Narx rejalari ── */
export interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
}
export const PLANS: Plan[] = [
  {
    name: "Bepul",
    price: "0",
    period: "so'm",
    description: "Boshlash uchun ajoyib imkoniyat",
    features: [
      "Asosiy kurslarga kirish",
      "Jamiyat forumi",
      "Cheklangan amaliy loyihalar",
      "XP va daraja tizimi",
    ],
    cta: "Bepul boshlash",
    featured: false,
  },
  {
    name: "Premium",
    price: "99 000",
    period: "so'm / oy",
    description: "To'liq imkoniyatlar va mentor",
    features: [
      "Barcha kurslarga to'liq kirish",
      "Shaxsiy mentor qo'llab-quvvatlashi",
      "Cheksiz amaliy loyihalar",
      "Rasmiy sertifikat",
      "Premium loyihalar va musobaqalar",
    ],
    cta: "Premium olish",
    featured: true,
  },
];

/* ── Yutuqlar (medallar) ── */
export interface Achievement {
  icon: LucideIcon;
  /** Ikonka rangi (Tailwind text sinfi) */
  color: string;
  /** Yumshoq fon halosi (Tailwind bg sinfi) */
  glow: string;
  title: string;
  description: string;
}
export const ACHIEVEMENTS: Achievement[] = [
  {
    icon: Footprints,
    color: "text-amber-600",
    glow: "bg-amber-600/15",
    title: "Ilk Qadam",
    description: "Birinchi darsni yakunlang",
  },
  {
    icon: Medal,
    color: "text-slate-300",
    glow: "bg-slate-300/15",
    title: "O'nlik",
    description: "10 ta dars tugatildi",
  },
  {
    icon: Star,
    color: "text-yellow-400",
    glow: "bg-yellow-400/15",
    title: "Yuzta Yulduz",
    description: "100 XP to'plandi",
  },
  {
    icon: Gem,
    color: "text-cyan-400",
    glow: "bg-cyan-400/15",
    title: "AI Ustasi",
    description: "AI kursini bitirdingiz",
  },
  {
    icon: Crown,
    color: "text-amber-400",
    glow: "bg-amber-400/15",
    title: "Chempion",
    description: "Musobaqada g'olib bo'ldingiz",
  },
];

/* ── Fikrlar ── */
export interface Testimonial {
  name: string;
  role: string;
  text: string;
  icon: LucideIcon;
}
export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Aziza Karimova",
    role: "Ota-ona",
    text: "O'g'lim endi bo'sh vaqtida robot yasaydi, telefon o'ynamaydi! PilotKids uning hayotini o'zgartirdi.",
    icon: Users,
  },
  {
    name: "Jasur, 14 yosh",
    role: "O'quvchi",
    text: "Arduino kursidan keyin o'zimning birinchi robotimni yasadim. Mentorlar hamma narsani tushuntirib berishdi.",
    icon: Rocket,
  },
  {
    name: "Nodira Yusupova",
    role: "Ota-ona",
    text: "Mentorlar juda sabrli va bilimli. Qizim har bir darsni intiqlik bilan kutadi.",
    icon: BrainCircuit,
  },
];

/* ── Ko'p so'raladigan savollar ── */
export interface Faq {
  question: string;
  answer: string;
}
export const FAQS: Faq[] = [
  {
    question: "Necha yoshdan boshlash mumkin?",
    answer:
      "Platformamiz 8 yoshdan 18 yoshgacha bo'lgan bolalar uchun mo'ljallangan. Har bir yosh guruhiga mos kurslar mavjud.",
  },
  {
    question: "Oldindan bilim kerakmi?",
    answer:
      "Yo'q, hech qanday oldingi bilim talab qilinmaydi. Biz eng asosiy tushunchalardan, noldan boshlaymiz.",
  },
  {
    question: "Qanday jihoz kerak bo'ladi?",
    answer:
      "Boshlash uchun kompyuter va internet yetarli. Amaliy loyihalar uchun robototexnika to'plamlari (kit) alohida taklif etiladi.",
  },
  {
    question: "Kurs oxirida sertifikat beriladimi?",
    answer:
      "Ha, har bir kursni muvaffaqiyatli yakunlaganingizda rasmiy tan olingan sertifikat olasiz.",
  },
  {
    question: "To'lovni qanday amalga oshiraman?",
    answer:
      "Tez orada Payme va Click orqali qulay to'lov imkoniyatlari qo'shiladi. Hozircha bepul reja bilan boshlashingiz mumkin.",
  },
];
