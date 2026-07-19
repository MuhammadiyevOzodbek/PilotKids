/**
 * PilotKids — real o'quv kontenti seed'i (darslar matni + quiz savollari).
 *
 * `seed.ts` skeletni (kategoriya/kurs/nishon/lab) yaratadi, bu skript esa
 * har bir kursni to'liq darslar to'plami va quiz savollari bilan to'ldiradi.
 *
 * IDEMPOTENT:
 *  - `lesson` — (course_id, sort_order) unique kaliti bo'yicha onConflictDoUpdate.
 *    Ya'ni mavjud darslarning `id` va `sort_order` o'zgarmaydi, faqat matni
 *    yangilanadi — foydalanuvchi progressi (lesson_progress) buzilmaydi.
 *  - `quiz_question` — unique kalit yo'q, shuning uchun avval shu kursning
 *    savollari o'chiriladi, keyin qaytadan yoziladi.
 *
 * Ishga tushirish:
 *   npx tsx --env-file=.env.local src/lib/db/seed-content.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

/* ─────────────────────────── Tiplar ─────────────────────────── */

type LessonType = "video" | "code" | "quiz" | "lab";

type LessonSeed = {
  /** Dars tartib raqami — mavjud darslarda o'zgarmasligi shart. */
  n: number;
  title: string;
  type: LessonType;
  durationMin: number;
  xpReward: number;
  content: string;
  /** Meta matni; berilmasa "N daq · Turi" ko'rinishida hosil qilinadi. */
  meta?: string;
};

type QuizSeed = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

type CourseSeed = {
  slug: string;
  lessons: LessonSeed[];
  quiz: QuizSeed[];
};

const TYPE_LABEL: Record<LessonType, string> = {
  video: "Video",
  code: "Kod",
  quiz: "Quiz",
  lab: "Lab",
};

/* ═════════════════════════ 1) Robototexnika 101 — 12 dars ═════════════════════════ */

