/**
 * Blok tizimining matnlari (§41).
 *
 * Blok ta'riflari va interfeys komponentlari ichida o'zbekcha satr
 * YOZILMAYDI — faqat shu jadvaldagi kalit ishlatiladi. Yangi til qo'shish
 * bitta jadval qo'shishga aylanadi, blok mantiqiga umuman tegilmaydi.
 *
 * Tarjimasi yo'q kalit uchun o'zbekcha matn qaytariladi (bo'sh joy emas):
 * yarim tarjima qilingan interfeysda bola nima bosayotganini baribir
 * tushunishi kerak.
 */

export type BlockLocale = "uz" | "ru" | "en";

export const BLOCK_LOCALES: readonly BlockLocale[] = ["uz", "ru", "en"];

type Messages = Record<string, string>;

/* ─────────────────────────── O'zbekcha ─────────────────────────── */

const uz: Messages = {
  /* Kategoriyalar */
  "blocks.category.events": "Boshlanish",
  "blocks.category.control": "Boshqaruv",
  "blocks.category.pins": "Arduino pinlari",
  "blocks.category.logic": "Mantiq",
  "blocks.category.math": "Matematika",
  "blocks.category.variables": "O'zgaruvchilar",
  "blocks.category.sensors": "Sensorlar",
  "blocks.category.output": "Chiqish",
  "blocks.category.motors": "Motorlar",
  "blocks.category.display": "Ekran",
  "blocks.category.serial": "Serial",
  "blocks.category.functions": "Funksiyalar",

  /* Boshlanish bloklari */
  "blocks.events.onStart": "Arduino ishga tushganda",
  "blocks.events.onStart.tip":
    "Ichidagi bloklar faqat bir marta — plata yoqilganda bajariladi. Arduino kodidagi setup() shu.",
  "blocks.events.forever": "Doim takrorla",
  "blocks.events.forever.tip":
    "Ichidagi bloklar to'xtovsiz qayta-qayta bajariladi. Arduino kodidagi loop() shu.",

  /* Pin bloklari */
  "blocks.pins.pinMode": "{pin} pinini {mode} qil",
  "blocks.pins.pinMode.tip":
    "Pin nima uchun ishlatilishini aytadi: OUTPUT — signal beradi, INPUT — signal o'qiydi.",
  "blocks.pins.digitalWrite": "{pin} ni {level} qil",
  "blocks.pins.digitalWrite.tip":
    "Pinga kuchlanish beradi (HIGH = 5V) yoki uzadi (LOW = 0V). LED shu bilan yonadi.",
  "blocks.pins.digitalRead": "{pin} qiymatini o'qi",
  "blocks.pins.digitalRead.tip": "Pinda kuchlanish bormi: bor bo'lsa 1, yo'q bo'lsa 0 qaytaradi.",
  "blocks.pins.analogRead": "{pin} analog qiymati",
  "blocks.pins.analogRead.tip":
    "Analog kirishdagi kuchlanishni 0 dan 1023 gacha son qilib qaytaradi. 0 = 0V, 1023 = 5V.",
  "blocks.pins.analogWrite": "{pin} ga {VALUE} kuch ber",
  "blocks.pins.analogWrite.tip":
    "PWM orqali 0–255 oralig'ida «yarim kuchlanish» beradi: LED xiraroq yonadi, motor sekinroq aylanadi.",

  /* Mantiq */
  "blocks.logic.if": "agar {IF} bo'lsa",
  "blocks.logic.if.tip":
    "Shart bajarilsa — ichidagi bloklar ishlaydi, aks holda o'tkazib yuboriladi.",
  "blocks.logic.ifElse": "agar {IF} bo'lsa",
  "blocks.logic.ifElse.tip":
    "Shart bajarilsa birinchi qism, bajarilmasa «aks holda» qismi ishlaydi.",
  "blocks.logic.else": "aks holda",
  "blocks.logic.compare": "{A} {OP} {B}",
  "blocks.logic.compare.tip":
    "Ikki sonni taqqoslaydi va «ha» yoki «yo'q» qaytaradi. Masalan: yorug'lik < 500.",
  "blocks.logic.andOr": "{A} {OP} {B}",
  "blocks.logic.andOr.tip":
    "&& — ikkala shart ham bajarilsa; || — kamida bittasi bajarilsa rost bo'ladi.",
  "blocks.logic.not": "{A} bajarilmasa",
  "blocks.logic.not.tip": "Shartni teskarisiga aylantiradi: rost → yolg'on, yolg'on → rost.",
  "blocks.logic.boolean": "{VAL}",
  "blocks.logic.boolean.tip": "Tayyor shart qiymati: true — rost, false — yolg'on.",

  /* Matematika */
  "blocks.math.number": "{NUM}",
  "blocks.math.number.tip": "Oddiy son. Uni istalgan qiymat uyasiga qo'yish mumkin.",
  "blocks.math.arithmetic": "{A} {OP} {B}",
  "blocks.math.arithmetic.tip":
    "Ikki son ustida amal bajaradi. % — bo'linmadan qolgan qoldiq (7 % 3 = 1).",
  "blocks.math.random": "{FROM} dan {TO} gacha tasodifiy son",
  "blocks.math.random.tip": "Har safar boshqa son beradi — o'yin va animatsiyalar uchun qulay.",
  "blocks.math.map": "{VALUE} ni {FROM_LOW}–{FROM_HIGH} dan {TO_LOW}–{TO_HIGH} ga o'tkaz",
  "blocks.math.map.tip":
    "Bir oraliqdagi sonni boshqa oraliqqa cho'zadi. Sensor qiymatini (0–1023) PWM ga (0–255) o'tkazish uchun kerak.",
  "blocks.math.minMax": "{A} va {B} ning {OP} qiymati",
  "blocks.math.minMax.tip": "min — kichigini, max — kattasini qaytaradi.",
  "blocks.math.constrain": "{VALUE} ni {LOW} va {HIGH} orasida ushla",
  "blocks.math.constrain.tip":
    "Son chegaradan chiqib ketmasin: kichik bo'lsa quyi chegara, katta bo'lsa yuqori chegara qaytadi.",

  /* O'zgaruvchilar */
  "blocks.variables.get": "{VAR}",
  "blocks.variables.get.tip": "O'zgaruvchida saqlangan qiymatni oladi.",
  "blocks.variables.set": "{VAR} ga {VALUE} yoz",
  "blocks.variables.set.tip": "O'zgaruvchining eski qiymatini yangisi bilan almashtiradi.",
  "blocks.variables.change": "{VAR} ni {DELTA} ga oshir",
  "blocks.variables.change.tip": "Mavjud qiymatga qo'shadi. Manfiy son yozsangiz — kamaytiradi.",

  /* Serial */
  "blocks.serial.begin": "Serial monitorni {BAUD} tezlikda och",
  "blocks.serial.begin.tip":
    "Kompyuter bilan aloqani boshlaydi. Odatda «Arduino ishga tushganda» blokining ichiga qo'yiladi.",
  "blocks.serial.print": "Serialga {TEXT} yoz",
  "blocks.serial.print.tip": "Matn yoki qiymatni yangi qatorga o'tmasdan chiqaradi.",
  "blocks.serial.println": "Serialga {TEXT} yozib, yangi qatorga o't",
  "blocks.serial.println.tip":
    "Matn yoki qiymatni chiqaradi va keyingi yozuv yangi qatordan boshlanadi.",

  /* Sensorlar */
  "blocks.sensors.ldr": "{pin} dagi yorug'lik",
  "blocks.sensors.ldr.tip":
    "LDR — yorug'likka sezgir rezistor. Qorong'ida qiymat kichik, yorug'da katta bo'ladi (0–1023).",
  "blocks.sensors.pot": "{pin} dagi potensiometr",
  "blocks.sensors.pot.tip":
    "Potensiometr — buraladigan rezistor. Uni burasangiz qiymat 0 dan 1023 gacha o'zgaradi.",
  "blocks.sensors.tmp36": "{pin} dagi harorat (°C)",
  "blocks.sensors.tmp36.tip":
    "TMP36 sensori haroratni kuchlanish qilib beradi. Blok uni Selsiy graduslariga o'giradi.",
  /* Boshlang'ich darajadagi soddaroq yorliqlar (§32) — uyalar bir xil qoladi. */
  "blocks.sensors.soil.beginner": "tuproq nami {MODE} ({pin})",
  "blocks.sensors.ultrasonic.beginner": "masofa o'lchagich necha sm ko'rsatyapti ({TRIG}, {ECHO})",
  "blocks.output.rgbColor.beginner":
    "RGB LED rangi: qizil {R}, yashil {G}, ko'k {B} ({RPIN} {GPIN} {BPIN}, {COMMON})",

  "blocks.sensors.soil": "{pin} dagi tuproq namligi ({MODE})",
  "blocks.sensors.soil.tip":
    "Tuproq qanchalik nam ekanini o'lchaydi. «0–100 %» rejimida qiymat foizga o'giriladi.",
  "blocks.sensors.pir": "{pin} da harakat bor",
  "blocks.sensors.pir.tip":
    "PIR sensori issiq jismning (odam, hayvon) harakatini sezadi va signal beradi.",
  "blocks.sensors.button": "{pin} dagi tugma bosilgan ({MODE})",
  "blocks.sensors.button.tip":
    "INPUT_PULLUP — Arduino ichidagi rezistor ishlatiladi va bosilgan tugma LOW beradi. Blok buni o'zi hisobga oladi.",
  "blocks.sensors.dhtTemp": "{pin} dagi DHT11 harorati (°C)",
  "blocks.sensors.dhtTemp.tip": "DHT11 — harorat va namlikni birga o'lchaydigan raqamli sensor.",
  "blocks.sensors.dhtHum": "{pin} dagi DHT11 namligi (%)",
  "blocks.sensors.dhtHum.tip": "Havodagi nisbiy namlik — 0 dan 100 % gacha.",
  "blocks.sensors.ultrasonic": "masofa (sm), Trig {TRIG}, Echo {ECHO}",
  "blocks.sensors.ultrasonic.tip":
    "HC-SR04 tovush to'lqinini yuboradi va qaytishini kutadi. Shu vaqtdan masofa hisoblanadi.",

  /* Chiqish qurilmalari */
  "blocks.output.ledOn": "{pin} dagi LEDni yoq",
  "blocks.output.ledOn.tip": "LED — yorug'lik chiqaruvchi diod. Blok pin rejimini o'zi sozlaydi.",
  "blocks.output.ledOff": "{pin} dagi LEDni o'chir",
  "blocks.output.ledOff.tip": "Pinga kuchlanish berishni to'xtatadi — LED o'chadi.",
  "blocks.output.ledBrightness": "{pin} dagi LED yorqinligi {VALUE}",
  "blocks.output.ledBrightness.tip":
    "0 — o'chiq, 255 — eng yorug'. Faqat ~ belgili PWM pinlarda ishlaydi.",
  "blocks.output.rgbColor": "RGB LED ({RPIN},{GPIN},{BPIN} · {COMMON}) rangi Q{R} Y{G} K{B}",
  "blocks.output.rgbColor.tip":
    "Uch rangni aralashtirib istalgan tus hosil qiladi. Umumiy anodli LEDda qiymat teskari beriladi — blok buni o'zi qiladi.",
  "blocks.output.buzzerTone": "{pin} dagi buzzerda {FREQ} Hz tovush chiqar",
  "blocks.output.buzzerTone.tip":
    "Chastota qancha katta bo'lsa, tovush shuncha ingichka. 1000 Hz — odatiy «bip».",
  "blocks.output.buzzerOff": "{pin} dagi buzzerni o'chir",
  "blocks.output.buzzerOff.tip": "Tovushni to'xtatadi.",
  "blocks.output.buzzerBeep": "{pin} dagi buzzer {FREQ} Hz da {MS} ms bip qilsin",
  "blocks.output.buzzerBeep.tip":
    "Tovushni yoqadi, kutadi va o'chiradi — bitta blokda tayyor «bip».",
  "blocks.output.relayOn": "{pin} dagi releni yoq",
  "blocks.output.relayOn.tip":
    "Rele — elektron kalit. U orqali lampa yoki motor kabi kuchli qurilma yoqiladi.",
  "blocks.output.relayOff": "{pin} dagi releni o'chir",
  "blocks.output.relayOff.tip": "Rele kontaktini dastlabki holatiga qaytaradi.",

  /* Motorlar */
  "blocks.motors.servoWrite": "{pin} dagi servoni {ANGLE}° ga bur",
  "blocks.motors.servoWrite.tip": "Servo motor 0° dan 180° gacha buriladi va shu burchakda turadi.",
  "blocks.motors.dcForward": "motor oldinga ({IN1}, {IN2})",
  "blocks.motors.dcForward.tip":
    "L298N drayveridagi ikki yo'nalish pinini boshqaradi: biri HIGH, ikkinchisi LOW.",
  "blocks.motors.dcBack": "motor orqaga ({IN1}, {IN2})",
  "blocks.motors.dcBack.tip": "Yo'nalish pinlari almashadi — motor teskari aylanadi.",
  "blocks.motors.dcStop": "motorni to'xtat ({IN1}, {IN2})",
  "blocks.motors.dcStop.tip": "Ikkala yo'nalish pini ham LOW — motor to'xtaydi.",
  "blocks.motors.dcSpeed": "motor tezligi {SPEED} ({EN} pini)",
  "blocks.motors.dcSpeed.tip":
    "L298N ning ENA/ENB pini tezlikni belgilaydi: 0 — to'xtagan, 255 — eng tez.",

  /* Ekran */
  "blocks.display.lcdPrint": "LCD ga {TEXT} yoz ({PINS})",
  "blocks.display.lcdPrint.tip":
    "Matnni kursor turgan joydan boshlab chiqaradi. LCD 16 ta ustun va 2 ta qatordan iborat.",
  "blocks.display.lcdValue": "LCD ga {VALUE} qiymatini yoz ({PINS})",
  "blocks.display.lcdValue.tip": "Sensor qiymati yoki o'zgaruvchini ekranga chiqaradi.",
  "blocks.display.lcdCursor": "LCD kursorini {COL}-ustun, {ROW}-qatorga qo'y ({PINS})",
  "blocks.display.lcdCursor.tip": "Sanoq 0 dan boshlanadi: birinchi ustun — 0, birinchi qator — 0.",
  "blocks.display.lcdClear": "LCD ni tozala ({PINS})",
  "blocks.display.lcdClear.tip": "Ekrandagi hamma matnni o'chiradi va kursorni boshiga qaytaradi.",

  /* Sxemadagi komponentga bog'langan bloklar (§33) */
  "blocks.component.ledOn": "{NODE} ni yoq",
  "blocks.component.ledOn.tip":
    "LED — yorug'lik chiqaruvchi diod. Pin sxemadan topiladi: LEDni boshqa pinga ko'chirsangiz, blokka tegmasdan kod o'zgaradi.",
  "blocks.component.ledOff": "{NODE} ni o'chir",
  "blocks.component.ledOff.tip": "Tanlangan LEDga kuchlanish berishni to'xtatadi.",
  "blocks.component.ledBrightness": "{NODE} yorqinligi {VALUE}",
  "blocks.component.ledBrightness.tip":
    "0 — o'chiq, 255 — eng yorug'. LED ~ belgili PWM pinga ulangan bo'lishi kerak.",
  "blocks.component.rgbColor": "{NODE} rangi Q{R} Y{G} K{B}",
  "blocks.component.rgbColor.tip":
    "Qizil, yashil va ko'k yorug'likni aralashtiradi. Uchala pin ham PWM bo'lishi kerak.",
  "blocks.component.buzzerTone": "{NODE} da {FREQ} Hz tovush chiqar",
  "blocks.component.buzzerTone.tip": "Buzzer — tovush chiqaruvchi element.",
  "blocks.component.buzzerOff": "{NODE} ni o'chir",
  "blocks.component.buzzerOff.tip": "Tovushni to'xtatadi.",
  "blocks.component.relayOn": "{NODE} ni yoq",
  "blocks.component.relayOn.tip": "Rele — elektron kalit: kuchli qurilmani yoqib-o'chiradi.",
  "blocks.component.relayOff": "{NODE} ni o'chir",
  "blocks.component.relayOff.tip": "Rele kontaktini dastlabki holatiga qaytaradi.",
  "blocks.component.light": "{NODE} qiymati",
  "blocks.component.light.tip":
    "Analog sensordan 0 dan 1023 gacha qiymat o'qiydi. Pin sxemadan topiladi.",
  "blocks.component.tmp36": "{NODE} harorati (°C)",
  "blocks.component.tmp36.tip": "TMP36 kuchlanishini Selsiy graduslariga o'giradi.",
  "blocks.component.pir": "{NODE} harakat sezdi",
  "blocks.component.pir.tip": "PIR sensori issiq jismning harakatini sezadi.",
  "blocks.component.button": "{NODE} bosilgan",
  "blocks.component.button.tip":
    "Tugma qanday ulanganini sxemadan o'qiydi: yerga ulangan bo'lsa ichki pull-up ishlatiladi.",
  "blocks.component.dhtTemp": "{NODE} harorati (°C)",
  "blocks.component.dhtTemp.tip": "DHT11 — harorat va namlikni birga o'lchaydigan sensor.",
  "blocks.component.dhtHum": "{NODE} namligi (%)",
  "blocks.component.dhtHum.tip": "Havodagi nisbiy namlik — 0 dan 100 % gacha.",
  "blocks.component.ultrasonic": "{NODE} masofasi (sm)",
  "blocks.component.ultrasonic.tip":
    "HC-SR04 tovush to'lqinini yuboradi va qaytishini kutadi. Trig va Echo pinlari sxemadan olinadi.",
  "blocks.component.servoWrite": "{NODE} ni {ANGLE}° ga bur",
  "blocks.component.servoWrite.tip": "Servo motor 0° dan 180° gacha buriladi va shu holda turadi.",
  "blocks.component.lcdPrint": "{NODE} ga {TEXT} yoz",
  "blocks.component.lcdPrint.tip":
    "Matnni ekranga chiqaradi. Oltala pin sxemadan o'qiladi — qo'lda yozish shart emas.",
  "blocks.component.lcdValue": "{NODE} ga {VALUE} qiymatini yoz",
  "blocks.component.lcdValue.tip": "Sensor qiymati yoki o'zgaruvchini ekranga chiqaradi.",
  "blocks.component.lcdCursor": "{NODE} kursorini {COL}-ustun, {ROW}-qatorga qo'y",
  "blocks.component.lcdCursor.tip": "Sanoq 0 dan boshlanadi.",
  "blocks.component.lcdClear": "{NODE} ni tozala",
  "blocks.component.lcdClear.tip": "Ekrandagi matnni o'chiradi va kursorni boshiga qaytaradi.",

  /* Boshqaruv — vaqt */
  "blocks.control.waitSeconds": "{seconds} soniya kut",
  "blocks.control.waitSeconds.tip": "Ko'rsatilgan vaqt davomida hech narsa qilmay turadi.",
  "blocks.control.waitMillis": "{ms} millisekund kut",
  "blocks.control.waitMillis.tip": "1000 millisekund = 1 soniya.",
  "blocks.control.waitMicros": "{us} mikrosekund kut",
  "blocks.control.waitMicros.tip":
    "Juda qisqa kutish. 1000 mikrosekund = 1 millisekund. Sensorlar uchun kerak bo'ladi.",

  /* Ogohlantirishlar */
  "blocks.warn.orphan":
    "Bu blok «Arduino ishga tushganda» yoki «Doim takrorla» ichida emas — u bajarilmaydi.",
  "blocks.warn.duplicateStart":
    "«Arduino ishga tushganda» bloki bittadan ko'p. Faqat birinchisi ishlatildi.",
  "blocks.warn.duplicateForever":
    "«Doim takrorla» bloki bittadan ko'p. Faqat birinchisi ishlatildi.",
  "blocks.warn.emptySlot": "«{slot}» uyasi bo'sh — o'rniga {fallback} ishlatildi.",
  "blocks.warn.serialBeginMissing":
    "Serial bloklari ishlatilgan, lekin «Serial monitorni och» bloki qo'yilmagan — setup() ga Serial.begin({baud}) o'zi qo'shildi.",
  "blocks.warn.missingVariable":
    "Blok o'zgaruvchiga ishora qilmayapti — «O'zgaruvchilar» bo'limidan birini tanlang.",
  "blocks.warn.componentMissing":
    "Blok sxemadagi komponentga ishora qilmayapti — ro'yxatdan birini tanlang.",
  "blocks.warn.componentPinMissing":
    "Komponentning «{pin}» pini Arduino'ga ulanmagan — kodda vaqtincha zaxira pin ishlatildi.",

  /* Sxema tekshiruvi (§34) */
  "blocks.issue.componentMissing": "Bu blok ishora qilgan komponent sxemada topilmadi.",
  "blocks.issue.componentWrongType": "Sxemadagi komponent bu blokka mos kelmaydi.",
  "blocks.issue.pinNotConnected": "{component}: «{pin}» pini Arduino'ga ulanmagan.",
  "blocks.issue.notPwm": "{pin} — PWM pin emas, «{slot}» chiqishi uchun ~ belgili pin kerak.",
  "blocks.issue.noPower": "{component}: 5V (VCC) ulanmagan.",
  "blocks.issue.noGround": "{component}: GND (yer) ulanmagan.",
  "blocks.issue.serialPinConflict":
    "D{pin} pini Serial (RX/TX) uchun band — Serial bloklari bilan birga ishlatib bo'lmaydi.",
  "blocks.issue.motorNeedsDriver":
    "DC motor to'g'ridan-to'g'ri Arduino piniga ulangan. Arduino'ning toki yetmaydi — L298N kabi drayver qo'shing.",

  /* Interfeys */
  "blocks.ui.mode.block": "Bloklar",
  "blocks.ui.mode.code": "Kod",
  "blocks.ui.mode.split": "Ikkalasi",
  "blocks.ui.level.beginner": "Boshlang'ich",
  "blocks.ui.level.advanced": "Kengaytirilgan",
  "blocks.ui.levelGroup": "Bloklar darajasi",
  "blocks.ui.categories": "Blok kategoriyalari",
  "blocks.ui.canvas": "Blok ish maydoni. O'q tugmalari bilan tanlangan blok ko'chiriladi.",
  "blocks.ui.language": "Bloklar tili",
  "blocks.ui.selected": "Blok tanlandi",
  "blocks.ui.title": "Dasturlash",
  "blocks.ui.generated": "Hosil bo'lgan Arduino kod",
  "blocks.ui.emptyWorkspace":
    "Chapdagi kategoriyadan blokni bu yerga sudrab tashlang. «Arduino ishga tushganda» blokidan boshlang.",
  "blocks.ui.deleteHint": "Blokni palitraga qaytarib tashlang — o'chadi",
  "blocks.ui.undo": "Ortga",
  "blocks.ui.redo": "Oldinga",
  "blocks.ui.clear": "Ish maydonini tozalash",
  "blocks.ui.zoomIn": "Kattalashtirish",
  "blocks.ui.zoomOut": "Kichraytirish",
  "blocks.ui.zoomReset": "Masshtabni tiklash",
  "blocks.ui.zoomFit": "Bloklarni ekranga sig'dirish",
  "blocks.ui.duplicate": "Nusxalash",
  "blocks.ui.delete": "O'chirish",
  "blocks.ui.codeModeWarning":
    "Qo'lda yozilgan kod bloklarga avtomatik qaytarilmasligi mumkin. Kod rejimida davom etasizmi?",
  "blocks.ui.codeModeContinue": "Kod rejimida davom etish",
  "blocks.ui.codeModeCancel": "Bekor qilish",

  /* O'zgaruvchilar paneli */
  "blocks.ui.vars.title": "O'zgaruvchilar",
  "blocks.ui.vars.create": "O'zgaruvchi yarat",
  "blocks.ui.vars.namePlaceholder": "nomi, masalan hisob",
  "blocks.ui.vars.add": "Qo'shish",
  "blocks.ui.vars.cancel": "Bekor qilish",
  "blocks.ui.vars.rename": "Nomini o'zgartirish",
  "blocks.ui.vars.remove": "O'chirish",
  "blocks.ui.vars.empty": "Hali o'zgaruvchi yo'q. Pastdagi tugma bilan yarating.",
  "blocks.ui.vars.error.empty": "Nom bo'sh bo'lmasligi kerak.",
  "blocks.ui.vars.error.invalid":
    "Nom lotin harfi yoki _ bilan boshlanib, faqat harf, raqam va _ dan iborat bo'lsin.",
  "blocks.ui.vars.error.reserved": "Bu nom Arduino tilida band — boshqasini tanlang.",
  "blocks.ui.vars.error.duplicate": "Bunday nomli o'zgaruvchi allaqachon bor.",
  "blocks.ui.vars.error.limit": "O'zgaruvchilar soni chegarasiga yetildi.",
};

