import { randomUUID } from "node:crypto";
import { config } from "dotenv";

// .env.local'ni db import qilinishidan OLDIN yuklaymiz
config({ path: ".env.local" });

async function main() {
  // Dinamik import — env yuklangandan keyin ulanish quriladi
  const {
    db,
    ranks,
    categories,
    courses,
    users,
    accounts,
    subscriptions,
    enrollments,
    notifications,
    lessons,
    lessonCompletions,
    quizQuestions,
  } = await import("./index");
  const { eq } = await import("drizzle-orm");

  console.log("🌱 Seed boshlandi...");

  /* ── Darajalar (5 daraja) ── */
  const existingRanks = await db.select({ id: ranks.id }).from(ranks).limit(1);
  if (existingRanks.length === 0) {
    await db.insert(ranks).values([
      { name: "Yangi boshlovchi", minXp: 0, badge: "🥉", order: 1 },
      { name: "Yosh muhandis", minXp: 500, badge: "🥈", order: 2 },
      { name: "Robototexnik", minXp: 1500, badge: "🥇", order: 3 },
      { name: "Mutaxassis", minXp: 3500, badge: "💎", order: 4 },
      { name: "Ustoz muhandis", minXp: 7000, badge: "👑", order: 5 },
    ]);
    console.log("  ✓ 5 daraja qo'shildi");
  } else {
    console.log("  • Darajalar mavjud, o'tkazib yuborildi");
  }

  /* ── Kategoriyalar ── */
  const categoryData = [
    { name: "Robototexnika asoslari", slug: "robototexnika-asoslari" },
    { name: "Arduino", slug: "arduino" },
    { name: "Dasturlash", slug: "dasturlash" },
    { name: "Sun'iy intellekt", slug: "suniy-intellekt" },
    { name: "3D modellashtirish", slug: "3d-modellashtirish" },
  ];
  await db.insert(categories).values(categoryData).onConflictDoNothing({ target: categories.slug });
  console.log("  ✓ Kategoriyalar qo'shildi");

  const allCategories = await db.select().from(categories);
  const catBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));

  /* ── Namuna kurslar ── */
  const courseData = [
    {
      title: "Robototexnikaga kirish",
      slug: "robototexnikaga-kirish",
      description:
        "Robototexnika dunyosiga birinchi qadam: asosiy tushunchalar, komponentlar va oddiy loyihalar.",
      categorySlug: "robototexnika-asoslari",
      difficulty: "beginner" as const,
      durationHours: 12,
      totalLessons: 24,
      isPremium: false,
    },
    {
      title: "Arduino bilan birinchi qadamlar",
      slug: "arduino-birinchi-qadamlar",
      description: "Arduino platasi, sxemalar va birinchi dasturlaringizni yozib o'rganing.",
      categorySlug: "arduino",
      difficulty: "beginner" as const,
      durationHours: 16,
      totalLessons: 30,
      isPremium: false,
    },
    {
      title: "Scratch'da o'yin yaratish",
      slug: "scratch-oyin-yaratish",
      description: "Vizual dasturlash orqali o'z o'yinlaringizni yarating va mantiqni o'rganing.",
      categorySlug: "dasturlash",
      difficulty: "beginner" as const,
      durationHours: 10,
      totalLessons: 20,
      isPremium: false,
    },
    {
      title: "Sensorlar va aktuatorlar",
      slug: "sensorlar-aktuatorlar",
      description: "Harakat, masofa va yorug'lik sensorlari bilan aqlli qurilmalar quring.",
      categorySlug: "arduino",
      difficulty: "intermediate" as const,
      durationHours: 20,
      totalLessons: 36,
      isPremium: true,
    },
    {
      title: "Python bilan robotlarni boshqarish",
      slug: "python-robot-boshqarish",
      description: "Python tilida robotlarni dasturlash va avtomatlashtirishni o'rganing.",
      categorySlug: "dasturlash",
      difficulty: "intermediate" as const,
      durationHours: 24,
      totalLessons: 40,
      isPremium: true,
    },
    {
      title: "Sun'iy intellekt asoslari",
      slug: "suniy-intellekt-asoslari",
      description:
        "Mashinali o'qitish va AI tushunchalarini amaliy loyihalar orqali o'zlashtiring.",
      categorySlug: "suniy-intellekt",
      difficulty: "advanced" as const,
      durationHours: 30,
      totalLessons: 48,
      isPremium: true,
    },
    {
      title: "3D bosma va prototiplash",
      slug: "3d-bosma-prototiplash",
      description: "O'z detallaringizni 3D modellashtiring va bosma qilib chiqaring.",
      categorySlug: "3d-modellashtirish",
      difficulty: "intermediate" as const,
      durationHours: 14,
      totalLessons: 26,
      isPremium: false,
    },
  ];

  await db
    .insert(courses)
    .values(
      courseData.map((c) => ({
        title: c.title,
        slug: c.slug,
        description: c.description,
        categoryId: catBySlug.get(c.categorySlug) ?? null,
        difficulty: c.difficulty,
        durationHours: c.durationHours,
        totalLessons: c.totalLessons,
        isPremium: c.isPremium,
      })),
    )
    .onConflictDoNothing({ target: courses.slug });
  console.log(`  ✓ ${courseData.length} kurs qo'shildi`);

  /* ── Darslar (har bir kurs uchun) ── */
  const lessonsBySlug: Record<string, { title: string; content: string; minutes: number }[]> = {
    "robototexnikaga-kirish": [
      {
        title: "Robototexnika nima?",
        content:
          "Robototexnika — robotlarni loyihalash, qurish va dasturlash haqidagi fan. Bu darsda robotlar qayerda ishlatilishini va nima uchun muhimligini o'rganamiz.",
        minutes: 15,
      },
      {
        title: "Robot qismlari",
        content:
          "Har bir robot uchta asosiy qismdan iborat: sensorlar (atrofni sezish), boshqaruvchi (miya) va aktuatorlar (harakat). Ularning vazifalarini ko'rib chiqamiz.",
        minutes: 20,
      },
      {
        title: "Birinchi robotni tasavvur qilish",
        content:
          "O'z robotingiz qanday vazifani bajarishini o'ylang. Chizma chizib, unga qanday qismlar kerakligini belgilang.",
        minutes: 25,
      },
      {
        title: "Xavfsizlik qoidalari",
        content:
          "Elektronika bilan ishlashda xavfsizlik birinchi o'rinda. Batareyalar, simlar va asboblar bilan to'g'ri muomala qilishni o'rganamiz.",
        minutes: 15,
      },
      {
        title: "Yakuniy loyiha: g'oya",
        content:
          "Kursni yakunlash uchun oddiy robot g'oyasini taqdim eting. Keyingi kurslarda uni amalga oshirasiz!",
        minutes: 30,
      },
    ],
    "arduino-birinchi-qadamlar": [
      {
        title: "Arduino platasi bilan tanishuv",
        content:
          "Arduino UNO platasi, uning pinlari va USB orqali ulanishini o'rganamiz. Arduino IDE dasturini o'rnatamiz.",
        minutes: 20,
      },
      {
        title: "Birinchi dastur: LED yoqish",
        content:
          "Blink dasturi — Arduino'ning 'Salom dunyo'si. Kod yozib, LED'ni yoqib-o'chirishni o'rganamiz.",
        minutes: 25,
      },
      {
        title: "O'zgaruvchilar va funksiyalar",
        content:
          "digitalWrite, delay va pinMode funksiyalari. Kodni qanday tuzilishini tushunamiz.",
        minutes: 25,
      },
      {
        title: "Tugma bilan boshqarish",
        content: "Raqamli kirish (input) orqali tugmani o'qish va LED'ni boshqarish loyihasi.",
        minutes: 30,
      },
      {
        title: "Kichik loyiha: svetofor",
        content: "Uchta LED bilan svetofor modelini yasang va dasturlang.",
        minutes: 35,
      },
    ],
    "scratch-oyin-yaratish": [
      {
        title: "Scratch interfeysi",
        content: "Scratch muhiti, sahna, spraytlar va bloklar bilan tanishuv.",
        minutes: 15,
      },
      {
        title: "Harakat va tovush",
        content: "Spraytni harakatlantirish, tovush qo'shish va sahnani o'zgartirish.",
        minutes: 20,
      },
      {
        title: "Sikllar va shartlar",
        content: "Takrorlash (loop) va agar-bo'lsa (if) bloklari bilan mantiq qurish.",
        minutes: 25,
      },
      {
        title: "O'yin yaratish",
        content: "Ochko sanovchi, dushmanlar va g'alaba sharti bo'lgan oddiy o'yin quramiz.",
        minutes: 40,
      },
    ],
    "sensorlar-aktuatorlar": [
      {
        title: "Sensorlar turlari",
        content: "Masofa, harorat, yorug'lik va harakat sensorlari. Har biri qanday ishlaydi?",
        minutes: 25,
      },
      {
        title: "Ultratovush sensori (HC-SR04)",
        content: "Masofani o'lchash va to'siqlarni aniqlash loyihasi.",
        minutes: 30,
      },
      {
        title: "Servo motorni boshqarish",
        content: "Servo motor burchagini dastur orqali boshqarishni o'rganamiz.",
        minutes: 30,
      },
      {
        title: "Aqlli qurilma loyihasi",
        content: "Sensor va aktuatorni birlashtirib, avtomatik to'siqdan qochuvchi tizim quramiz.",
        minutes: 45,
      },
    ],
    "python-robot-boshqarish": [
      {
        title: "Python asoslari",
        content: "O'zgaruvchilar, ma'lumot turlari va oddiy operatsiyalar.",
        minutes: 25,
      },
      {
        title: "Sikllar va funksiyalar",
        content: "for, while sikllari va o'z funksiyalaringizni yozish.",
        minutes: 30,
      },
      {
        title: "Robotga buyruq yuborish",
        content: "Serial port orqali Python'dan Arduino'ga buyruq yuborish.",
        minutes: 35,
      },
      {
        title: "Avtomatlashtirish loyihasi",
        content: "Python skript bilan robotni belgilangan marshrut bo'yicha harakatlantirish.",
        minutes: 45,
      },
    ],
    "suniy-intellekt-asoslari": [
      {
        title: "AI nima va qayerda ishlatiladi?",
        content: "Sun'iy intellekt tushunchasi, kundalik hayotdagi misollar.",
        minutes: 20,
      },
      {
        title: "Mashinali o'qitish g'oyasi",
        content: "Kompyuter misollardan qanday 'o'rganadi'? Ma'lumot va model tushunchasi.",
        minutes: 30,
      },
      {
        title: "Tasvirni tanib olish",
        content: "Oddiy rasm klassifikatsiyasi loyihasi bilan tanishamiz.",
        minutes: 40,
      },
      {
        title: "AI loyihasi: aqlli yordamchi",
        content: "O'z ma'lumotlaringiz bilan kichik bashorat modelini o'rgatamiz.",
        minutes: 50,
      },
    ],
    "3d-bosma-prototiplash": [
      {
        title: "3D modellashtirish asoslari",
        content: "3D fazoda shakllar, koordinatalar va dasturlar bilan tanishuv.",
        minutes: 20,
      },
      {
        title: "Birinchi detalni chizish",
        content: "Oddiy geometrik detalni Tinkercad'da modellashtiramiz.",
        minutes: 30,
      },
      {
        title: "Bosmaga tayyorlash (slicing)",
        content: "Modelni STL formatiga eksport qilish va printerga tayyorlash.",
        minutes: 25,
      },
      {
        title: "Prototip loyihasi",
        content: "O'z robotingiz uchun detal loyihalang va bosmaga tayyorlang.",
        minutes: 40,
      },
    ],
  };

  const seededCourses = await db.select().from(courses);
  const courseBySlugForLessons = new Map(seededCourses.map((c) => [c.slug, c]));

  for (const [slug, items] of Object.entries(lessonsBySlug)) {
    const course = courseBySlugForLessons.get(slug);
    if (!course) continue;
    await db
      .insert(lessons)
      .values(
        items.map((l, i) => ({
          courseId: course.id,
          title: l.title,
          content: l.content,
          order: i + 1,
          durationMinutes: l.minutes,
        })),
      )
      .onConflictDoNothing({ target: [lessons.courseId, lessons.order] });
    // totalLessons'ni real darslar soniga moslashtiramiz
    if (course.totalLessons !== items.length) {
      await db.update(courses).set({ totalLessons: items.length }).where(eq(courses.id, course.id));
    }
  }
  console.log("  ✓ Darslar qo'shildi");

  /* ── Test savollari (dars → savollar) ── */
  // Kalit: kurs slug → { dars tartibi: [savollar] }. Savol variantlari va
  // to'g'ri javob indeksi (correctIndex) server tomonda baholanadi.
  const quizzesBySlug: Record<
    string,
    Record<number, { prompt: string; options: string[]; correctIndex: number }[]>
  > = {
    "robototexnikaga-kirish": {
      1: [
        {
          prompt: "Robototexnika nima bilan shug'ullanadi?",
          options: [
            "Faqat o'yinlar yaratish",
            "Robotlarni loyihalash, qurish va dasturlash",
            "Rasm chizish",
            "Musiqa yozish",
          ],
          correctIndex: 1,
        },
        {
          prompt: "Quyidagilardan qaysi biri robotning vazifasi bo'la oladi?",
          options: [
            "Ovqat pishirish",
            "Yig'ish liniyasida detal ko'tarish",
            "Uxlash",
            "Kitob o'qish",
          ],
          correctIndex: 1,
        },
      ],
      2: [
        {
          prompt: "Robotning 'miyasi' qaysi qism hisoblanadi?",
          options: ["Sensor", "Aktuator", "Boshqaruvchi (kontroller)", "Batareya"],
          correctIndex: 2,
        },
        {
          prompt: "Sensor nima uchun kerak?",
          options: ["Harakat qilish", "Atrofni sezish", "Rang berish", "Tovush chiqarish"],
          correctIndex: 1,
        },
      ],
      4: [
        {
          prompt: "Elektronika bilan ishlashda eng muhim narsa nima?",
          options: ["Tezlik", "Xavfsizlik", "Chiroylilik", "Narx"],
          correctIndex: 1,
        },
      ],
    },
    "arduino-birinchi-qadamlar": {
      2: [
        {
          prompt: "Arduino'da birinchi klassik dastur qaysi?",
          options: ["Hello World matni", "Blink (LED yoqish)", "O'yin", "Kalkulyator"],
          correctIndex: 1,
        },
        {
          prompt: "LED'ni yoqish uchun qaysi funksiya ishlatiladi?",
          options: ["readLED()", "digitalWrite()", "print()", "delay()"],
          correctIndex: 1,
        },
      ],
      3: [
        {
          prompt: "delay(1000) buyrug'i nima qiladi?",
          options: [
            "1000 marta takrorlaydi",
            "1 soniya kutadi",
            "LED'ni o'chiradi",
            "Pinni sozlaydi",
          ],
          correctIndex: 1,
        },
      ],
    },
    "scratch-oyin-yaratish": {
      3: [
        {
          prompt: "Takrorlash uchun qaysi blok ishlatiladi?",
          options: ["agar-bo'lsa (if)", "takrorlash (loop)", "harakat", "tovush"],
          correctIndex: 1,
        },
      ],
    },
  };

  const lessonsByCourseId = new Map<string, Map<number, string>>();
  for (const course of seededCourses) {
    const courseLessonRows = await db
      .select({ id: lessons.id, order: lessons.order })
      .from(lessons)
      .where(eq(lessons.courseId, course.id));
    lessonsByCourseId.set(course.id, new Map(courseLessonRows.map((l) => [l.order, l.id])));
  }

  for (const [slug, byOrder] of Object.entries(quizzesBySlug)) {
    const course = courseBySlugForLessons.get(slug);
    if (!course) continue;
    const orderToLessonId = lessonsByCourseId.get(course.id);
    if (!orderToLessonId) continue;

    for (const [lessonOrder, questions] of Object.entries(byOrder)) {
      const lessonId = orderToLessonId.get(Number(lessonOrder));
      if (!lessonId) continue;
      await db
        .insert(quizQuestions)
        .values(
          questions.map((q, i) => ({
            lessonId,
            prompt: q.prompt,
            options: q.options,
            correctIndex: q.correctIndex,
            order: i + 1,
          })),
        )
        .onConflictDoNothing({ target: [quizQuestions.lessonId, quizQuestions.order] });
    }
  }
  console.log("  ✓ Test savollari qo'shildi");

  /* ── Demo foydalanuvchi (Better Auth mos parol hash) ── */
  const demoEmail = "demo@pilotkids.uz";
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1);

  if (existingUser.length === 0) {
    const { auth } = await import("../auth");
    const ctx = await auth.$context;
    const passwordHash = await ctx.password.hash("demo1234");

    const firstRank = await db.select().from(ranks).orderBy(ranks.order).limit(1);
    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      name: "Demo O'quvchi",
      email: demoEmail,
      emailVerified: true,
      xp: 350,
      age: 12,
      rankId: firstRank[0]?.id ?? null,
    });
    await db.insert(accounts).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
    await db.insert(subscriptions).values({ userId, plan: "free", status: "active" });
    console.log("  ✓ Demo user yaratildi (demo@pilotkids.uz / demo1234)");
  } else {
    console.log("  • Demo user mavjud, o'tkazib yuborildi");
  }

  /* ── Demo enrollment va bildirishnomalar (idempotent) ── */
  const demo = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1);
  const demoId = demo[0]?.id;

  if (demoId) {
    const allCourses = await db.select().from(courses);
    const courseBySlug = new Map(allCourses.map((c) => [c.slug, c]));
    // Har bir kursda nechta dars tugatilganini belgilaymiz — progress shundan hisoblanadi
    const enrollPlan: { slug: string; completedLessons: number | "all" }[] = [
      { slug: "robototexnikaga-kirish", completedLessons: "all" },
      { slug: "arduino-birinchi-qadamlar", completedLessons: 3 },
      { slug: "scratch-oyin-yaratish", completedLessons: 1 },
    ];
    for (const e of enrollPlan) {
      const course = courseBySlug.get(e.slug);
      if (!course) continue;

      const courseLessons = await db
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.courseId, course.id))
        .orderBy(lessons.order);
      const total = courseLessons.length;
      const doneCount = e.completedLessons === "all" ? total : Math.min(e.completedLessons, total);
      const done = total > 0 && doneCount >= total;
      const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

      await db
        .insert(enrollments)
        .values({
          userId: demoId,
          courseId: course.id,
          progressPercent: progress,
          completedAt: done ? new Date() : null,
        })
        .onConflictDoNothing({
          target: [enrollments.userId, enrollments.courseId],
        });

      // Tugatilgan darslarni belgilaymiz (idempotent)
      const toComplete = courseLessons.slice(0, doneCount);
      if (toComplete.length > 0) {
        await db
          .insert(lessonCompletions)
          .values(toComplete.map((l) => ({ userId: demoId, lessonId: l.id })))
          .onConflictDoNothing({ target: [lessonCompletions.userId, lessonCompletions.lessonId] });
      }
    }

    const existingNotifs = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.userId, demoId))
      .limit(1);
    if (existingNotifs.length === 0) {
      await db.insert(notifications).values([
        {
          userId: demoId,
          message: "PilotKids'ga xush kelibsiz! Birinchi darsingizni boshlang.",
          read: false,
        },
        {
          userId: demoId,
          message: '"Robototexnikaga kirish" kursini muvaffaqiyatli yakunladingiz! 🎉',
          read: false,
        },
        {
          userId: demoId,
          message: "Siz 350 XP to'pladingiz. Keyingi darajagacha oz qoldi!",
          read: true,
        },
      ]);
    }
    console.log("  ✓ Demo enrollment va bildirishnomalar tayyor");
  }

  console.log("✅ Seed tugadi.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed xatosi:", err);
  process.exit(1);
});