const robototexnika: CourseSeed = {
  slug: "robototexnika-101",
  lessons: [
    {
      n: 1,
      title: "Robot to'plamingiz bilan tanishing",
      type: "video",
      durationMin: 6,
      xpReward: 30,
      content: `Salom, kelajakdagi muhandis! Bugun quticha ichidagi sirlar bilan tanishamiz.

To'plamda odatda shular bo'ladi:
• Boshqaruv platasi (Arduino Uno) — robotning "miyasi".
• Breadboard — sim lehimlamasdan ulash uchun taxtacha.
• Motorlar va g'ildiraklar — robotning "oyoqlari".
• Sensorlar — robotning "ko'zi" va "qulog'i".
• Simlar, rezistorlar, LED chiroqchalar.

Hamma detalni stol ustiga yoyib chiqing va ro'yxat bo'yicha tekshiring. Agar biror qism yetishmasa, darsni davom ettiraverasiz — keyinroq qo'shsangiz ham bo'ladi.

⚠️ Xavfsizlik: platani ulashdan oldin qo'lingiz quruq bo'lsin. Batareyani teskari ulamang — bu platani kuydiradi. Kattalar yoningizda bo'lgani yaxshi.

Keyingi darsda motorlarni ulaymiz va robot qimirlay boshlaydi!`,
    },
    {
      n: 2,
      title: "Motorlarni ulash",
      type: "video",
      durationMin: 8,
      xpReward: 35,
      content: `Motor — bu elektr energiyasini harakatga aylantiradigan qism. Lekin Arduino platasi motorni to'g'ridan-to'g'ri aylantira olmaydi: uning quvvati yetmaydi. Shuning uchun oradan motor drayveri (masalan L298N) ishlatiladi.

Ulash tartibi:
1. Motorning ikkita simini drayverning OUT1 va OUT2 chiqishiga ulang.
2. Drayverning IN1, IN2 kirishlarini Arduino'ning 8 va 9-pinlariga ulang.
3. Batareyaning "+" simini drayver VCC'siga, "−" simini GND'ga ulang.
4. Arduino GND'si bilan drayver GND'sini ham birlashtiring — bu juda muhim!

Agar motor teskari aylansa, xavotir olmang: shunchaki ikkita motor simini o'rnini almashtiring.

⚠️ Motorni qo'lda ushlab turib aylantirmang va sochingiz g'ildirakka tegmasin.`,
    },
    {
      n: 3,
      title: "Sensorlarni sozlash",
      type: "video",
      durationMin: 10,
      xpReward: 35,
      content: `Sensor — robotning sezgi a'zosi. U atrofdagi dunyoni o'lchab, raqamga aylantirib beradi.

Eng ko'p ishlatiladigan uchtasi:
• Ultratovush sensori (HC-SR04) — ovoz to'lqinini yuborib, qaytishini kutadi va masofani hisoblaydi. To'siqqa urilmaslik uchun kerak.
• Infraqizil (IR) sensor — yuza qora yoki oq ekanini ajratadi. Chiziq bo'ylab yurish uchun kerak.
• Harorat sensori — havo issiqligini o'lchaydi.

Sensorda odatda 3 yoki 4 ta oyoqcha bo'ladi: VCC (quvvat), GND (yer) va signal chiqishi. VCC ni 5V ga, GND ni GND ga ulang.

Kichik maslahat: sensorni ulaganingizdan keyin darrov Serial Monitor orqali qiymatini tekshiring — shunda ishlayotganiga ishonch hosil qilasiz.`,
    },
    {
      n: 4,
      title: "Birinchi harakat kodi",
      type: "code",
      durationMin: 12,
      xpReward: 45,
      content: `Vaqt keldi — robotni yurgizamiz! Arduino kodi doim ikkita qismdan iborat: setup() bir marta ishlaydi, loop() esa cheksiz takrorlanadi.

    int IN1 = 8;
    int IN2 = 9;

    void setup() {
      pinMode(IN1, OUTPUT);
      pinMode(IN2, OUTPUT);
    }

    void loop() {
      // Oldinga yur
      digitalWrite(IN1, HIGH);
      digitalWrite(IN2, LOW);
      delay(2000);

      // To'xta
      digitalWrite(IN1, LOW);
      digitalWrite(IN2, LOW);
      delay(1000);
    }

Bu kod robotni 2 soniya oldinga yurgizadi, keyin 1 soniya to'xtatadi va yana takrorlaydi. delay() millisekundda o'lchanadi: 1000 = 1 soniya.

Kodni yuklaganingizda robotni stol chetiga qo'ymang — yiqilib tushmasin!`,
    },
    {
      n: 5,
      title: "To'siqdan qochish mantig'i",
      type: "code",
      durationMin: 14,
      xpReward: 50,
      content: `Endi robotimizni aqlliroq qilamiz: u devorga urilishdan oldin o'zi burilsin.

Mantiq juda sodda: "Agar oldinda to'siq yaqin bo'lsa — burilib ket, aks holda oldinga yur." Dasturlashda bu if/else deb ataladi.

    long masofa = olchash();  // sm da

    if (masofa < 20) {
      burilOng();
    } else {
      oldingaYur();
    }

Ya'ni har bir loop() aylanishida robot: (1) masofani o'lchaydi, (2) qaror qabul qiladi, (3) harakat qiladi. Bu uchlik — "sez → o'yla → harakat qil" — barcha robotlarning asosiy qoidasi.

Chegarani (20 sm) o'zingiz o'zgartirib ko'ring: 10 qilsangiz robot jasurroq, 40 qilsangiz qo'rqoqroq bo'ladi. Sinab ko'rish — o'rganishning eng qiziq qismi!`,
    },
    {
      n: 6,
      title: "Loyihani sinash va tugatish",
      type: "quiz",
      durationMin: 8,
      xpReward: 40,
      meta: "Quiz · Lab",
      content: `Tabriklaymiz — birinchi robotingiz tayyor! Endi uni sinovdan o'tkazamiz.

Sinov ro'yxati:
1. Barcha simlar mahkam turibdimi?
2. Batareya quvvati yetarlimi? (motor sekin yursa — batareya bo'shashgan)
3. Robot to'siqni 20 sm dan sezyaptimi?
4. Ikkala g'ildirak bir xil tezlikda aylanyaptimi?

Agar robot bir tomonga og'ib ketsa, motorlarning tezligini kodda biroz farqlantiring — bu normal holat, chunki hech qanday ikkita motor mutlaqo bir xil bo'lmaydi.

Ishlaganidan keyin robotingizni videoga oling va do'stlaringizga ko'rsating. Quyidagi savollarga javob berib, o'zingizni sinab ko'ring va XP yig'ing!`,
    },
    {
      n: 7,
      title: "Chiziq bo'ylab yuruvchi robot",
      type: "code",
      durationMin: 12,
      xpReward: 45,
      content: `Oq qog'ozga qora skotch bilan yo'l chizamiz va robot shu yo'ldan yursin!

IR sensor qora yuzadan yorug'likni qaytarmaydi, oq yuzadan esa qaytaradi. Shu farq orqali robot chiziqni "ko'radi".

Ikkita sensor ishlatamiz — chap va o'ng:

    int chap = digitalRead(2);
    int ong  = digitalRead(3);

    if (chap == 0 && ong == 0) oldingaYur();   // ikkalasi ham chiziqda
    else if (chap == 0) burilChap();           // chapga og'ib ketdi
    else if (ong == 0) burilOng();             // o'ngga og'ib ketdi
    else toxta();                              // chiziq yo'qoldi

Maslahat: chiziq kengligi 2-3 sm bo'lsin va burilishlar keskin bo'lmasin. Xona yorug'ligi ham natijaga ta'sir qiladi — sensorni har safar qaytadan sozlang.`,
    },
    {
      n: 8,
      title: "Servo motor va robot qo'li",
      type: "video",
      durationMin: 10,
      xpReward: 40,
      content: `Oddiy motor faqat aylanadi, servo motor esa aniq burchakka buriladi: 0° dan 180° gacha. Shuning uchun robot qo'llari va boshqariladigan g'ildiraklarda aynan servo ishlatiladi.

Servoda uchta sim bor: qizil (5V), qora yoki jigarrang (GND), sariq yoki to'q sariq (signal).

    #include <Servo.h>
    Servo qol;

    void setup() {
      qol.attach(9);
    }

    void loop() {
      qol.write(0);     // chap chekka
      delay(1000);
      qol.write(90);    // o'rta
      delay(1000);
      qol.write(180);   // o'ng chekka
      delay(1000);
    }

⚠️ Servoni qo'lingiz bilan zo'rlab burmang — ichidagi plastik tishlar sinib qoladi. Ko'p servo bir vaqtda ishlasa, alohida batareya kerak bo'ladi.`,
    },
    {
      n: 9,
      title: "Masofa o'lchash: ultratovush sensori",
      type: "code",
      durationMin: 12,
      xpReward: 45,
      content: `HC-SR04 sensori xuddi ko'rshapalak kabi ishlaydi: ovoz to'lqini yuboradi va uning qaytishini kutadi. Vaqtni bilsak, masofani hisoblash mumkin.

    long olchash() {
      digitalWrite(trig, LOW);
      delayMicroseconds(2);
      digitalWrite(trig, HIGH);
      delayMicroseconds(10);
      digitalWrite(trig, LOW);

      long vaqt = pulseIn(echo, HIGH);
      return vaqt * 0.034 / 2;   // santimetrda
    }

Nega 0.034 ga ko'paytiramiz? Chunki ovoz havoda mikrosekundiga taxminan 0.034 sm yuradi. Nega 2 ga bo'lamiz? Chunki ovoz borib-kelgan, ya'ni yo'lni ikki marta bosib o'tgan!

Sensor 2 sm dan 400 sm gacha o'lchaydi. Juda yaqin yoki juda uzoq bo'lsa noto'g'ri qiymat berishi mumkin.`,
    },
    {
      n: 10,
      title: "Ovoz va yorug'lik bilan signal berish",
      type: "code",
      durationMin: 10,
      xpReward: 40,
      content: `Robot faqat harakatlanmasin — u biz bilan "gaplashsin" ham. Buning uchun LED chiroq va zumzuma (buzzer) ishlatamiz.

    void setup() {
      pinMode(13, OUTPUT);   // LED
      pinMode(11, OUTPUT);   // buzzer
    }

    void ogohlantir() {
      digitalWrite(13, HIGH);
      tone(11, 1000);        // 1000 Hz ovoz
      delay(300);
      digitalWrite(13, LOW);
      noTone(11);
      delay(300);
    }

Endi buni to'siq sezilganda chaqiring — robot devorga yaqinlashsa chirog'i yonib, "biq-biq" qiladi.

⚠️ LED ni to'g'ridan-to'g'ri ulamang! Yonida albatta 220 om rezistor bo'lsin, aks holda LED kuyib ketadi. LED ning uzun oyog'i "+" tomon.`,
    },
    {
      n: 11,
      title: "Bluetooth orqali boshqarish",
      type: "lab",
      durationMin: 15,
      xpReward: 55,
      content: `Robotni telefondan boshqarish — eng qiziqarli qism! HC-05 Bluetooth moduli buni oson qiladi.

Ulash: modulning TX oyog'i Arduino RX (pin 0) ga, RX oyog'i Arduino TX (pin 1) ga ulanadi. Diqqat — teskari ulanadi, chunki birining gapirishini ikkinchisi eshitishi kerak.

    void loop() {
      if (Serial.available()) {
        char buyruq = Serial.read();
        if (buyruq == 'F') oldingaYur();
        if (buyruq == 'B') orqagaYur();
        if (buyruq == 'L') burilChap();
        if (buyruq == 'R') burilOng();
        if (buyruq == 'S') toxta();
      }
    }

Telefonga "Bluetooth Terminal" ilovasini o'rnating, HC-05 ga ulaning (parol odatda 1234) va harflarni yuboring.

Muhim: kodni yuklayotganda RX/TX simlarini vaqtincha uzib qo'ying, aks holda yuklash xato beradi.`,
    },
    {
      n: 12,
      title: "Yakuniy loyiha: aqlli robot",
      type: "lab",
      durationMin: 20,
      xpReward: 60,
      content: `Mana, kursning eng katta bosqichi. Endi barcha bilimlarni bitta robotda birlashtiramiz.

Sizning vazifangiz — quyidagilarni bajaradigan robot yig'ish:
1. Chiziq bo'ylab yura oladi.
2. Oldida to'siq paydo bo'lsa to'xtaydi va ogohlantiruvchi ovoz chiqaradi.
3. Telefondan "avtomatik" va "qo'lda" rejimlar orasida almashtirish mumkin.

Ishni bosqichma-bosqich qiling: avval har bir qismni alohida sinang, keyin birlashtiring. Kodni funksiyalarga bo'ling — shunda xatoni topish osonlashadi.

Agar biror narsa ishlamasa, xafa bo'lmang. Haqiqiy muhandislar ham loyihaning 90% vaqtini xato qidirishga sarflaydi. Har bir xato — yangi bilim.

Robotingiz tayyor bo'lgach, video qilib PilotKids hamjamiyatiga ulashing. Omad!`,
    },
  ],
  quiz: [
    {
      prompt: "Qaysi qism masofani sezib, robotning to'siqqa urilishiga yo'l qo'ymaydi?",
      options: ["Ultratovush sensori", "Servo motor", "Rezistor", "Breadboard"],
      correctIndex: 0,
    },
    {
      prompt: "Nima uchun motor Arduino'ga to'g'ridan-to'g'ri emas, motor drayveri orqali ulanadi?",
      options: [
        "Chiroyliroq ko'rinishi uchun",
        "Arduino pinining quvvati motorni aylantirishga yetmaydi",
        "Drayversiz kod yozib bo'lmaydi",
        "Motor faqat 3V bilan ishlaydi",
      ],
      correctIndex: 1,
    },
    {
      prompt: "Arduino kodidagi loop() funksiyasi qanday ishlaydi?",
      options: [
        "Faqat bir marta, dastur boshida ishlaydi",
        "Umuman ishlamaydi, u faqat izoh",
        "Cheksiz marta, qayta-qayta takrorlanadi",
        "Faqat tugma bosilganda ishlaydi",
      ],
      correctIndex: 2,
    },
    {
      prompt: "delay(2000) buyrug'i nima qiladi?",
      options: [
        "Robotni 2000 sm yurgizadi",
        "Dasturni 2 soniya kutib turadi",
        "Motorni 2000 marta aylantiradi",
        "Sensorni o'chiradi",
      ],
      correctIndex: 1,
    },
    {
      prompt: "Chiziq bo'ylab yuruvchi robotda IR sensor nimani ajratadi?",
      options: [
        "Havo haroratini",
        "Ovoz balandligini",
        "Yuzaning qora yoki oq ekanini",
        "Batareya quvvatini",
      ],
      correctIndex: 2,
    },
    {
      prompt: "Servo motorning oddiy motordan asosiy farqi nima?",
      options: [
        "U aniq burchakka (0°–180°) buriladi",
        "U umuman aylanmaydi",
        "U batareyasiz ishlaydi",
        "U faqat orqaga aylanadi",
      ],
      correctIndex: 0,
    },
    {
      prompt: "LED chiroqni ulaganda yoniga nima qo'yish shart?",
      options: ["Ikkinchi LED", "Rezistor", "Motor", "Sensor"],
      correctIndex: 1,
    },
  ],
};