/* ─────────────────────────── Ruscha ─────────────────────────── */

const ru: Messages = {
  /* Kategoriyalar */
  "blocks.category.events": "Начало",
  "blocks.category.control": "Управление",
  "blocks.category.pins": "Пины Arduino",
  "blocks.category.logic": "Логика",
  "blocks.category.math": "Математика",
  "blocks.category.variables": "Переменные",
  "blocks.category.sensors": "Датчики",
  "blocks.category.output": "Вывод",
  "blocks.category.motors": "Моторы",
  "blocks.category.display": "Экран",
  "blocks.category.serial": "Serial",
  "blocks.category.functions": "Функции",

  /* Boshlanish */
  "blocks.events.onStart": "Когда Arduino запускается",
  "blocks.events.onStart.tip":
    "Блоки внутри выполняются один раз — при включении платы. Это setup() в коде Arduino.",
  "blocks.events.forever": "Всегда повторять",
  "blocks.events.forever.tip":
    "Блоки внутри выполняются снова и снова без остановки. Это loop() в коде Arduino.",

  /* Pinlar */
  "blocks.pins.pinMode": "сделать пин {pin} — {mode}",
  "blocks.pins.pinMode.tip":
    "Указывает, для чего используется пин: OUTPUT — подаёт сигнал, INPUT — читает сигнал.",
  "blocks.pins.digitalWrite": "установить {pin} в {level}",
  "blocks.pins.digitalWrite.tip":
    "Подаёт напряжение на пин (HIGH = 5 В) или снимает его (LOW = 0 В). Так загорается светодиод.",
  "blocks.pins.digitalRead": "значение пина {pin}",
  "blocks.pins.digitalRead.tip": "Есть ли напряжение на пине: если есть — 1, если нет — 0.",
  "blocks.pins.analogRead": "аналоговое значение {pin}",
  "blocks.pins.analogRead.tip":
    "Возвращает напряжение на аналоговом входе числом от 0 до 1023. 0 = 0 В, 1023 = 5 В.",
  "blocks.pins.analogWrite": "подать на {pin} мощность {VALUE}",
  "blocks.pins.analogWrite.tip":
    "Через ШИМ выдаёт «половину напряжения» в диапазоне 0–255: светодиод горит тусклее, мотор крутится медленнее.",

  /* Mantiq */
  "blocks.logic.if": "если {IF}",
  "blocks.logic.if.tip": "Если условие выполняется — блоки внутри работают, иначе пропускаются.",
  "blocks.logic.ifElse": "если {IF}",
  "blocks.logic.ifElse.tip":
    "Если условие выполняется — работает первая часть, если нет — часть «иначе».",
  "blocks.logic.else": "иначе",
  "blocks.logic.compare": "{A} {OP} {B}",
  "blocks.logic.compare.tip":
    "Сравнивает два числа и возвращает «да» или «нет». Например: освещённость < 500.",
  "blocks.logic.andOr": "{A} {OP} {B}",
  "blocks.logic.andOr.tip":
    "&& — истинно, когда выполнены оба условия; || — когда выполнено хотя бы одно.",
  "blocks.logic.not": "если не {A}",
  "blocks.logic.not.tip": "Переворачивает условие: истина → ложь, ложь → истина.",
  "blocks.logic.boolean": "{VAL}",
  "blocks.logic.boolean.tip": "Готовое значение условия: true — истина, false — ложь.",

  /* Matematika */
  "blocks.math.number": "{NUM}",
  "blocks.math.number.tip": "Обычное число. Его можно поставить в любое поле значения.",
  "blocks.math.arithmetic": "{A} {OP} {B}",
  "blocks.math.arithmetic.tip":
    "Выполняет действие над двумя числами. % — остаток от деления (7 % 3 = 1).",
  "blocks.math.random": "случайное число от {FROM} до {TO}",
  "blocks.math.random.tip": "Каждый раз даёт другое число — удобно для игр и анимаций.",
  "blocks.math.map": "перевести {VALUE} из {FROM_LOW}–{FROM_HIGH} в {TO_LOW}–{TO_HIGH}",
  "blocks.math.map.tip":
    "Растягивает число из одного диапазона в другой. Нужно, чтобы перевести значение датчика (0–1023) в ШИМ (0–255).",
  "blocks.math.minMax": "{OP} из {A} и {B}",
  "blocks.math.minMax.tip": "min — возвращает меньшее, max — большее.",
  "blocks.math.constrain": "удержать {VALUE} между {LOW} и {HIGH}",
  "blocks.math.constrain.tip":
    "Не даёт числу выйти за границы: меньше — вернёт нижнюю границу, больше — верхнюю.",

  /* O'zgaruvchilar */
  "blocks.variables.get": "{VAR}",
  "blocks.variables.get.tip": "Берёт значение, сохранённое в переменной.",
  "blocks.variables.set": "записать в {VAR} значение {VALUE}",
  "blocks.variables.set.tip": "Заменяет старое значение переменной новым.",
  "blocks.variables.change": "увеличить {VAR} на {DELTA}",
  "blocks.variables.change.tip":
    "Прибавляет к текущему значению. Если написать отрицательное число — уменьшит.",

  /* Serial */
  "blocks.serial.begin": "открыть Serial на скорости {BAUD}",
  "blocks.serial.begin.tip":
    "Начинает связь с компьютером. Обычно ставится внутрь блока «Когда Arduino запускается».",
  "blocks.serial.print": "вывести в Serial {TEXT}",
  "blocks.serial.print.tip": "Выводит текст или значение без перехода на новую строку.",
  "blocks.serial.println": "вывести в Serial {TEXT} и перейти на новую строку",
  "blocks.serial.println.tip":
    "Выводит текст или значение, а следующая запись начнётся с новой строки.",

  /* Sensorlar */
  "blocks.sensors.ldr": "освещённость на {pin}",
  "blocks.sensors.ldr.tip":
    "LDR — резистор, чувствительный к свету. В темноте значение маленькое, на свету большое (0–1023).",
  "blocks.sensors.pot": "потенциометр на {pin}",
  "blocks.sensors.pot.tip":
    "Потенциометр — поворотный резистор. При повороте значение меняется от 0 до 1023.",
  "blocks.sensors.tmp36": "температура на {pin} (°C)",
  "blocks.sensors.tmp36.tip":
    "Датчик TMP36 выдаёт температуру напряжением. Блок переводит его в градусы Цельсия.",
  /* Boshlang'ich darajadagi soddaroq yorliqlar (§32). */
  "blocks.sensors.soil.beginner": "влажность почвы {MODE} ({pin})",
  "blocks.sensors.ultrasonic.beginner": "сколько см показывает дальномер ({TRIG}, {ECHO})",
  "blocks.output.rgbColor.beginner":
    "цвет RGB-светодиода: красный {R}, зелёный {G}, синий {B} ({RPIN} {GPIN} {BPIN}, {COMMON})",

  "blocks.sensors.soil": "влажность почвы на {pin} ({MODE})",
  "blocks.sensors.soil.tip":
    "Измеряет, насколько влажная почва. В режиме «0–100 %» значение переводится в проценты.",
  "blocks.sensors.pir": "есть движение на {pin}",
  "blocks.sensors.pir.tip":
    "Датчик PIR чувствует движение тёплого тела (человека, животного) и подаёт сигнал.",
  "blocks.sensors.button": "кнопка на {pin} нажата ({MODE})",
  "blocks.sensors.button.tip":
    "INPUT_PULLUP — используется внутренний резистор Arduino, и нажатая кнопка даёт LOW. Блок учитывает это сам.",
  "blocks.sensors.dhtTemp": "температура DHT11 на {pin} (°C)",
  "blocks.sensors.dhtTemp.tip":
    "DHT11 — цифровой датчик, который измеряет температуру и влажность вместе.",
  "blocks.sensors.dhtHum": "влажность DHT11 на {pin} (%)",
  "blocks.sensors.dhtHum.tip": "Относительная влажность воздуха — от 0 до 100 %.",
  "blocks.sensors.ultrasonic": "расстояние (см), Trig {TRIG}, Echo {ECHO}",
  "blocks.sensors.ultrasonic.tip":
    "HC-SR04 посылает звуковую волну и ждёт её возврата. По этому времени вычисляется расстояние.",

  /* Chiqish */
  "blocks.output.ledOn": "зажечь светодиод на {pin}",
  "blocks.output.ledOn.tip": "Светодиод — диод, излучающий свет. Блок сам настраивает режим пина.",
  "blocks.output.ledOff": "погасить светодиод на {pin}",
  "blocks.output.ledOff.tip": "Перестаёт подавать напряжение на пин — светодиод гаснет.",
  "blocks.output.ledBrightness": "яркость светодиода на {pin} — {VALUE}",
  "blocks.output.ledBrightness.tip":
    "0 — выключен, 255 — максимально ярко. Работает только на пинах ШИМ (со знаком ~).",
  "blocks.output.rgbColor": "цвет RGB-светодиода ({RPIN},{GPIN},{BPIN} · {COMMON}) К{R} З{G} С{B}",
  "blocks.output.rgbColor.tip":
    "Смешивает три цвета и даёт любой оттенок. У светодиода с общим анодом значение подаётся наоборот — блок делает это сам.",
  "blocks.output.buzzerTone": "издать на зуммере {pin} звук {FREQ} Гц",
  "blocks.output.buzzerTone.tip": "Чем выше частота, тем тоньше звук. 1000 Гц — обычный «бип».",
  "blocks.output.buzzerOff": "выключить зуммер на {pin}",
  "blocks.output.buzzerOff.tip": "Останавливает звук.",
  "blocks.output.buzzerBeep": "зуммер {pin} бипнет на {FREQ} Гц в течение {MS} мс",
  "blocks.output.buzzerBeep.tip": "Включает звук, ждёт и выключает — готовый «бип» в одном блоке.",
  "blocks.output.relayOn": "включить реле на {pin}",
  "blocks.output.relayOn.tip":
    "Реле — электронный ключ. Через него включают мощные приборы: лампу или мотор.",
  "blocks.output.relayOff": "выключить реле на {pin}",
  "blocks.output.relayOff.tip": "Возвращает контакт реле в исходное положение.",

  /* Motorlar */
  "blocks.motors.servoWrite": "повернуть серво на {pin} на {ANGLE}°",
  "blocks.motors.servoWrite.tip":
    "Серводвигатель поворачивается от 0° до 180° и удерживает этот угол.",
  "blocks.motors.dcForward": "мотор вперёд ({IN1}, {IN2})",
  "blocks.motors.dcForward.tip":
    "Управляет двумя пинами направления драйвера L298N: один HIGH, другой LOW.",
  "blocks.motors.dcBack": "мотор назад ({IN1}, {IN2})",
  "blocks.motors.dcBack.tip":
    "Пины направления меняются местами — мотор крутится в обратную сторону.",
  "blocks.motors.dcStop": "остановить мотор ({IN1}, {IN2})",
  "blocks.motors.dcStop.tip": "Оба пина направления в LOW — мотор останавливается.",
  "blocks.motors.dcSpeed": "скорость мотора {SPEED} (пин {EN})",
  "blocks.motors.dcSpeed.tip":
    "Пин ENA/ENB драйвера L298N задаёт скорость: 0 — стоит, 255 — максимум.",

  /* Ekran */
  "blocks.display.lcdPrint": "вывести на LCD {TEXT} ({PINS})",
  "blocks.display.lcdPrint.tip":
    "Выводит текст с позиции курсора. LCD состоит из 16 столбцов и 2 строк.",
  "blocks.display.lcdValue": "вывести на LCD значение {VALUE} ({PINS})",
  "blocks.display.lcdValue.tip": "Выводит на экран значение датчика или переменной.",
  "blocks.display.lcdCursor": "поставить курсор LCD в столбец {COL}, строку {ROW} ({PINS})",
  "blocks.display.lcdCursor.tip": "Счёт начинается с 0: первый столбец — 0, первая строка — 0.",
  "blocks.display.lcdClear": "очистить LCD ({PINS})",
  "blocks.display.lcdClear.tip": "Стирает весь текст с экрана и возвращает курсор в начало.",

  /* Komponentga bog'langan bloklar */
  "blocks.component.ledOn": "зажечь {NODE}",
  "blocks.component.ledOn.tip":
    "Светодиод — диод, излучающий свет. Пин берётся из схемы: перенесёте светодиод на другой пин — код изменится сам.",
  "blocks.component.ledOff": "погасить {NODE}",
  "blocks.component.ledOff.tip": "Перестаёт подавать напряжение на выбранный светодиод.",
  "blocks.component.ledBrightness": "яркость {NODE} — {VALUE}",
  "blocks.component.ledBrightness.tip":
    "0 — выключен, 255 — максимально ярко. Светодиод должен быть подключён к пину ШИМ (~).",
  "blocks.component.rgbColor": "цвет {NODE} К{R} З{G} С{B}",
  "blocks.component.rgbColor.tip":
    "Смешивает красный, зелёный и синий свет. Все три пина должны быть ШИМ.",
  "blocks.component.buzzerTone": "издать на {NODE} звук {FREQ} Гц",
  "blocks.component.buzzerTone.tip": "Зуммер — элемент, издающий звук.",
  "blocks.component.buzzerOff": "выключить {NODE}",
  "blocks.component.buzzerOff.tip": "Останавливает звук.",
  "blocks.component.relayOn": "включить {NODE}",
  "blocks.component.relayOn.tip": "Реле — электронный ключ: включает и выключает мощный прибор.",
  "blocks.component.relayOff": "выключить {NODE}",
  "blocks.component.relayOff.tip": "Возвращает контакт реле в исходное положение.",
  "blocks.component.light": "значение {NODE}",
  "blocks.component.light.tip":
    "Читает с аналогового датчика значение от 0 до 1023. Пин берётся из схемы.",
  "blocks.component.tmp36": "температура {NODE} (°C)",
  "blocks.component.tmp36.tip": "Переводит напряжение TMP36 в градусы Цельсия.",
  "blocks.component.pir": "{NODE} обнаружил движение",
  "blocks.component.pir.tip": "Датчик PIR чувствует движение тёплого тела.",
  "blocks.component.button": "{NODE} нажата",
  "blocks.component.button.tip":
    "Читает из схемы, как подключена кнопка: если к земле — используется внутренний pull-up.",
  "blocks.component.dhtTemp": "температура {NODE} (°C)",
  "blocks.component.dhtTemp.tip": "DHT11 — датчик, измеряющий температуру и влажность вместе.",
  "blocks.component.dhtHum": "влажность {NODE} (%)",
  "blocks.component.dhtHum.tip": "Относительная влажность воздуха — от 0 до 100 %.",
  "blocks.component.ultrasonic": "расстояние до {NODE} (см)",
  "blocks.component.ultrasonic.tip":
    "HC-SR04 посылает звуковую волну и ждёт её возврата. Пины Trig и Echo берутся из схемы.",
  "blocks.component.servoWrite": "повернуть {NODE} на {ANGLE}°",
  "blocks.component.servoWrite.tip":
    "Серводвигатель поворачивается от 0° до 180° и удерживает это положение.",
  "blocks.component.lcdPrint": "вывести на {NODE} {TEXT}",
  "blocks.component.lcdPrint.tip":
    "Выводит текст на экран. Все шесть пинов читаются из схемы — вручную указывать не нужно.",
  "blocks.component.lcdValue": "вывести на {NODE} значение {VALUE}",
  "blocks.component.lcdValue.tip": "Выводит на экран значение датчика или переменной.",
  "blocks.component.lcdCursor": "поставить курсор {NODE} в столбец {COL}, строку {ROW}",
  "blocks.component.lcdCursor.tip": "Счёт начинается с 0.",
  "blocks.component.lcdClear": "очистить {NODE}",
  "blocks.component.lcdClear.tip": "Стирает текст с экрана и возвращает курсор в начало.",

  /* Boshqaruv — vaqt */
  "blocks.control.waitSeconds": "ждать {seconds} с",
  "blocks.control.waitSeconds.tip": "Ничего не делает указанное время.",
  "blocks.control.waitMillis": "ждать {ms} мс",
  "blocks.control.waitMillis.tip": "1000 миллисекунд = 1 секунда.",
  "blocks.control.waitMicros": "ждать {us} мкс",
  "blocks.control.waitMicros.tip":
    "Очень короткая пауза. 1000 микросекунд = 1 миллисекунда. Нужна для датчиков.",

  /* Ogohlantirishlar */
  "blocks.warn.orphan":
    "Этот блок не внутри «Когда Arduino запускается» или «Всегда повторять» — он не выполнится.",
  "blocks.warn.duplicateStart":
    "Блоков «Когда Arduino запускается» больше одного. Использован только первый.",
  "blocks.warn.duplicateForever":
    "Блоков «Всегда повторять» больше одного. Использован только первый.",
  "blocks.warn.emptySlot": "Поле «{slot}» пустое — вместо него использовано {fallback}.",
  "blocks.warn.serialBeginMissing":
    "Блоки Serial используются, но блок «открыть Serial» не поставлен — в setup() автоматически добавлено Serial.begin({baud}).",
  "blocks.warn.missingVariable":
    "Блок не ссылается на переменную — выберите её в разделе «Переменные».",
  "blocks.warn.componentMissing": "Блок не ссылается на компонент схемы — выберите его из списка.",
  "blocks.warn.componentPinMissing":
    "Пин «{pin}» компонента не подключён к Arduino — в коде временно использован запасной пин.",

  /* Sxema tekshiruvi */
  "blocks.issue.componentMissing": "Компонент, на который ссылается блок, не найден в схеме.",
  "blocks.issue.componentWrongType": "Компонент в схеме не подходит для этого блока.",
  "blocks.issue.pinNotConnected": "{component}: пин «{pin}» не подключён к Arduino.",
  "blocks.issue.notPwm": "{pin} — не ШИМ-пин, для выхода «{slot}» нужен пин со знаком ~.",
  "blocks.issue.noPower": "{component}: не подключено 5 В (VCC).",
  "blocks.issue.noGround": "{component}: не подключена земля (GND).",
  "blocks.issue.serialPinConflict":
    "Пин D{pin} занят под Serial (RX/TX) — его нельзя использовать вместе с блоками Serial.",
  "blocks.issue.motorNeedsDriver":
    "Мотор постоянного тока подключён напрямую к пину Arduino. Тока Arduino не хватит — добавьте драйвер, например L298N.",

  /* Interfeys */
  "blocks.ui.mode.block": "Блоки",
  "blocks.ui.mode.code": "Код",
  "blocks.ui.mode.split": "Вместе",
  "blocks.ui.level.beginner": "Начальный",
  "blocks.ui.level.advanced": "Расширенный",
  "blocks.ui.levelGroup": "Уровень блоков",
  "blocks.ui.categories": "Категории блоков",
  "blocks.ui.canvas": "Рабочая область блоков. Стрелками перемещается выбранный блок.",
  "blocks.ui.language": "Язык блоков",
  "blocks.ui.selected": "Блок выбран",
  "blocks.ui.title": "Программирование",
  "blocks.ui.generated": "Сгенерированный код Arduino",
  "blocks.ui.emptyWorkspace":
    "Перетащите сюда блок из категории слева. Начните с блока «Когда Arduino запускается».",
  "blocks.ui.deleteHint": "Перетащите блок обратно в палитру — он удалится",
  "blocks.ui.undo": "Отменить",
  "blocks.ui.redo": "Вернуть",
  "blocks.ui.clear": "Очистить рабочую область",
  "blocks.ui.zoomIn": "Увеличить",
  "blocks.ui.zoomOut": "Уменьшить",
  "blocks.ui.zoomReset": "Сбросить масштаб",
  "blocks.ui.zoomFit": "Вместить блоки в экран",
  "blocks.ui.duplicate": "Дублировать",
  "blocks.ui.delete": "Удалить",
  "blocks.ui.codeModeWarning":
    "Написанный вручную код может не вернуться в блоки автоматически. Продолжить в режиме кода?",
  "blocks.ui.codeModeContinue": "Продолжить в режиме кода",
  "blocks.ui.codeModeCancel": "Отмена",

  /* O'zgaruvchilar paneli */
  "blocks.ui.vars.title": "Переменные",
  "blocks.ui.vars.create": "Создать переменную",
  "blocks.ui.vars.namePlaceholder": "имя, например schet",
  "blocks.ui.vars.add": "Добавить",
  "blocks.ui.vars.cancel": "Отмена",
  "blocks.ui.vars.rename": "Переименовать",
  "blocks.ui.vars.remove": "Удалить",
  "blocks.ui.vars.empty": "Переменных пока нет. Создайте их кнопкой ниже.",
  "blocks.ui.vars.error.empty": "Имя не может быть пустым.",
  "blocks.ui.vars.error.invalid":
    "Имя должно начинаться с латинской буквы или _ и состоять только из букв, цифр и _.",
  "blocks.ui.vars.error.reserved": "Это имя занято языком Arduino — выберите другое.",
  "blocks.ui.vars.error.duplicate": "Переменная с таким именем уже есть.",
  "blocks.ui.vars.error.limit": "Достигнут предел количества переменных.",
};