/* ═════════════════════════ 2) Scratch: o'yin yaratish — 9 dars ═════════════════════════ */

const scratch: CourseSeed = {
  slug: "scratch-oyin-yaratish",
  lessons: [
    {
      n: 1,
      title: "Scratch bilan tanishuv",
      type: "video",
      durationMin: 7,
      xpReward: 30,
      content: `Scratch — bu bloklardan dastur yig'iladigan sehrli maydon. Yozuv xatolari bo'lmaydi, chunki bloklar faqat to'g'ri joyga ulanadi — xuddi Lego kabi!

Ekran uchta qismdan iborat:
• Sahna (o'ng yuqorida) — bu yerda o'yiningiz ko'rinadi.
• Sprayt ro'yxati — o'yindagi qahramonlar.
• Bloklar palitrasi (chapda) — rangli buyruqlar.

Bloklar rangi bo'yicha guruhlangan: harakat ko'k, ko'rinish binafsha, ovoz pushti, boshqaruv sariq, sezish moviy.

Birinchi vazifangiz: mushukchani bosing va "10 qadam yur" blokini sudrab olib boring. Blokni bosing — mushuk siljiydi!

Scratch'ni scratch.mit.edu saytida bepul ishlatish mumkin. Ishingizni saqlash uchun akkaunt kerak — ota-onangizdan yordam so'rang.`,
    },
    {
      n: 2,
      title: "Sprayt va sahna",
      type: "video",
      durationMin: 8,
      xpReward: 30,
      content: `Sprayt — o'yindagi har bir personaj yoki narsa: qahramon, dushman, tanga, to'p. Sahna esa ular harakatlanadigan fon.

Yangi sprayt qo'shish uchun o'ng pastdagi mushukcha tugmasini bosing. Kutubxonadan tanlashingiz, o'zingiz chizishingiz yoki rasm yuklashingiz mumkin.

Har bir spraytning o'z kostyumlari (ko'rinishlari) bo'ladi. "Kostyumlar" bo'limiga o'tib, ularni tahrirlash mumkin. Kostyumlarni ketma-ket almashtirsak — animatsiya hosil bo'ladi!

Sahna koordinatalari: markaz (0, 0). x o'ngga qarab ortadi (−240 dan 240 gacha), y yuqoriga qarab ortadi (−180 dan 180 gacha).

Vazifa: bitta qahramon va bitta fon tanlang. Qahramonni sahnaning chap chetiga qo'ying — keyingi darsda uni yurgizamiz.`,
    },
    {
      n: 3,
      title: "Harakat va boshqaruv bloklari",
      type: "code",
      durationMin: 10,
      xpReward: 40,
      content: `Endi qahramonimizni klaviatura bilan boshqaramiz.

Bloklarni shunday yig'ing:

    [yashil bayroq bosilganda]
    [doim takrorla]
      [agar (o'ng strelka bosilgan bo'lsa)]
        [x ni 10 ga o'zgartir]
      [agar (chap strelka bosilgan bo'lsa)]
        [x ni -10 ga o'zgartir]

"Doim takrorla" bloki ichidagilarni to'xtovsiz tekshirib turadi — shuning uchun qahramon tugmani bosgan zahoti javob beradi.

Agar harakat juda sekin bo'lsa 10 ni 15 ga oshiring, juda tez bo'lsa 5 ga kamaytiring.

Qo'shimcha: "chetga tegsa qayt" blokini qo'shsangiz, qahramon ekrandan chiqib ketmaydi. Sinab ko'ring!`,
    },
    {
      n: 4,
      title: "Hodisalar va xabarlar",
      type: "code",
      durationMin: 9,
      xpReward: 40,
      content: `Hodisa (event) — bu "qachon nimadir sodir bo'lsa" degani. Sariq bloklar shu ish bilan shug'ullanadi.

Eng ko'p ishlatiladiganlari:
• [yashil bayroq bosilganda] — o'yin boshlanishi.
• [bo'shliq tugmasi bosilganda] — sakrash, otish.
• [bu sprayt bosilganda] — tugma yasash.
• [xabar oldim] — spraytlar bir-biriga signal yuborishi.

Xabar juda kuchli vosita. Masalan, qahramon dushmanga tegsa "o'yin tugadi" xabarini yuboradi, boshqa barcha spraytlar esa shu xabarni eshitib to'xtaydi.

    [agar (Dushman ga tegdi)]
      ["oyin-tugadi" xabarini yubor]

Bu usul o'yiningizni tartibli qiladi: har bir sprayt o'z ishini biladi, lekin hammasi bitta signal bilan birga ishlaydi.`,
    },
    {
      n: 5,
      title: "O'zgaruvchilar va ochko hisoblash",
      type: "code",
      durationMin: 11,
      xpReward: 45,
      content: `O'zgaruvchi — bu raqam saqlanadigan quticha. O'yinda ochko, jon soni va daraja aynan shunday saqlanadi.

"O'zgaruvchilar" bo'limiga kiring va "O'zgaruvchi yasash" ni bosing. Nomini "ochko" deb qo'ying.

Endi tanga yig'ish mantig'i:

    [yashil bayroq bosilganda]
    [ochko ni 0 qil]
    [doim takrorla]
      [agar (Tanga ga tegdi)]
        [ochko ni 1 ga oshir]
        [tasodifiy joyga bor]

Muhim qoida: o'yin boshida o'zgaruvchini albatta 0 ga qaytaring! Aks holda oldingi o'yindan qolgan ochko saqlanib qoladi.

Sahnadagi katakchani belgilasangiz, ochko ekranda ko'rinib turadi. "Jon" nomli ikkinchi o'zgaruvchi ham yasab ko'ring.`,
    },
    {
      n: 6,
      title: "Shartlar va o'yin qoidalari",
      type: "code",
      durationMin: 10,
      xpReward: 45,
      content: `Har bir o'yinning qoidasi bor: qachon yutasiz, qachon yutqazasiz. Bu qoidalar "agar ... bo'lsa" bloklari bilan yoziladi.

    [agar (ochko > 10) bo'lsa]
      ["Siz yutdingiz!" deb 2 soniya ayt]
      [hammasini to'xtat]

    [agar (jon < 1) bo'lsa]
      ["O'yin tugadi" deb 2 soniya ayt]
      [hammasini to'xtat]

Solishtirish belgilari: > kattaroq, < kichikroq, = teng.

Bir nechta shartni birlashtirish uchun "va" hamda "yoki" bloklaridan foydalaning. Masalan: agar (ochko > 10) va (jon > 0) bo'lsa — g'alaba.

Maslahat: o'yin juda oson yoki juda qiyin bo'lmasin. Do'stingizga o'ynatib ko'ring va uning reaksiyasiga qarab raqamlarni sozlang.`,
    },
    {
      n: 7,
      title: "Ovoz, animatsiya va effektlar",
      type: "video",
      durationMin: 9,
      xpReward: 40,
      content: `Yaxshi o'yin ko'zga ham, quloqqa ham yoqimli bo'lishi kerak.

Ovoz: "Ovozlar" bo'limidan kutubxonadan tanlang yoki mikrofon orqali o'zingiz yozing. Keyin [ovozni ijro et] blokini kerakli joyga qo'ying — tanga yig'ilganda "pop", urilganda "boing".

Animatsiya: yurish paytida kostyumlarni almashtiring.

    [doim takrorla]
      [keyingi kostyum]
      [0.1 soniya kut]

Effektlar: [rang effektini 25 ga o'zgartir], [o'lchamni 110% qil], [g'oyib bo'l] / [ko'rin]. Qahramon zarba yeganda qisqa vaqt g'oyib bo'lib-ko'rinsa, "shikast" hissi paydo bo'ladi.

Faqat me'yorini biling: juda ko'p effekt o'yinni chalkash qiladi.`,
    },
    {
      n: 8,
      title: "Darajalar va qiyinlik",
      type: "lab",
      durationMin: 12,
      xpReward: 50,
      content: `O'yin qiziq bo'lishi uchun asta-sekin qiyinlashishi kerak — bu "qiyinlik egri chizig'i" deb ataladi.

Oddiy usul: "daraja" o'zgaruvchisi yasang va dushman tezligini shunga bog'lang.

    [agar (ochko > 10) bo'lsa]
      [daraja ni 2 qil]
      [tezlik ni 8 qil]
      [fonni "kosmos" ga o'zgartir]

Har darajada nimadir o'zgarsin: fon, musiqa, dushmanlar soni yoki tezligi. Shunda o'yinchi "men rivojlanyapman" deb his qiladi.

Muvozanat qoidasi: har bir yangi daraja avvalgisidan biroz qiyinroq bo'lsin, lekin keskin sakrash bo'lmasin. Agar o'yinchi 3 marta ketma-ket yutqazsa — daraja juda qiyin degani.

Vazifa: o'yiningizga kamida 2 ta daraja qo'shing.`,
    },
    {
      n: 9,
      title: "Yakuniy loyiha: o'z o'yiningiz",
      type: "lab",
      durationMin: 15,
      xpReward: 60,
      content: `Endi hamma bilimni birlashtirib, o'zingizning to'liq o'yiningizni yasaysiz!

Talablar ro'yxati:
1. Klaviatura bilan boshqariladigan qahramon.
2. Kamida bitta dushman yoki to'siq.
3. Ochko va jon o'zgaruvchilari.
4. G'alaba va mag'lubiyat shartlari.
5. Ovoz effektlari.
6. Kamida 2 ta daraja.

Ish tartibi: avval qog'ozga o'yiningizni chizib oling — qanday ko'rinadi, qanday qoidalari bor. Keyin bitta-bitta qo'shing va har safar sinab ko'ring.

Tayyor bo'lgach, loyihangizni "Ulashish" tugmasi orqali e'lon qiling va havolani do'stlaringizga yuboring.

Eslab qoling: dunyodagi eng mashhur o'yinlar ham oddiy g'oyadan boshlangan. Sizniki ham shunday bo'lishi mumkin!`,
    },
  ],
  quiz: [
    {
      prompt: "Scratch'da sprayt nima?",
      options: [
        "O'yindagi personaj yoki narsa",
        "Kompyuter dasturi nomi",
        "Faqat fon rasmi",
        "Klaviatura tugmasi",
      ],
      correctIndex: 0,
    },
    {
      prompt: "O'zgaruvchi (masalan «ochko») nima uchun kerak?",
      options: [
        "Rasm chizish uchun",
        "Ovoz balandligini o'zgartirish uchun",
        "Qiymatni saqlab turish va o'zgartirish uchun",
        "Spraytni o'chirish uchun",
      ],
      correctIndex: 2,
    },
    {
      prompt: "«Doim takrorla» bloki nima qiladi?",
      options: [
        "Ichidagi bloklarni bir marta bajaradi",
        "Ichidagi bloklarni to'xtovsiz qayta-qayta bajaradi",
        "O'yinni to'xtatadi",
        "Yangi sprayt qo'shadi",
      ],
      correctIndex: 1,
    },
    {
      prompt: "O'yin boshlanganda ochko o'zgaruvchisini nima qilish kerak?",
      options: [
        "0 ga qaytarish kerak",
        "Hech narsa qilmaslik kerak",
        "Uni o'chirib tashlash kerak",
        "100 ga oshirish kerak",
      ],
      correctIndex: 0,
    },
    {
      prompt: "Bir sprayt boshqasiga signal berishi uchun qaysi blok ishlatiladi?",
      options: [
        "«10 qadam yur»",
        "«Keyingi kostyum»",
        "«Xabar yubor»",
        "«Rang effektini o'zgartir»",
      ],
      correctIndex: 2,
    },
    {
      prompt: "Sahnaning markaziy nuqtasi koordinatalari qanday?",
      options: ["(0, 0)", "(240, 180)", "(1, 1)", "(-240, -180)"],
      correctIndex: 0,
    },
  ],
};

/* ═════════════════════════ 3) micro:bit asoslari — 10 dars ═════════════════════════ */

const microbit: CourseSeed = {
  slug: "micro-bit-asoslari",
  lessons: [
    {
      n: 1,
      title: "micro:bit bilan tanishuv",
      type: "video",
      durationMin: 7,
      xpReward: 30,
      content: `micro:bit — kaft ichiga sig'adigan kichkina kompyuter. Kichkina bo'lsa ham, unda juda ko'p narsa bor!

Plata ustidagilar:
• 25 ta qizil LED (5×5 to'r) — rasm va harflar chiqaradi.
• A va B tugmalari.
• Akselerometr — silkitishni va qiyalikni sezadi.
• Kompas, harorat va yorug'lik sensorlari.
• Radio va Bluetooth — boshqa micro:bit bilan gaplashadi.
• Oltin rangli oyoqchalar (0, 1, 2, 3V, GND) — timsoh qisqichlar bilan ulanadi.

Dasturlash makecode.microbit.org saytida, brauzerda amalga oshiriladi. U yerda bloklar bilan ham, Python bilan ham yozish mumkin.

⚠️ Platani quruq qo'l bilan, chetlaridan ushlang. Metall qismlarga tanga yoki simni tasodifan tegizmang.`,
    },
    {
      n: 2,
      title: "Birinchi dastur: LED ekranda rasm",
      type: "code",
      durationMin: 8,
      xpReward: 35,
      content: `Birinchi dasturimiz — micro:bit yuragi ursin!

MakeCode'da "boshlanganda" blokiga "yurak ko'rsat" blokini qo'ying. Python'da esa shunday:

    from microbit import *

    while True:
        display.show(Image.HEART)
        sleep(500)
        display.show(Image.HEART_SMALL)
        sleep(500)

Kod tayyor bo'lgach "Yuklab olish" ni bosing, hosil bo'lgan .hex faylni USB orqali micro:bit diskiga sudrab tashlang. Sariq chiroq bir necha soniya miltillaydi — bu yuklanayotgani.

Tayyor tasvirlar: HEART, HAPPY, SAD, YES, NO, ARROW_N, DUCK va yana o'nlab.

O'zingizning rasmingizni ham chizishingiz mumkin — LED to'rida kerakli kataklarni belgilang.`,
    },
    {
      n: 3,
      title: "Tugmalar va kirish signallari",
      type: "code",
      durationMin: 9,
      xpReward: 35,
      content: `A va B tugmalari — micro:bit bilan gaplashishning eng oson yo'li.

    from microbit import *

    while True:
        if button_a.was_pressed():
            display.show("A")
        elif button_b.was_pressed():
            display.show("B")
        else:
            display.clear()

Ikki xil tekshiruv bor:
• is_pressed() — hozir bosib turilganmi?
• was_pressed() — oxirgi tekshiruvdan beri bosildimi?

Ikkalasini birga bosish uchun: if button_a.is_pressed() and button_b.is_pressed().

Vazifa: A bosilganda "HA", B bosilganda "YO'Q" chiqaradigan qaror qabul qiluvchi qurilma yasang. Do'stingizga savol bering va micro:bit javob bersin!`,
    },
    {
      n: 4,
      title: "Silkitish va akselerometr",
      type: "code",
      durationMin: 10,
      xpReward: 40,
      content: `Akselerometr — micro:bitning muvozanat sezgisi. U qurilma qanday turganini va qanday harakatlanayotganini biladi.

Eng mashhur loyiha — elektron zar:

    from microbit import *
    import random

    while True:
        if accelerometer.was_gesture('shake'):
            display.show(random.randint(1, 6))

Tanib oladigan harakatlar: 'shake' (silkitish), 'up', 'down', 'left', 'right', 'face up', 'face down', 'freefall'.

Aniq qiymat kerak bo'lsa: accelerometer.get_x() — u −1024 dan 1024 gacha son qaytaradi. Platani chapga qiyalatsangiz manfiy, o'ngga qiyalatsangiz musbat bo'ladi.

Bu bilan darajani boshqarish (labirint o'yini) yoki yiqilishni sezuvchi qurilma yasash mumkin.`,
    },
    {
      n: 5,
      title: "Harorat va yorug'lik sensorlari",
      type: "code",
      durationMin: 9,
      xpReward: 40,
      content: `micro:bit atrofni ham o'lchay oladi — buning uchun qo'shimcha detal kerak emas.

    from microbit import *

    while True:
        t = temperature()          # Selsiy darajada
        yorugli = display.read_light_level()   # 0 dan 255 gacha

        if yorugli < 50:
            display.show(Image.ASLEEP)   # qorong'i — uxlash vaqti
        else:
            display.scroll(str(t))       # harorat ko'rsatiladi
        sleep(2000)

Qiziq fakt: harorat aslida protsessor haroratini o'lchaydi, shuning uchun natija xona haroratidan 2-3 daraja yuqoriroq chiqishi mumkin. Bu normal.

Yorug'likni esa LEDlarning o'zi o'lchaydi — LED ham yorug'lik chiqara oladi, ham sezа oladi!

Vazifa: qorong'i tushganda ogohlantiruvchi "tungi chiroq" yasang.`,
    },
    {
      n: 6,
      title: "Musiqa va ovoz",
      type: "code",
      durationMin: 9,
      xpReward: 40,
      content: `micro:bit qo'shiq ham ayta oladi. Buning uchun quloqchin yoki zumzumani 0-pin va GND ga timsoh qisqichlar bilan ulang. (V2 versiyasida ichki karnay bor.)

    from microbit import *
    import music

    music.play(music.NYAN)       # tayyor kuy

    melodiya = ['C4:4', 'D4:4', 'E4:4', 'F4:4', 'G4:8']
    music.play(melodiya)

Nota yozuvi: harf — nota, raqam — oktava, ikki nuqtadan keyin — davomiylik. Ya'ni 'C4:4' — 4-oktavadagi "do" notasi, 4 birlik davom etadi.

Tayyor kuylar: DADADADUM, ENTERTAINER, PRELUDE, BIRTHDAY, BADDY, POWER_UP.

⚠️ Quloqchinni quloqqa taqishdan oldin ovoz balandligini tekshiring — juda baland ovoz eshitishga zarar yetkazadi.`,
    },
    {
      n: 7,
      title: "Radio: micro:bitlar suhbati",
      type: "code",
      durationMin: 11,
      xpReward: 45,
      content: `Ikkita micro:bit bir-biriga simsiz xabar yubora oladi — xuddi ratsiya kabi!

Yuboruvchi:

    from microbit import *
    import radio

    radio.config(group=7)
    radio.on()

    while True:
        if button_a.was_pressed():
            radio.send('salom')

Qabul qiluvchi:

    while True:
        xabar = radio.receive()
        if xabar == 'salom':
            display.show(Image.HAPPY)

Eng muhim qoida: ikkala micro:bitda group raqami bir xil bo'lishi shart! Guruh 0 dan 255 gacha. Sinfda har bir juftlik o'z raqamini tanlasa, xabarlar aralashib ketmaydi.

Masofa taxminan 70 metrgacha. Bu bilan simsiz zvonok, xabar almashish yoki jamoaviy o'yin yasash mumkin.`,
    },
    {
      n: 8,
      title: "Pinlar va tashqi qurilmalar",
      type: "lab",
      durationMin: 12,
      xpReward: 45,
      content: `Oltin rangli katta oyoqchalar (0, 1, 2) orqali micro:bitga tashqi detallarni ulash mumkin.

LED yoqish:

    from microbit import *

    pin0.write_digital(1)   # yoq
    sleep(1000)
    pin0.write_digital(0)   # o'chir

Tugma yoki tanga sensori o'qish:

    if pin1.read_digital() == 1:
        display.show(Image.YES)

Analog o'qish (masalan potensiometr): pin2.read_analog() — 0 dan 1023 gacha qiymat qaytaradi.

Eng qiziq tajriba — meva pianino! Banan yoki olmani timsoh qisqich bilan pin0 ga ulang, bir qo'lingiz bilan GND ni ushlab turing va mevaga teging. Sizning tanangiz sim vazifasini bajaradi va nota chalinadi!

⚠️ 3V dan yuqori kuchlanish bermang — plata ishdan chiqadi.`,
    },
    {
      n: 9,
      title: "Qadam sanagich yasaymiz",
      type: "lab",
      durationMin: 12,
      xpReward: 50,
      content: `Endi haqiqiy foydali qurilma — qadam sanagich (pedometr) yasaymiz.

G'oya oddiy: har bir qadamda tana biroz silkinadi, akselerometr buni sezadi.

    from microbit import *

    qadam = 0

    while True:
        kuch = accelerometer.get_strength()
        if kuch > 1500:
            qadam += 1
            sleep(300)      # bitta qadamni ikki marta sanamaslik uchun

        if button_a.was_pressed():
            display.scroll(str(qadam))

        if button_b.was_pressed():
            qadam = 0

sleep(300) juda muhim — usiz bitta qadam 5-6 marta sanaladi.

Sozlash: 1500 chegarasini o'zingizga moslang. 10 ta qadam yurib, natijani solishtiring va raqamni oshiring yoki kamaytiring.

Qurilmani bel kamariga mahkamlab, bir kunlik qadamingizni sanang!`,
    },
    {
      n: 10,
      title: "Yakuniy loyiha: aqlli qurilma",
      type: "lab",
      durationMin: 15,
      xpReward: 60,
      content: `Kursning yakuniy bosqichi — o'zingizning aqlli qurilmangizni ixtiro qiling.

G'oyalar ro'yxati:
• Xona termometri — harorat baland bo'lsa ogohlantiradi.
• Simsiz eshik qo'ng'irog'i — radio orqali ishlaydi.
• Tungi chiroq — qorong'ida avtomatik yonadi.
• Reaksiya o'yini — LED yonganda tez tugma bosish kerak.
• Kompas — yo'nalishni strelka bilan ko'rsatadi.

Loyiha talablari:
1. Kamida bitta sensordan foydalanilsin.
2. LED ekran orqali natija ko'rsatilsin.
3. Tugma bilan boshqarish bo'lsin.

Ishni kichik qadamlarga bo'ling va har qadamda sinang. Kodni izohlar bilan tushuntiring — bir hafta o'tib o'zingiz o'qiganingizda ham tushunarli bo'lsin.

Loyihangizni ko'rgazmaga olib boring — bu bilimni ulashishning eng yaxshi usuli!`,
    },
  ],
  quiz: [
    {
      prompt: "micro:bit ekranida nechta LED bor?",
      options: ["9 ta (3×3)", "16 ta (4×4)", "25 ta (5×5)", "36 ta (6×6)"],
      correctIndex: 2,
    },
    {
      prompt: "Qaysi sensor micro:bitning silkitilganini sezadi?",
      options: ["Harorat sensori", "Akselerometr", "Yorug'lik sensori", "Radio moduli"],
      correctIndex: 1,
    },
    {
      prompt: "Ikki micro:bit radio orqali gaplashishi uchun nima bir xil bo'lishi shart?",
      options: ["Group (guruh) raqami", "Batareya rangi", "USB kabel uzunligi", "Ekrandagi rasm"],
      correctIndex: 0,
    },
    {
      prompt: "sleep(500) buyrug'i nima qiladi?",
      options: [
        "Ekranni o'chiradi",
        "500 ta LED yoqadi",
        "Yarim soniya kutib turadi",
        "micro:bitni qayta ishga tushiradi",
      ],
      correctIndex: 2,
    },
    {
      prompt: "Qadam sanagichda sleep(300) nima uchun qo'yiladi?",
      options: [
        "Batareyani tejash uchun",
        "Bitta qadam bir necha marta sanalmasligi uchun",
        "Ekranni yorqinroq qilish uchun",
        "Radioni yoqish uchun",
      ],
      correctIndex: 1,
    },
    {
      prompt: "pin2.read_analog() qanday qiymat qaytaradi?",
      options: ["Faqat 0 yoki 1", "0 dan 1023 gacha son", "Harf yoki so'z", "Harorat darajasi"],
      correctIndex: 1,
    },
  ],
};