/* ─────────────────────────── Inglizcha ─────────────────────────── */

const en: Messages = {
  /* Kategoriyalar */
  "blocks.category.events": "Start",
  "blocks.category.control": "Control",
  "blocks.category.pins": "Arduino pins",
  "blocks.category.logic": "Logic",
  "blocks.category.math": "Math",
  "blocks.category.variables": "Variables",
  "blocks.category.sensors": "Sensors",
  "blocks.category.output": "Output",
  "blocks.category.motors": "Motors",
  "blocks.category.display": "Display",
  "blocks.category.serial": "Serial",
  "blocks.category.functions": "Functions",

  /* Boshlanish */
  "blocks.events.onStart": "when Arduino starts",
  "blocks.events.onStart.tip":
    "The blocks inside run once, when the board powers on. This is setup() in Arduino code.",
  "blocks.events.forever": "forever",
  "blocks.events.forever.tip":
    "The blocks inside repeat over and over without stopping. This is loop() in Arduino code.",

  /* Pinlar */
  "blocks.pins.pinMode": "set pin {pin} to {mode}",
  "blocks.pins.pinMode.tip":
    "Tells the board what a pin is for: OUTPUT sends a signal, INPUT reads one.",
  "blocks.pins.digitalWrite": "set {pin} to {level}",
  "blocks.pins.digitalWrite.tip":
    "Puts voltage on the pin (HIGH = 5 V) or removes it (LOW = 0 V). This is how an LED lights up.",
  "blocks.pins.digitalRead": "value of pin {pin}",
  "blocks.pins.digitalRead.tip": "Is there voltage on the pin: 1 if yes, 0 if no.",
  "blocks.pins.analogRead": "analog value of {pin}",
  "blocks.pins.analogRead.tip":
    "Reads the voltage on an analog input as a number from 0 to 1023. 0 = 0 V, 1023 = 5 V.",
  "blocks.pins.analogWrite": "set {pin} power to {VALUE}",
  "blocks.pins.analogWrite.tip":
    "Uses PWM to give a «half voltage» from 0 to 255: an LED glows dimmer, a motor spins slower.",

  /* Mantiq */
  "blocks.logic.if": "if {IF}",
  "blocks.logic.if.tip":
    "If the condition holds, the blocks inside run; otherwise they are skipped.",
  "blocks.logic.ifElse": "if {IF}",
  "blocks.logic.ifElse.tip":
    "If the condition holds the first part runs, otherwise the «else» part runs.",
  "blocks.logic.else": "else",
  "blocks.logic.compare": "{A} {OP} {B}",
  "blocks.logic.compare.tip":
    "Compares two numbers and answers yes or no. For example: light < 500.",
  "blocks.logic.andOr": "{A} {OP} {B}",
  "blocks.logic.andOr.tip":
    "&& is true when both conditions hold; || is true when at least one holds.",
  "blocks.logic.not": "not {A}",
  "blocks.logic.not.tip": "Flips a condition: true becomes false, false becomes true.",
  "blocks.logic.boolean": "{VAL}",
  "blocks.logic.boolean.tip": "A ready-made condition value: true or false.",

  /* Matematika */
  "blocks.math.number": "{NUM}",
  "blocks.math.number.tip": "A plain number. It fits into any value slot.",
  "blocks.math.arithmetic": "{A} {OP} {B}",
  "blocks.math.arithmetic.tip":
    "Does arithmetic on two numbers. % is the remainder after division (7 % 3 = 1).",
  "blocks.math.random": "random number from {FROM} to {TO}",
  "blocks.math.random.tip": "Gives a different number each time — handy for games and animations.",
  "blocks.math.map": "map {VALUE} from {FROM_LOW}–{FROM_HIGH} to {TO_LOW}–{TO_HIGH}",
  "blocks.math.map.tip":
    "Stretches a number from one range into another. Use it to turn a sensor reading (0–1023) into PWM (0–255).",
  "blocks.math.minMax": "{OP} of {A} and {B}",
  "blocks.math.minMax.tip": "min returns the smaller value, max the larger one.",
  "blocks.math.constrain": "keep {VALUE} between {LOW} and {HIGH}",
  "blocks.math.constrain.tip":
    "Stops a number leaving its range: too small returns the low bound, too big the high bound.",

  /* O'zgaruvchilar */
  "blocks.variables.get": "{VAR}",
  "blocks.variables.get.tip": "Reads the value stored in a variable.",
  "blocks.variables.set": "set {VAR} to {VALUE}",
  "blocks.variables.set.tip": "Replaces the variable's old value with a new one.",
  "blocks.variables.change": "change {VAR} by {DELTA}",
  "blocks.variables.change.tip": "Adds to the current value. Write a negative number to subtract.",

  /* Serial */
  "blocks.serial.begin": "open Serial at {BAUD}",
  "blocks.serial.begin.tip":
    "Starts talking to the computer. It usually goes inside the «when Arduino starts» block.",
  "blocks.serial.print": "print {TEXT} to Serial",
  "blocks.serial.print.tip": "Prints text or a value without moving to a new line.",
  "blocks.serial.println": "print {TEXT} to Serial and start a new line",
  "blocks.serial.println.tip": "Prints text or a value; the next print starts on a new line.",

  /* Sensorlar */
  "blocks.sensors.ldr": "light level on {pin}",
  "blocks.sensors.ldr.tip":
    "An LDR is a light-sensitive resistor. The value is low in the dark and high in bright light (0–1023).",
  "blocks.sensors.pot": "potentiometer on {pin}",
  "blocks.sensors.pot.tip":
    "A potentiometer is a knob resistor. Turning it changes the value from 0 to 1023.",
  "blocks.sensors.tmp36": "temperature on {pin} (°C)",
  "blocks.sensors.tmp36.tip":
    "The TMP36 reports temperature as a voltage. This block converts it to degrees Celsius.",
  /* Boshlang'ich darajadagi soddaroq yorliqlar (§32). */
  "blocks.sensors.soil.beginner": "soil wetness {MODE} ({pin})",
  "blocks.sensors.ultrasonic.beginner": "how many cm the distance sensor sees ({TRIG}, {ECHO})",
  "blocks.output.rgbColor.beginner":
    "RGB LED colour: red {R}, green {G}, blue {B} ({RPIN} {GPIN} {BPIN}, {COMMON})",

  "blocks.sensors.soil": "soil moisture on {pin} ({MODE})",
  "blocks.sensors.soil.tip":
    "Measures how wet the soil is. In «0–100 %» mode the value is converted to a percentage.",
  "blocks.sensors.pir": "motion on {pin}",
  "blocks.sensors.pir.tip":
    "A PIR sensor detects a warm body (person or animal) moving nearby and reports it.",
  "blocks.sensors.button": "button on {pin} pressed ({MODE})",
  "blocks.sensors.button.tip":
    "With INPUT_PULLUP the board's internal resistor is used and a pressed button reads LOW. This block handles that for you.",
  "blocks.sensors.dhtTemp": "DHT11 temperature on {pin} (°C)",
  "blocks.sensors.dhtTemp.tip":
    "The DHT11 is a digital sensor that reads temperature and humidity.",
  "blocks.sensors.dhtHum": "DHT11 humidity on {pin} (%)",
  "blocks.sensors.dhtHum.tip": "Relative humidity of the air, from 0 to 100 %.",
  "blocks.sensors.ultrasonic": "distance (cm), Trig {TRIG}, Echo {ECHO}",
  "blocks.sensors.ultrasonic.tip":
    "The HC-SR04 sends a sound pulse and waits for the echo. The travel time gives the distance.",

  /* Chiqish */
  "blocks.output.ledOn": "turn on LED on {pin}",
  "blocks.output.ledOn.tip":
    "An LED is a light-emitting diode. This block sets the pin mode for you.",
  "blocks.output.ledOff": "turn off LED on {pin}",
  "blocks.output.ledOff.tip": "Stops sending voltage to the pin, so the LED goes dark.",
  "blocks.output.ledBrightness": "set LED on {pin} brightness to {VALUE}",
  "blocks.output.ledBrightness.tip":
    "0 is off, 255 is brightest. Works only on PWM pins (marked with ~).",
  "blocks.output.rgbColor": "RGB LED ({RPIN},{GPIN},{BPIN} · {COMMON}) colour R{R} G{G} B{B}",
  "blocks.output.rgbColor.tip":
    "Mixes three colours into any shade. On a common-anode LED the value is inverted — this block does that for you.",
  "blocks.output.buzzerTone": "play {FREQ} Hz on buzzer {pin}",
  "blocks.output.buzzerTone.tip":
    "The higher the frequency, the higher the pitch. 1000 Hz is a typical beep.",
  "blocks.output.buzzerOff": "turn off buzzer on {pin}",
  "blocks.output.buzzerOff.tip": "Stops the sound.",
  "blocks.output.buzzerBeep": "beep buzzer {pin} at {FREQ} Hz for {MS} ms",
  "blocks.output.buzzerBeep.tip":
    "Starts the sound, waits and stops it — a ready-made beep in one block.",
  "blocks.output.relayOn": "turn on relay on {pin}",
  "blocks.output.relayOn.tip":
    "A relay is an electronic switch. It turns bigger devices, like a lamp or motor, on and off.",
  "blocks.output.relayOff": "turn off relay on {pin}",
  "blocks.output.relayOff.tip": "Returns the relay contact to its resting position.",

  /* Motorlar */
  "blocks.motors.servoWrite": "turn servo on {pin} to {ANGLE}°",
  "blocks.motors.servoWrite.tip": "A servo motor turns from 0° to 180° and holds that angle.",
  "blocks.motors.dcForward": "motor forward ({IN1}, {IN2})",
  "blocks.motors.dcForward.tip":
    "Drives the two direction pins of an L298N: one HIGH, the other LOW.",
  "blocks.motors.dcBack": "motor backward ({IN1}, {IN2})",
  "blocks.motors.dcBack.tip": "The direction pins swap, so the motor spins the other way.",
  "blocks.motors.dcStop": "stop motor ({IN1}, {IN2})",
  "blocks.motors.dcStop.tip": "Both direction pins go LOW and the motor stops.",
  "blocks.motors.dcSpeed": "motor speed {SPEED} (pin {EN})",
  "blocks.motors.dcSpeed.tip":
    "The ENA/ENB pin of an L298N sets the speed: 0 is stopped, 255 is full speed.",

  /* Ekran */
  "blocks.display.lcdPrint": "print {TEXT} on LCD ({PINS})",
  "blocks.display.lcdPrint.tip":
    "Prints text starting at the cursor. The LCD has 16 columns and 2 rows.",
  "blocks.display.lcdValue": "print value {VALUE} on LCD ({PINS})",
  "blocks.display.lcdValue.tip": "Shows a sensor reading or a variable on the screen.",
  "blocks.display.lcdCursor": "move LCD cursor to column {COL}, row {ROW} ({PINS})",
  "blocks.display.lcdCursor.tip":
    "Counting starts at 0: the first column is 0 and the first row is 0.",
  "blocks.display.lcdClear": "clear LCD ({PINS})",
  "blocks.display.lcdClear.tip": "Wipes all text from the screen and moves the cursor home.",

  /* Komponentga bog'langan bloklar */
  "blocks.component.ledOn": "turn on {NODE}",
  "blocks.component.ledOn.tip":
    "An LED is a light-emitting diode. The pin comes from the circuit: move the LED to another pin and the code follows.",
  "blocks.component.ledOff": "turn off {NODE}",
  "blocks.component.ledOff.tip": "Stops sending voltage to the selected LED.",
  "blocks.component.ledBrightness": "set {NODE} brightness to {VALUE}",
  "blocks.component.ledBrightness.tip":
    "0 is off, 255 is brightest. The LED must be wired to a PWM pin (~).",
  "blocks.component.rgbColor": "set {NODE} colour to R{R} G{G} B{B}",
  "blocks.component.rgbColor.tip":
    "Mixes red, green and blue light. All three pins must be PWM pins.",
  "blocks.component.buzzerTone": "play {FREQ} Hz on {NODE}",
  "blocks.component.buzzerTone.tip": "A buzzer is a component that makes sound.",
  "blocks.component.buzzerOff": "turn off {NODE}",
  "blocks.component.buzzerOff.tip": "Stops the sound.",
  "blocks.component.relayOn": "turn on {NODE}",
  "blocks.component.relayOn.tip":
    "A relay is an electronic switch that turns a bigger device on and off.",
  "blocks.component.relayOff": "turn off {NODE}",
  "blocks.component.relayOff.tip": "Returns the relay contact to its resting position.",
  "blocks.component.light": "value of {NODE}",
  "blocks.component.light.tip":
    "Reads 0 to 1023 from an analog sensor. The pin comes from the circuit.",
  "blocks.component.tmp36": "temperature of {NODE} (°C)",
  "blocks.component.tmp36.tip": "Converts the TMP36 voltage into degrees Celsius.",
  "blocks.component.pir": "{NODE} detected motion",
  "blocks.component.pir.tip": "A PIR sensor detects a warm body moving nearby.",
  "blocks.component.button": "{NODE} is pressed",
  "blocks.component.button.tip":
    "Reads from the circuit how the button is wired: if it goes to ground, the internal pull-up is used.",
  "blocks.component.dhtTemp": "temperature of {NODE} (°C)",
  "blocks.component.dhtTemp.tip": "The DHT11 measures temperature and humidity together.",
  "blocks.component.dhtHum": "humidity of {NODE} (%)",
  "blocks.component.dhtHum.tip": "Relative humidity of the air, from 0 to 100 %.",
  "blocks.component.ultrasonic": "distance to {NODE} (cm)",
  "blocks.component.ultrasonic.tip":
    "The HC-SR04 sends a sound pulse and waits for the echo. Trig and Echo pins come from the circuit.",
  "blocks.component.servoWrite": "turn {NODE} to {ANGLE}°",
  "blocks.component.servoWrite.tip": "A servo motor turns from 0° to 180° and holds that position.",
  "blocks.component.lcdPrint": "print {TEXT} on {NODE}",
  "blocks.component.lcdPrint.tip":
    "Prints text on the screen. All six pins are read from the circuit — no need to type them.",
  "blocks.component.lcdValue": "print value {VALUE} on {NODE}",
  "blocks.component.lcdValue.tip": "Shows a sensor reading or a variable on the screen.",
  "blocks.component.lcdCursor": "move {NODE} cursor to column {COL}, row {ROW}",
  "blocks.component.lcdCursor.tip": "Counting starts at 0.",
  "blocks.component.lcdClear": "clear {NODE}",
  "blocks.component.lcdClear.tip": "Wipes the text from the screen and moves the cursor home.",

  /* Boshqaruv — vaqt */
  "blocks.control.waitSeconds": "wait {seconds} s",
  "blocks.control.waitSeconds.tip": "Does nothing for the given amount of time.",
  "blocks.control.waitMillis": "wait {ms} ms",
  "blocks.control.waitMillis.tip": "1000 milliseconds is 1 second.",
  "blocks.control.waitMicros": "wait {us} µs",
  "blocks.control.waitMicros.tip":
    "A very short pause. 1000 microseconds is 1 millisecond. Sensors need this.",

  /* Ogohlantirishlar */
  "blocks.warn.orphan":
    "This block is not inside «when Arduino starts» or «forever», so it will never run.",
  "blocks.warn.duplicateStart":
    "There is more than one «when Arduino starts» block. Only the first one was used.",
  "blocks.warn.duplicateForever":
    "There is more than one «forever» block. Only the first one was used.",
  "blocks.warn.emptySlot": "The «{slot}» slot is empty — {fallback} was used instead.",
  "blocks.warn.serialBeginMissing":
    "Serial blocks are used but no «open Serial» block was placed — Serial.begin({baud}) was added to setup() automatically.",
  "blocks.warn.missingVariable":
    "This block does not point at a variable — pick one in the «Variables» section.",
  "blocks.warn.componentMissing":
    "This block does not point at a circuit component — pick one from the list.",
  "blocks.warn.componentPinMissing":
    "The component's «{pin}» pin is not wired to the Arduino — a fallback pin was used in the code.",

  /* Sxema tekshiruvi */
  "blocks.issue.componentMissing": "The component this block points at is not in the circuit.",
  "blocks.issue.componentWrongType": "The circuit component does not match this block.",
  "blocks.issue.pinNotConnected": "{component}: the «{pin}» pin is not wired to the Arduino.",
  "blocks.issue.notPwm": "{pin} is not a PWM pin; the «{slot}» output needs a pin marked ~.",
  "blocks.issue.noPower": "{component}: 5 V (VCC) is not connected.",
  "blocks.issue.noGround": "{component}: ground (GND) is not connected.",
  "blocks.issue.serialPinConflict":
    "Pin D{pin} is reserved for Serial (RX/TX) and cannot be used together with Serial blocks.",
  "blocks.issue.motorNeedsDriver":
    "The DC motor is wired straight to an Arduino pin. The Arduino cannot supply enough current — add a driver such as an L298N.",

  /* Interfeys */
  "blocks.ui.mode.block": "Blocks",
  "blocks.ui.mode.code": "Code",
  "blocks.ui.mode.split": "Both",
  "blocks.ui.level.beginner": "Beginner",
  "blocks.ui.level.advanced": "Advanced",
  "blocks.ui.levelGroup": "Block level",
  "blocks.ui.categories": "Block categories",
  "blocks.ui.canvas": "Block workspace. Arrow keys move the selected block.",
  "blocks.ui.language": "Block language",
  "blocks.ui.selected": "Block selected",
  "blocks.ui.title": "Programming",
  "blocks.ui.generated": "Generated Arduino code",
  "blocks.ui.emptyWorkspace":
    "Drag a block here from a category on the left. Start with «when Arduino starts».",
  "blocks.ui.deleteHint": "Drop the block back on the palette to delete it",
  "blocks.ui.undo": "Undo",
  "blocks.ui.redo": "Redo",
  "blocks.ui.clear": "Clear the workspace",
  "blocks.ui.zoomIn": "Zoom in",
  "blocks.ui.zoomOut": "Zoom out",
  "blocks.ui.zoomReset": "Reset zoom",
  "blocks.ui.zoomFit": "Fit blocks on screen",
  "blocks.ui.duplicate": "Duplicate",
  "blocks.ui.delete": "Delete",
  "blocks.ui.codeModeWarning":
    "Hand-written code may not come back into blocks automatically. Continue in code mode?",
  "blocks.ui.codeModeContinue": "Continue in code mode",
  "blocks.ui.codeModeCancel": "Cancel",

  /* O'zgaruvchilar paneli */
  "blocks.ui.vars.title": "Variables",
  "blocks.ui.vars.create": "Create a variable",
  "blocks.ui.vars.namePlaceholder": "name, for example count",
  "blocks.ui.vars.add": "Add",
  "blocks.ui.vars.cancel": "Cancel",
  "blocks.ui.vars.rename": "Rename",
  "blocks.ui.vars.remove": "Delete",
  "blocks.ui.vars.empty": "No variables yet. Create one with the button below.",
  "blocks.ui.vars.error.empty": "The name cannot be empty.",
  "blocks.ui.vars.error.invalid":
    "The name must start with a Latin letter or _ and contain only letters, digits and _.",
  "blocks.ui.vars.error.reserved": "That name is reserved by the Arduino language — pick another.",
  "blocks.ui.vars.error.duplicate": "A variable with that name already exists.",
  "blocks.ui.vars.error.limit": "The variable limit has been reached.",
};