/* ═════════════════════════ 4) Python: boshlang'ich — 14 dars ═════════════════════════ */

const python: CourseSeed = {
  slug: "python-boshlangich",
  lessons: [
    {
      n: 1,
      title: "Python nima va nega u kerak?",
      type: "video",
      durationMin: 7,
      xpReward: 30,
      content: `Python — dunyodagi eng ommabop dasturlash tillaridan biri. Uni YouTube, Instagram, NASA va ko'plab o'yin studiyalari ishlatadi.

Nega aynan Python?
• Kod deyarli inglizcha gapga o'xshaydi — o'qish oson.
• Kam yozib, ko'p ish qilish mumkin.
• Sun'iy intellekt, saytlar, o'yinlar, robotlar — hamma joyda ishlaydi.

Birinchi dasturingiz atigi bir qator:

    print("Salom, dunyo!")

print() — ekranga yozuvchi buyruq. Qavs ichidagi qo'shtirnoqli matn ekranda paydo bo'ladi.

Boshlash uchun python.org dan Python o'rnating yoki brauzerda replit.com ni oching — hech narsa o'rnatmasdan ham yozish mumkin.

Ismingizni yozdirib ko'ring: print("Mening ismim Aziz").`,
    },
    {
      n: 2,
      title: "O'zgaruvchilar va ma'lumot turlari",
      type: "code",
      durationMin: 9,
      xpReward: 35,
      content: `O'zgaruvchi — bu qiymat saqlanadigan nom. Xuddi ustiga yorliq yopishtirilgan qutichaga o'xshaydi.

    ism = "Aziz"
    yosh = 11
    boy = 1.45
    oquvchimi = True

Asosiy turlar:
• str (matn) — qo'shtirnoq ichida yoziladi.
• int (butun son) — 5, −20, 1000.
• float (kasr son) — 1.45, 3.14.
• bool (rost/yolg'on) — True yoki False.

Turini bilish uchun: print(type(yosh)).

Nom qoidalari: raqam bilan boshlanmaydi, bo'sh joy bo'lmaydi, kichik harf afzal. To'g'ri: bola_yoshi. Noto'g'ri: 2bola, bola yoshi.

Muhim: yosh = 11 bu son, "11" esa matn. "11" + "5" natijasi "115" bo'ladi, 11 + 5 esa 16!`,
    },
    {
      n: 3,
      title: "Foydalanuvchi bilan muloqot: input()",
      type: "code",
      durationMin: 9,
      xpReward: 35,
      content: `Dastur faqat gapirmasin — u eshitsin ham. input() buyrug'i foydalanuvchidan ma'lumot so'raydi.

    ism = input("Ismingiz nima? ")
    print("Salom, " + ism + "!")

Muhim nozik joy: input() DOIM matn qaytaradi, hatto siz raqam kiritsangiz ham. Shuning uchun sonni int() bilan aylantirish kerak:

    yosh = int(input("Yoshingiz nechada? "))
    print("Kelasi yili siz", yosh + 1, "yoshga to'lasiz")

Agar int() ni unutsangiz, dastur xato beradi: can only concatenate str.

f-string usuli qulayroq:

    print(f"Salom {ism}, sizga {yosh} yosh!")

Vazifa: ism va yoshni so'rab, foydalanuvchi 100 yoshga to'lishiga necha yil qolganini hisoblab bering.`,
    },
    {
      n: 4,
      title: "Matematik amallar",
      type: "code",
      durationMin: 8,
      xpReward: 35,
      content: `Python — juda kuchli kalkulyator.

    print(7 + 3)    # 10  qo'shish
    print(7 - 3)    # 4   ayirish
    print(7 * 3)    # 21  ko'paytirish
    print(7 / 3)    # 2.333...  bo'lish
    print(7 // 3)   # 2   butun qism
    print(7 % 3)    # 1   qoldiq
    print(7 ** 2)   # 49  darajaga oshirish

% (qoldiq) juda foydali. Masalan, son juftmi yoki toqmi bilish uchun:

    if son % 2 == 0:
        print("Juft son")

Amallar tartibi maktabdagidek: avval qavs, keyin daraja, keyin ko'paytirish/bo'lish, oxirida qo'shish/ayirish.

    print(2 + 3 * 4)      # 14
    print((2 + 3) * 4)    # 20

Vazifa: uchburchak yuzini hisoblaydigan dastur yozing (asos × balandlik / 2).`,
    },
    {
      n: 5,
      title: "Shartli operatorlar: if / elif / else",
      type: "code",
      durationMin: 11,
      xpReward: 40,
      content: `Dastur qaror qabul qilishi uchun if kerak.

    ball = int(input("Bahoingiz: "))

    if ball >= 90:
        print("A'lo! 5 baho")
    elif ball >= 70:
        print("Yaxshi, 4 baho")
    elif ball >= 50:
        print("Qoniqarli, 3 baho")
    else:
        print("Yana harakat qiling")

Solishtirish belgilari: == teng, != teng emas, > katta, < kichik, >= katta yoki teng, <= kichik yoki teng.

⚠️ Eng ko'p uchraydigan xato: = va == ni chalkashtirish. Bitta = qiymat berish, ikkita == esa solishtirish!

Python'da bo'sh joy (otstup) juda muhim. if dan keyingi qator 4 ta probel ichkariga surilishi shart, aks holda IndentationError chiqadi.

Shartlarni birlashtirish: and (va), or (yoki), not (emas).`,
    },
    {
      n: 6,
      title: "Ro'yxatlar (list)",
      type: "code",
      durationMin: 10,
      xpReward: 40,
      content: `Ro'yxat — ko'p qiymatni bitta nomda saqlash usuli.

    mevalar = ["olma", "banan", "uzum"]

    print(mevalar[0])    # olma — sanoq 0 dan boshlanadi!
    print(mevalar[-1])   # uzum — oxirgisi
    print(len(mevalar))  # 3 — nechta element bor

Foydali amallar:

    mevalar.append("shaftoli")   # oxiriga qo'shish
    mevalar.remove("banan")      # o'chirish
    mevalar.sort()               # alifbo bo'yicha tartiblash
    mevalar.reverse()            # teskari qilish

Tekshirish: if "olma" in mevalar: print("Bor!")

Eng muhim narsani eslab qoling: birinchi element [0], ikkinchisi [1] va hokazo. Ko'p yangi dasturchi shu yerda adashadi.

Vazifa: 5 ta sevimli o'yiningiz ro'yxatini yasang va ularni alifbo tartibida chiqaring.`,
    },
    {
      n: 7,
      title: "Sikllar: for va while",
      type: "code",
      durationMin: 11,
      xpReward: 45,
      content: `Sikl — bir ishni qayta-qayta bajarish. Bir xil kodni 10 marta yozish o'rniga, uni sikl ichiga qo'yamiz.

for sikli — ma'lum marta takrorlash:

    for i in range(5):
        print("Salom", i)      # 0, 1, 2, 3, 4

    for meva in mevalar:
        print(meva)            # har bir elementni chiqaradi

while sikli — shart bajarilgunicha:

    son = 1
    while son <= 5:
        print(son)
        son = son + 1

⚠️ while ishlatganda o'zgaruvchini o'zgartirishni unutmang! Aks holda cheksiz sikl hosil bo'ladi va dastur qotib qoladi. Bunday holatda Ctrl+C bosing.

Vazifa: 1 dan 10 gacha sonlarning ko'paytirish jadvalini chiqaring.`,
    },
    {
      n: 8,
      title: "Funksiyalar yozamiz",
      type: "code",
      durationMin: 11,
      xpReward: 45,
      content: `Funksiya — kodning nomlangan bo'lagi. Bir marta yozib, istagancha marta chaqirasiz.

    def salomlash(ism):
        print(f"Salom, {ism}!")

    salomlash("Aziz")
    salomlash("Malika")

Natija qaytaradigan funksiya:

    def yuza(uzunlik, kenglik):
        return uzunlik * kenglik

    natija = yuza(5, 3)
    print(natija)     # 15

def — funksiya e'lon qilish so'zi. Qavs ichidagilar — parametrlar (kirish ma'lumotlari). return — natijani qaytaradi.

Nega funksiya kerak? Chunki:
1. Kod takrorlanmaydi.
2. Xatoni bitta joyda tuzatasiz.
3. Kod o'qishga oson bo'ladi.

Yaxshi funksiya bitta ishni qiladi va nomi shu ishni bildiradi.`,
    },
    {
      n: 9,
      title: "Lug'atlar (dictionary)",
      type: "code",
      durationMin: 10,
      xpReward: 45,
      content: `Lug'at — "kalit: qiymat" juftliklarini saqlaydi. Xuddi haqiqiy lug'atdagi kabi: so'zni topib, ma'nosini o'qiysiz.

    oquvchi = {
        "ism": "Aziz",
        "yosh": 11,
        "sinf": "5-A",
        "ball": 95
    }

    print(oquvchi["ism"])       # Aziz
    oquvchi["ball"] = 100       # o'zgartirish
    oquvchi["shahar"] = "Toshkent"   # yangi qo'shish

Xavfsiz o'qish: oquvchi.get("telefon", "yo'q") — kalit bo'lmasa xato bermaydi.

Barchasini aylanib chiqish:

    for kalit, qiymat in oquvchi.items():
        print(kalit, "→", qiymat)

Ro'yxat va lug'at farqi: ro'yxatda elementni raqam bilan topasiz ([0]), lug'atda esa nom bilan (["ism"]). Nom bilan topish ancha tushunarli!`,
    },
    {
      n: 10,
      title: "Matn bilan ishlash (string)",
      type: "code",
      durationMin: 9,
      xpReward: 40,
      content: `Matn (string) ustida ko'plab foydali amallar bor.

    matn = "Salom Dunyo"

    print(matn.upper())        # SALOM DUNYO
    print(matn.lower())        # salom dunyo
    print(len(matn))           # 11 ta belgi
    print(matn.replace("Dunyo", "PilotKids"))
    print(matn.split(" "))     # ['Salom', 'Dunyo']

Bo'laklab olish (slicing):

    print(matn[0])      # S
    print(matn[0:5])    # Salom
    print(matn[-5:])    # Dunyo

Tekshirishlar: matn.startswith("Sal") → True, "Dunyo" in matn → True.

Bo'sh joyni olib tashlash: matn.strip() — foydalanuvchi kiritgan ma'lumotni tozalashda juda kerak.

Vazifa: ism va familiyani so'rab, bosh harflarini chiqaruvchi dastur yozing (Aziz Karimov → A.K.).`,
    },
    {
      n: 11,
      title: "Xatolar va ularni tuzatish",
      type: "video",
      durationMin: 9,
      xpReward: 40,
      content: `Xato qilish — dasturlashning normal qismi. Hatto tajribali dasturchilar ham har kuni xato qiladi. Muhimi — xatoni o'qishni bilish.

Uch xil xato bor:
• SyntaxError — yozuv xatosi (qavs yopilmagan, ikki nuqta qo'yilmagan).
• NameError — mavjud bo'lmagan o'zgaruvchi ishlatilgan (ko'pincha imlo xatosi).
• TypeError — noto'g'ri tur, masalan matnni songa qo'shish.

Xato xabarini oxiridan o'qing — u yerda eng muhim ma'lumot va qator raqami bo'ladi.

Xatoni ushlash:

    try:
        yosh = int(input("Yoshingiz: "))
    except ValueError:
        print("Iltimos, faqat raqam kiriting!")

Maslahat: kod ishlamasa, print() bilan o'zgaruvchilarni chiqarib ko'ring — qayerda noto'g'ri qiymat borligi darrov ma'lum bo'ladi.`,
    },
    {
      n: 12,
      title: "Tasodifiy sonlar va o'yin mantiqi",
      type: "code",
      durationMin: 10,
      xpReward: 45,
      content: `O'yin qiziq bo'lishi uchun oldindan bilib bo'lmaydigan narsa kerak — tasodif.

    import random

    print(random.randint(1, 6))            # zar tashlash
    print(random.choice(["tosh", "qaychi", "qog'oz"]))
    ismlar = ["Aziz", "Malika", "Bek"]
    random.shuffle(ismlar)                 # aralashtirish

"Sonni top" o'yini:

    import random

    yashirin = random.randint(1, 100)
    urinish = 0

    while True:
        taxmin = int(input("Sonni toping: "))
        urinish += 1
        if taxmin < yashirin:
            print("Kattaroq!")
        elif taxmin > yashirin:
            print("Kichikroq!")
        else:
            print(f"Topdingiz! {urinish} urinishda")
            break

break — sikldan chiqish buyrug'i. Bu o'yinni do'stingizga o'ynating!`,
    },
    {
      n: 13,
      title: "Fayl bilan ishlash",
      type: "code",
      durationMin: 10,
      xpReward: 45,
      content: `Dastur yopilganda ma'lumot yo'qolib ketmasligi uchun uni faylga yozamiz.

Yozish:

    with open("natijalar.txt", "w") as f:
        f.write("Aziz - 95 ball\\n")
        f.write("Malika - 98 ball\\n")

O'qish:

    with open("natijalar.txt", "r") as f:
        for qator in f:
            print(qator.strip())

Rejimlar: "w" — yangidan yozish (eski ma'lumot o'chadi!), "a" — oxiriga qo'shish, "r" — faqat o'qish.

with ishlatish yaxshi odat: u faylni avtomatik yopadi, siz unutmaysiz.

⚠️ Ehtiyot bo'ling: "w" rejimi faylning eski mazmunini butunlay o'chirib yuboradi. Ma'lumot qo'shmoqchi bo'lsangiz "a" ishlating.

Vazifa: o'yin natijalarini faylga saqlaydigan va keyingi safar o'qib ko'rsatadigan dastur yozing.`,
    },
    {
      n: 14,
      title: "Yakuniy loyiha: o'z dasturingiz",
      type: "lab",
      durationMin: 15,
      xpReward: 60,
      content: `Tabriklaymiz — Python asoslarini o'zlashtirdingiz! Endi bilimlarni birlashtirib, o'z dasturingizni yozasiz.

Loyiha g'oyalari:
• Viktorina o'yini — savollar lug'atda, natija faylda saqlanadi.
• Vazifalar ro'yxati — qo'shish, o'chirish, belgilash.
• Matematika mashqi — tasodifiy misollar va ball hisoblash.
• Parol generatori — tasodifiy va xavfsiz parol yasaydi.

Talablar:
1. Kamida 3 ta funksiya ishlatilsin.
2. Ro'yxat yoki lug'at bo'lsin.
3. Sikl va shart operatorlari qo'llanilsin.
4. Natija faylga saqlansin.
5. Xato ushlash (try/except) bo'lsin.

Ish tartibi: avval qog'ozga rejani yozing, keyin bitta-bitta funksiya yozib sinang. Hammasini birdan yozishga urinmang.

Dasturingiz tayyor bo'lgach, do'stingizga ishlatib ko'ring — u topgan xatolar sizni yaxshiroq dasturchi qiladi. Omad!`,
    },
  ],
  quiz: [
    {
      prompt: "print() buyrug'i nima qiladi?",
      options: [
        "Faylni printerga yuboradi",
        "Ekranga matn yoki qiymat chiqaradi",
        "Dasturni to'xtatadi",
        "Yangi o'zgaruvchi yasaydi",
      ],
      correctIndex: 1,
    },
    {
      prompt: "input() buyrug'i qaytaradigan qiymat qaysi turda bo'ladi?",
      options: ["Har doim matn (str)", "Har doim son (int)", "Har doim True/False", "Ro'yxat"],
      correctIndex: 0,
    },
    {
      prompt: 'mevalar = ["olma", "banan", "uzum"] bo\'lsa, mevalar[1] nima qaytaradi?',
      options: ["olma", "banan", "uzum", "1"],
      correctIndex: 1,
    },
    {
      prompt: "Qaysi belgi ikki qiymatni solishtirish uchun ishlatiladi?",
      options: ["=", "==", "=>", "::"],
      correctIndex: 1,
    },
    {
      prompt: "7 % 2 amalining natijasi nima?",
      options: ["3.5", "3", "1", "14"],
      correctIndex: 2,
    },
    {
      prompt: "Funksiya e'lon qilish uchun qaysi kalit so'z ishlatiladi?",
      options: ["func", "def", "function", "define"],
      correctIndex: 1,
    },
    {
      prompt: "Lug'atda (dictionary) qiymatga qanday murojaat qilinadi?",
      options: [
        "Faqat raqamli indeks bilan",
        "Kalit (nom) orqali",
        "Umuman murojaat qilib bo'lmaydi",
        "Faqat sikl bilan",
      ],
      correctIndex: 1,
    },
  ],
};

const COURSES: CourseSeed[] = [robototexnika, scratch, microbit, python];

/* ─────────────────────────── Asosiy oqim ─────────────────────────── */

async function main() {
  console.log("📚 Kontent seed boshlandi…");

  for (const c of COURSES) {
    const [row] = await db
      .select({ id: schema.course.id, title: schema.course.title })
      .from(schema.course)
      .where(eq(schema.course.slug, c.slug));

    if (!row) {
      console.warn(`  ⚠ "${c.slug}" kursi topilmadi — o'tkazib yuborildi.`);
      continue;
    }

    // 1) Darslar — (course_id, sort_order) bo'yicha upsert.
    //    Mavjud darslarning id'si saqlanadi, shuning uchun progress buzilmaydi.
    for (const l of c.lessons) {
      const meta = l.meta ?? `${l.durationMin} daq · ${TYPE_LABEL[l.type]}`;
      await db
        .insert(schema.lesson)
        .values({
          courseId: row.id,
          sortOrder: l.n,
          title: l.title,
          meta,
          type: l.type,
          durationMin: l.durationMin,
          content: l.content,
          xpReward: l.xpReward,
        })
        .onConflictDoUpdate({
          target: [schema.lesson.courseId, schema.lesson.sortOrder],
          set: {
            title: l.title,
            meta,
            type: l.type,
            durationMin: l.durationMin,
            content: l.content,
            xpReward: l.xpReward,
          },
        });
    }

    // 2) Quiz savollari — unique kalit yo'q, shuning uchun avval tozalaymiz.
    await db.delete(schema.quizQuestion).where(eq(schema.quizQuestion.courseId, row.id));
    await db.insert(schema.quizQuestion).values(
      c.quiz.map((q, i) => ({
        courseId: row.id,
        prompt: q.prompt,
        options: [...q.options],
        correctIndex: q.correctIndex,
        sortOrder: i,
      })),
    );

    // 3) Kursdagi darslar sonini haqiqiy songa moslaymiz.
    await db
      .update(schema.course)
      .set({ totalLessons: c.lessons.length })
      .where(eq(schema.course.id, row.id));

    console.log(`  ✓ ${row.title} — ${c.lessons.length} dars, ${c.quiz.length} quiz savoli`);
  }

  console.log("✅ Kontent seed tugadi.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Kontent seed xatosi:", err);
    process.exit(1);
  });