const TABLES: Record<BlockLocale, Messages> = { uz, ru, en };

/**
 * Faqat testlar uchun: jadvallarni solishtirish (§41).
 *
 * `blocks.test.ts` shu orqali «o'zbekchada bor, ruschada yo'q» kalitlarni
 * topadi. Tarjimani unutish — eng jim ketadigan xato: ekranda kalit
 * matni chiqadi, lekin hech kim shikoyat qilmaydi.
 */
export function messageKeysOf(locale: BlockLocale): string[] {
  return Object.keys(TABLES[locale]);
}

/**
 * Kalitni matnga aylantiradi.
 *
 * `{name}` ko'rinishidagi joy egallovchilar `params` dan to'ldiriladi.
 * Kalit topilmasa kalitning o'zi qaytadi — ekranda "blocks.foo.bar"
 * ko'rinishi tarjima yo'qolganini darhol bildiradi.
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: BlockLocale = "uz",
): string {
  const raw = TABLES[locale][key] ?? uz[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Shablondagi joy egallovchilar ro'yxati: `"{pin} ni {level} qil"` → `["pin","level"]`. */
export function templateSlots(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}

/**
 * Yorliqni matn va uya bo'laklariga ajratadi — blokni chizish uchun.
 *
 * `"{pin} ni {level} qil"` →
 *   [{text:""},{slot:"pin"},{text:" ni "},{slot:"level"},{text:" qil"}]
 * Bo'sh matn bo'laklari tashlab yuboriladi.
 */
export type LabelPart = { kind: "text"; text: string } | { kind: "slot"; name: string };

export function splitLabel(
  key: string,
  params?: Record<string, string | number>,
  locale: BlockLocale = "uz",
): LabelPart[] {
  const raw = t(key, params, locale);
  const parts: LabelPart[] = [];
  let last = 0;

  for (const match of raw.matchAll(/\{(\w+)\}/g)) {
    const index = match.index;
    if (index > last) parts.push({ kind: "text", text: raw.slice(last, index) });
    parts.push({ kind: "slot", name: match[1]! });
    last = index + match[0].length;
  }
  if (last < raw.length) parts.push({ kind: "text", text: raw.slice(last) });

  // Bo'sh joylar ATAYLAB saqlanadi: ular blokdagi so'zlarni bir-biridan
  // ajratib turadi ("13 ni HIGH qil", "13niHIGHqil" emas).
  return parts;
}
