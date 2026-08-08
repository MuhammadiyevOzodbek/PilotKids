# Blokli dasturlash — Faza 2–5 promptlari

Faza 1 tugagan. Quyidagi to‘rt prompt **alohida-alohida** Claude Code sessiyasiga
beriladi (tartib bilan: 2 → 3 → 4 → 5). Har biri mustaqil — yangi sessiya repo’ni
bilmasa ham ishlay oladi.

> Bu fayl faqat ish uchun. Fazalar tugagach o‘chirib tashlash mumkin.

---

## UMUMIY KONTEKST (har bir promptga allaqachon kiritilgan)

Agar promptni qo‘lda tahrirlasangiz, quyidagilar **albatta** qolsin:

- Runtime qo‘llab-quvvatlaydigan Arduino API ro‘yxati (generator faqat shulardan
  foydalanishi mumkin).
- «Blok ta’riflari ichida o‘zbekcha satr yozilmaydi, faqat i18n kaliti» qoidasi.
- Tekshiruv buyruqlari.

---

# ▶ FAZA 2 PROMPTI

```
Sen PilotKids loyihasida ishlaysan: /Users/muhammadiyevozodbek/Desktop/PilotKids Next JS
Next.js 16 + React 19 + TypeScript + zustand + vitest. Interfeys tili — o'zbekcha.
Kod izohlari ham o'zbekcha yoziladi (mavjud fayllardagi uslubga qara).

MUHIM: AGENTS.md ni o'qi. Bu Next.js versiyasi sening bilimingdan farq qilishi
mumkin — kerak bo'lsa node_modules/next/dist/docs/ dagi qo'llanmani o'qi.

== NIMA BOR ==

Brauzerda ishlaydigan 2D Arduino virtual laboratoriya. Elektr modeli
(electrical.ts), nodal solver (solver.ts), netlist, C/C++ parser va interpretator
(simulator.ts) allaqachon ishlaydi. BULARGA TEGMA.

Bloklardan Arduino kodi hosil qiladigan tizim FAZA 1 da qurilgan:

src/lib/virtual-lab/blocks/
  types.ts       — BlockDefinition, BlockNode, BlockWorkspace, GenApi, SlotDef, PREC
  messages.ts    — i18n jadvali (uz to'la; ru/en bo'sh) + t(), splitLabel()
  registry.ts    — registerBlocks(), getBlockDefinition(), blocksInCategory()
  workspace.ts   — model (ulash/uzish/o'chirish/nusxalash), Zod, sanitizeWorkspace
  generator.ts   — generateProgram(ws, {circuit}) → {code, libraries, warnings}
  pins.ts        — DIGITAL_PIN_OPTIONS, PWM_PIN_OPTIONS, ANALOG_PIN_OPTIONS
  defs/events.ts, defs/control.ts, defs/arduino.ts
  index.ts       — HAMMA ta'rif shu yerda ro'yxatga olinadi (registerAll)
  blocks.test.ts — 32 test

src/stores/blocks.ts                              — zustand (undo/redo, zoom, rejim)
src/components/virtual-lab/blocks/                — UI: block-editor/canvas/view/palette/dnd + blocks.css

Mavjud 8 blok: event_on_start, event_forever, control_wait_seconds,
control_wait_millis, control_wait_micros, pin_mode, pin_digital_write,
pin_digital_read.

== BLOK QANDAY YOZILADI ==

BlockDefinition maydonlari:
  type, category, shape, level, messageKey, tooltipKey?, slots,
  output?, requiresLibrary?, generateStatement?, generateValue?, validate?

shape: "hat" | "statement" | "value" | "boolean"
level: "beginner" | "advanced"
category: events|control|pins|logic|math|variables|sensors|output|motors|display|serial|functions

slots — SlotDef massivi:
  { kind:"dropdown", name, options: DropdownOption[] | (ctx)=>DropdownOption[], default }
  { kind:"number", name, default, min?, max?, step? }
  { kind:"text", name, default, maxLength? }
  { kind:"value", name, check:"number"|"boolean"|"string"|"any",
    inline: {kind:"number",default} | {kind:"text",default} | null }
  { kind:"statement", name }

messageKey — messages.ts dagi kalit. Shablонда {uyaNomi} joy egallovchilari
uyalarга mos keladi: "blocks.pins.digitalWrite": "{pin} ni {level} qil"

GenApi (generatorlarga beriladi):
  api.field(block, name)              — ro'yxat/son/matn uyasining qiymati
  api.value(block, name, maxPrec?)    — qiymat uyasi → ifoda matni (qavslar avtomatik)
  api.textValue(block, name)          — matn ifodasi (qo'shtirnoq bilan)
  api.body(block, name)               — ichki stekning kod qatorlari
  api.include("Servo.h")              — #include, bir marta
  api.global(key, lines)              — global e'lon, key bo'yicha dedup
  api.setupLine(key, lines)           — setup() boshiga qator
  api.helper(key, lines)              — yordamchi funksiya
  api.uniqueName(base)                — takrorlanmaydigan C++ identifikatori
  api.warn({code, messageKey, params?, blockId?})
  api.circuit, api.variables

generateStatement → string[] (qatorlar)
generateValue → { code: string, prec: Precedence }  (PREC.ATOM, PREC.ADD, PREC.REL, ...)

== QATTIQ QOIDALAR ==

1. Blok ta'riflari va UI komponentlari ichida O'ZBEKCHA SATR YOZILMAYDI.
   Faqat messages.ts dagi i18n kaliti. Yangi matn → messages.ts ga kalit qo'sh.
2. `any` ishlatilmaydi.
3. Testlar faqat .ts fayllarda (vitest.config.mts: include = src/**/*.test.ts).
   .tsx test yozma — u umuman ishga tushmaydi.
4. Generator DETERMINISTIK: bir xil ish maydoni → bir xil matn.
5. Generator FAQAT quyidagi API'ni chiqarishi mumkin (simulator.ts shularni
   biladi, boshqasi runtime'da yiqiladi):
     pinMode digitalWrite digitalRead analogRead analogWrite
     delay delayMicroseconds millis micros
     map constrain abs min max sq sqrt pow round floor ceil log exp sin cos tan
     random randomSeed pulseIn tone noTone shiftOut
     bitRead bit bitWrite bitSet bitClear highByte lowByte
     Serial.begin Serial.print Serial.println Serial.write
     Serial.available Serial.read Serial.readString Serial.parseInt
   Obyektlar: Servo (.attach .write), LiquidCrystal lcd(rs,e,d4,d5,d6,d7)
   (.begin .clear .home .setCursor .print .write), DHT dht(pin, DHT11)
   (.readTemperature .readHumidity)
   YO'Q: servo.read(), lcd.blink(), lcd.cursor(), dht.readSensor() va h.k.
6. electrical.ts, solver.ts, netlist.ts, simulator.ts, parser.ts, wiring,
   breadboard — TEGMA.

== SENING VAZIFANG: FAZA 2 ==

Quyidagi kategoriyalarni to'ldir. Har biri uchun defs/ ga alohida modul yarat
va index.ts da ro'yxatga ol.

A) defs/logic.ts — Mantiq
   - logic_if            (statement, ichida DO steki)
   - logic_if_else       (statement, DO va ELSE steklari)
   - logic_compare       (boolean; ro'yxat: < > == != <= >=)
   - logic_and_or        (boolean; ro'yxat: && ||)
   - logic_not           (boolean)
   - logic_boolean       (boolean; TRUE/FALSE)
   Qavslar PREC orqali to'g'ri qo'yilsin: `a < 5 && b > 2` ortiqcha qavssiz,
   `(a + 1) * 2` esa qavs bilan.

B) defs/math.ts — Matematika
   - math_number         (value; oddiy son literali)
   - math_arithmetic     (value; + - * / %)
   - math_random         (value → random(min, max))
   - math_map            (value → map(qiymat, 0, 1023, 0, 255))
   - math_min_max        (value; min/max ro'yxati)
   - math_constrain      (value)

C) defs/variables.ts — O'zgaruvchilar
   - variables_get       (value; ro'yxat ish maydonidagi o'zgaruvchilardan —
                          options funksiyasi ctx.variables dan quriladi)
   - variables_set       (statement → `qiymat = ifoda;`)
   - variables_change    (statement → `qiymat += 1;`)
   Nom tekshiruvi workspace.ts dagi checkVariableName() da tayyor
   (C++ band so'zlari rad etiladi). UI da o'zgaruvchi yaratish/nomini
   o'zgartirish/o'chirish paneli qo'sh (store'da addVar/renameVar/removeVar bor).
   E'lon generator.ts ning assemble() qismida allaqachon chiqadi — tekshir.

D) defs/analog.ts (yoki pins.ts ga qo'sh) — Analog
   - pin_analog_read     (value → analogRead(A0); ANALOG_PIN_OPTIONS ishlat)
   - pin_analog_write    (statement → analogWrite(9, 128); FAQAT PWM_PIN_OPTIONS)

E) defs/serial.ts — Serial
   - serial_begin        (statement → Serial.begin(9600))
   - serial_print        (statement → Serial.print(...))
   - serial_println      (statement → Serial.println(...))
   MUHIM (§25): agar Serial bloki ishlatilgan, lekin serial_begin yo'q bo'lsa,
   generator setup() ga `Serial.begin(9600);` ni O'ZI qo'shsin VA ogohlantirish
   bersin. Buni api.setupLine + api.warn bilan qil.

== UI ISHLARI ==

- C-shaklli bloklar (if/if-else) chizilishi kerak. blocks.css da
  `.blk-substack` va `.blk-substack-foot` tayyor turibdi, lekin hali
  ishlatilmaydi — shu qism bilan `if` bloki to'g'ri ko'rinsin.
- boolean bloklar olti burchakli (`.blk-shape-boolean` bor).
- O'zgaruvchilar paneli: palitraning "O'zgaruvchilar" kategoriyasida
  "O'zgaruvchi yarat" tugmasi.

== TESTLAR (blocks.test.ts ga qo'sh yoki yangi *.test.ts) ==

Kamida:
- if + logic_compare + digitalWrite → kutilgan C++ matn (belgima-belgi)
  Misol: agar [A0 < 500] bo'lsa D9 HIGH, aks holda D9 LOW
- math_map → `map(analogRead(A0), 0, 1023, 0, 255)`
- ortiqcha qavs yo'qligi: `a < 5 && b > 2`
- kerakli qavs bor: `(a + 1) * 2`
- variables: e'lon + o'zlashtirish + oshirish, band nom rad etiladi
- Serial blok ishlatilib begin yo'q → setup() da Serial.begin(9600) VA warning
- HAR BIR yangi test hosil bo'lgan kodni parseSketch() bilan tekshirsin:
  `import { parseSketch } from "../parser"` → `expect(parseSketch(code).ok).toBe(true)`

== TUGAGANDA ==

npm run typecheck && npm run lint && npm test && npm run build
Hammasi yashil bo'lishi shart. Keyin qisqa hisobot ber:
qaysi bloklar qo'shildi, nechta, qanday kod hosil qiladi, testlar natijasi,
cheklovlar.

Faza 3 ga O'TMA — to'xta va menga xabar ber.
```

---

# ▶ FAZA 3 PROMPTI

```
[FAZA 2 PROMPTIDAGI "NIMA BOR", "BLOK QANDAY YOZILADI" va "QATTIQ QOIDALAR"
bo'limlarini shu yerga ko'chir — ular o'zgarmaydi. Faqat "Mavjud bloklar"
ro'yxatini Faza 2 dan keyingi holatga yangila.]

== SENING VAZIFANG: FAZA 3 — sensorlar, motorlar, ekran ==

Har bir blok uchun defs/ ga modul yarat va index.ts da ro'yxatga ol.

A) defs/sensors.ts
   - sensor_ldr          (value) — LDR yorug'lik qiymati, analogRead
   - sensor_pot          (value) — potensiometr 0–1023
   - sensor_tmp36        (value) — TMP36 harorati °C da.
                          Formula: (analogRead(pin) * 5.0 / 1024.0 - 0.5) * 100
                          Buni api.helper() bilan alohida funksiya qilib chiqar.
   - sensor_soil         (value) — tuproq namligi. Blok sozlamasi:
                          "Raw 0–1023" yoki "Foiz 0–100" (dropdown).
                          Foiz rejimida map() ishlatilsin.
   - sensor_pir          (boolean) — harakat aniqlandimi (digitalRead == HIGH)
   - sensor_button       (boolean) — tugma bosilganmi.
                          MUHIM: INPUT_PULLUP bilan ulangan tugma LOW da
                          bosilgan bo'ladi. Blokda pull-up rejimi hisobga olinsin.
   - sensor_dht_temp     (value) — dht.readTemperature()
   - sensor_dht_hum      (value) — dht.readHumidity()
                          Ikkalasi ham: api.include("DHT.h"),
                          api.global(...) → `DHT dht(PIN, DHT11);`,
                          api.setupLine(...) → `dht.begin();`
                          BIR NECHTA DHT bo'lsa nomlar to'qnashmasin (api.uniqueName).
   - sensor_ultrasonic   (value) — masofa sm da.
                          api.helper() bilan yordamchi funksiya generatsiya qil:
                            long okuMasofa(int trig, int echo) {
                              digitalWrite(trig, LOW);
                              delayMicroseconds(2);
                              digitalWrite(trig, HIGH);
                              delayMicroseconds(10);
                              digitalWrite(trig, LOW);
                              return pulseIn(echo, HIGH) / 58;
                            }
                          TRIG/ECHO pinlari blok inspektorida dropdown orqali
                          tanlansin (avtomatik aniqlash — Faza 4).
                          setup() da ikkala pinMode chiqsin.

B) defs/output.ts
   - output_buzzer_tone   (statement → tone(pin, 1000))
   - output_buzzer_off    (statement → noTone(pin))
   - output_buzzer_beep   (statement → tone(pin,1000); delay(200); noTone(pin);)
   - output_led_on/off    (beginner darajadagi bloklar; hozircha pin dropdown,
                           komponentга bog'lash Faza 4 da)
   - output_led_brightness(statement → analogWrite(pin, 128); FAQAT PWM pinlar)
   - output_rgb_color     (statement; R/G/B uyalari 0–255.
                           Katalogdagi rgb-led umumiy katodli — analogWrite
                           qiymati to'g'ridan-to'g'ri beriladi. Umumiy anod
                           bo'lsa 255-qiymat. Blok sozlamasida tanlansin.)
   - output_relay_on/off  (statement → digitalWrite(pin, HIGH/LOW))

C) defs/motors.ts
   - motor_servo_write    (statement → servo1.write(90))
                          api.include("Servo.h"),
                          api.global → `Servo servo1;`,
                          api.setupLine → `servo1.attach(9);`
                          BIR NECHTA SERVO → servo1, servo2 … (api.uniqueName).
                          Nomlar pin bo'yicha barqaror bo'lsin: bir xil pin →
                          bir xil obyekt, ikki marta e'lon qilinmasin.
   - motor_dc_forward / motor_dc_back / motor_dc_stop / motor_dc_speed
                          Katalogdagi l298n komponenti bilan ishlasin
                          (pinlarini src/lib/virtual-lab/catalog.ts dan o'qi).

D) defs/display.ts
   - display_lcd_print    (statement → lcd.print("Salom"))
   - display_lcd_cursor   (statement → lcd.setCursor(0, 1))
   - display_lcd_clear    (statement → lcd.clear())
   - display_lcd_value    (statement → lcd.print(ifoda))
                          api.include("LiquidCrystal.h"),
                          api.global → `LiquidCrystal lcd(12, 11, 5, 4, 3, 2);`,
                          api.setupLine → `lcd.begin(16, 2);`
                          Pinlar blok sozlamasidan olinsin (Faza 4 da sxemadan).

== KUTUBXONA TIZIMI (§36) ==

BlockDefinition.requiresLibrary ni to'ldir: Servo → ["Servo"],
LCD → ["LiquidCrystal"], DHT → ["DHT"]. generateProgram() natijasidagi
`libraries` massivi to'g'ri to'lishi kerak (allaqachon include'dan hisoblanadi —
tekshir va kerak bo'lsa requiresLibrary'ni ham hisobga ol).

== TESTLAR ==

Kamida:
- DHT11 + LCD → #include <DHT.h> VA #include <LiquidCrystal.h> bittadan
- HC-SR04 → yordamchi funksiya TO'G'RI generatsiya bo'ldi, bir marta
- Servo → attach setup() da, write loop() da
- Ikkita servo → servo1 va servo2, ikkita alohida attach
- Bir xil blok ikki marta → include va global e'lon BITTA marta
- TMP36 → yordamchi funksiya + to'g'ri formula
- Tuproq namligi foiz rejimida → map(...) chiqadi
- Har bir test parseSketch() bilan tekshirilsin

== TUGAGANDA ==

npm run typecheck && npm run lint && npm test && npm run build
Hisobot ber va TO'XTA.
```

---

# ▶ FAZA 4 PROMPTI

```
[FAZA 2 PROMPTIDAGI "NIMA BOR", "BLOK QANDAY YOZILADI" va "QATTIQ QOIDALAR"
bo'limlarini ko'chir. Mavjud bloklar ro'yxatini Faza 3 dan keyingi holatga
yangila.]

== SENING VAZIFANG: FAZA 4 — komponentga bog'langan bloklar, tekshiruv, saqlash ==

Bu eng muhim faza: bloklar SXEMANI ko'rishi kerak.

A) COMPONENT-AWARE BLOKLAR (§33)

   Yangi fayl: src/lib/virtual-lab/blocks/components.ts

   Vazifasi: sxemadagi komponentlardan dropdown ro'yxati qurish va
   komponentning Arduino pinini topish.

   Mavjud yordamchilar (src/lib/virtual-lab/netlist.ts):
     buildNetlist(circuit) → Netlist
     boardPinFor(netlist, nodeId, pinId) → number | null
        (rezistor orqali ham topadi — LED odatda rezistor orqali ulanadi)
     isGrounded(netlist, nodeId, pinId) → boolean
     isPowered(netlist, nodeId, pinId) → boolean
     netFor, supplyVoltage

   Komponent pin ID'lari src/lib/virtual-lab/catalog.ts da. Misollar:
     led: anode, cathode
     rgb-led: r, common, g, b
     push-button: a, b
     servo: vcc, signal, gnd
     buzzer: plus, minus
     lcd1602: gnd, vcc, rs, e, d4, d5, d6, d7
     relay: vcc, gnd, in, nc, com, no
     dc-motor: t1, t2
   Qolganlarini catalog.ts dan O'QI, taxmin qilma.

   Qoidalar:
   - Blok komponentga NOMI bo'yicha emas, TURG'UN nodeId bo'yicha ishora qilsin.
   - Dropdown ro'yxati SlotDef.options ning funksiya ko'rinishi orqali
     quriladi: (ctx) => ctx.circuit.nodes.filter(...).map(...)
     Yorliq: "LED #1", "Servo #2" kabi.
   - Komponent sxemadan olib tashlansa, blok "Servo1 topilmadi" holatiga
     o'tsin. UI da bu uchun `.blk-field-missing` sinfi tayyor (blocks.css).
   - Kod generatsiyasida pin sxemadan aniqlansin (boardPinFor). Topilmasa
     api.warn() bilan ogohlantirilsin va xavfsiz qiymat (masalan 13) chiqsin.

   Faza 2–3 dagi pin dropdownli bloklarni komponent tanlash bilan ALMASHTIRMA —
   ikkalasi ham qolsin: beginner darajada komponent bloki, advanced darajada
   xom pin bloki.

B) WIRING VALIDATION (§34)

   Yangi fayl: src/lib/virtual-lab/blocks/validation.ts

   Bu generatordan MUTLAQO ALOHIDA subsystem bo'lsin — generator kod yozadi,
   validator sxemani tekshiradi. Bir-birini chaqirmasin.

   export function validateWorkspace(ws, {circuit, netlist}): BlockIssue[]

   BlockIssue turi types.ts da tayyor: {blockId, severity, messageKey, params?}

   Tekshiruvlar:
   - Blok ishora qilayotgan komponent sxemada bormi.
   - LED bloki: LED Arduino chiqish piniga ulanganmi (boardPinFor != null).
   - HC-SR04: VCC, GND, TRIG, ECHO to'rttasi ham ulanganmi.
   - DHT11 / servo / rele: VCC va GND ulanganmi.
   - PWM talab qiladigan blok PWM bo'lmagan pinga tushganmi.
   - D0/D1 ishlatilgan + Serial bloklari bor → ogohlantirish (RX/TX bilan
     to'qnashadi).
   - DC motor to'g'ridan-to'g'ri Arduino piniga ulangan → ogohlantirish
     (tok yetmaydi, drayver kerak).

   Natija BlockEditor da ko'rsatilsin: xato blok qizil ramka bilan
   belgilansin va ro'yxatda chiqsin. Mavjud `.blk-warnings` ro'yxatini
   kengaytir yoki yangi panel qil.

C) SAQLASH / YUKLASH (§29)

   HOZIR ISH MAYDONI SAQLANMAYDI — sahifa yangilansa bloklar yo'qoladi.
   Shuni tuzat.

   src/lib/virtual-lab/storage.ts da SavedProject va savedProjectSchema bor.
   Unga qo'sh:
     blocks?: BlockWorkspace          (ixtiyoriy!)
     blockWorkspaceVersion?: number

   MUHIM: maydon IXTIYORIY bo'lishi shart. Eski saqlangan loyihalarda u yo'q
   va ular ochilishda buzilmasligi kerak. Zod sxemasida .optional() ishlat va
   loadProjects() dagi "har bir loyihani alohida tekshirish" mantig'ini buzma.

   blockWorkspaceSchema va sanitizeWorkspace() workspace.ts da tayyor —
   qayta yozma, o'shani ishlat.

   Workbench (src/components/virtual-lab/workbench.tsx) da:
   - handleSave: blok ish maydonini ham saqlasin
   - handleOpenProject / handleImportFile: replaceWorkspace() bilan tiklasin
   - handleNewProject: ish maydonini tozalasin
   Store'da replaceWorkspace() allaqachon bor.

   Eksport/import JSON'da ham blok maydoni bo'lsin.

D) UNDO/REDO VA KLAVIATURA (§30)

   Store'da undo/redo bor, lekin klaviatura yorliqlari yo'q.
   BlockEditor ichida:
     Ctrl/Cmd+Z → undo, Ctrl/Cmd+Shift+Z → redo
     Delete/Backspace → tanlangan blokni o'chirish
     Ctrl/Cmd+D → nusxalash (store'da duplicate() bor)
     Ctrl/Cmd+C / Ctrl/Cmd+V → nusxalash/joylash (store'ga clipboard qo'sh)
   DIQQAT: workbench.tsx da GLOBAL keydown handler bor va u Space bilan
   simulyatsiyani boshlaydi, Delete bilan sxema komponentini o'chiradi.
   Blok muharriri ochiq bo'lganda u aralashmasligi kerak — hodisani
   to'g'ri to'xtat yoki workbench handlerida ko'rinishni tekshir.

E) ZOOM / PAN (§31)

   - "Bloklarga sig'dirish" HAQIQIY ishlasin (hozir shunchaki 100% qaytaradi).
     Ildiz bloklarning DOM o'lchamlaridan chegara to'rtburchagini hisobla.
   - Touch qo'llab-quvvatlash: bir barmoq — sudrash, ikki barmoq — masshtab.
     block-canvas.tsx pointer event'lardan foydalanadi, shuning uchun asos bor.

== TESTLAR ==

Kamida:
- Komponent bog'lanishi: sxemada LED D8 ga ulangan → blok digitalWrite(8, HIGH)
  chiqarsin (buildNetlist + boardPinFor bilan haqiqiy sxema qurib tekshir)
- Komponent o'chirilgan → validateWorkspace() xato bersin
- LED Arduino piniga ulanmagan → ogohlantirish
- HC-SR04 da ECHO ulanmagan → xato
- PWM bo'lmagan pinga analogWrite → xato
- Saqlash/yuklash: ish maydoni JSON orqali aylanib qaytganda AYNAN o'shani bersin
- ESKI loyiha (blocks maydoni YO'Q) ochilganda buzilmasin — bu test MAJBURIY
- Undo/redo: 10 amal → 10 marta undo → boshlang'ich holat

== TUGAGANDA ==

npm run typecheck && npm run lint && npm test && npm run build
Hisobot ber va TO'XTA.
```

---

# ▶ FAZA 5 PROMPTI

```
[FAZA 2 PROMPTIDAGI "NIMA BOR", "BLOK QANDAY YOZILADI" va "QATTIQ QOIDALAR"
bo'limlarini ko'chir. Mavjud bloklar ro'yxatini Faza 4 dan keyingi holatga
yangila.]

== SENING VAZIFANG: FAZA 5 — i18n, sayqal, testlar, tezlik ==

A) I18N (§41)

   src/lib/virtual-lab/blocks/messages.ts da `uz` jadvali to'la, `ru` va `en`
   BO'SH. Ikkalasini ham to'ldir.

   - HAR BIR kalit tarjima qilinsin. Tushib qolgan kalit bo'lmasin.
   - Til tanlash: store'ga `locale` qo'sh va t() ga uzat. BlockEditor
     asboblar panelida til tanlagich bo'lsin.
   - TEKSHIRUV TESTI YOZ: uz jadvalidagi har bir kalit ru va en da ham
     borligini tekshiradigan test. Bu kelajakda tarjima unutilishining
     oldini oladi.
   - Kod ichida qolgan o'zbekcha satrlarni top va kalitga ko'chir.
     Qidiruv: blok ta'riflari va blocks/ ostidagi komponentlar.

   MUHIM: workbench.tsx va boshqa ESKI laboratoriya komponentlarida
   o'zbekcha matnlar bor — ularga TEGMA, bu faza faqat blok tizimi haqida.

B) BEGINNER / ADVANCED DARAJALAR (§32)

   BlockDefinition.level maydoni bor va palitra filtri ishlaydi. Tekshir:
   - Beginner: LED, sensor, buzzer, servo, LCD bloklari + boshlanish + kutish
   - Advanced: pinMode, digitalWrite, analogRead, o'zgaruvchilar, mantiq,
     funksiyalar
   Kerak bo'lsa mavjud bloklarning level'ini to'g'rila.

   Beginner rejimida blok matnlari SODDAROQ bo'lsin. Misol: advanced'da
   "13 ni HIGH qil", beginner'da "13-pin LEDni yoq". Buni ikkinchi i18n
   kaliti bilan qil (messageKey + messageKeyBeginner), blok mantiqini
   ikkiga bo'lma.

C) ACCESSIBILITY (§40)

   - Klaviatura navigatsiyasi: Tab bilan bloklar orasida yurish,
     Enter/Space bilan tanlash, o'q tugmalari bilan ko'chirish.
   - Har bir blokda tooltip (tooltipKey allaqachon bor — hammasi to'ldirilganini
     tekshir).
   - Sensorlar uchun qisqa tushuntirish: "Servo motor 0° dan 180° gacha
     buriladi", "LED — yorug'lik chiqaruvchi diod".
   - aria-label va role'lar to'g'ri. Blok stekі uchun role="tree" yoki
     shunga o'xshash semantika ko'rib chiq.
   - Kontrast: blocks.css dagi kategoriya ranglari oq matn bilan WCAG AA
     (4.5:1) ni qanoatlantirsinmi — tekshir va kerak bo'lsa to'g'rila.

D) TEZLIK (§39)

   HOZIRGI MUAMMO: BlockView React context orqali butun `workspace` ni oladi,
   shuning uchun har o'zgarishda HAMMA blok qayta chiziladi. Katta ish
   maydonida bu sekinlashtiradi.

   Tuzat:
   - Context'ni ikkiga bo'l: o'zgarmaydigan callback'lar alohida, holat
     alohida. Yoki blokni id bo'yicha zustand selector bilan olsin.
   - React.memo ni MA'NOLI qil (hozir foydasiz).
   - Generator natijasini keshla: ish maydoni o'zgarmagan bo'lsa qayta
     hisoblama.
   - Palitra ro'yxati memoized bo'lsin.
   - O'lchov: 100+ blokli ish maydonida sudrash silliq bo'lsin.

   MUHIM: simulyatsiya sikli (workbench.tsx dagi requestAnimationFrame)
   blok muharriridan MUSTAQIL qolsin. Blok o'zgarishi simulyatorni qayta
   ishga tushirmasin.

E) SAYQAL (§42)

   - Dark/light mavzu ikkalasida ham tekshir (loyihada mavzu tokenlari bor).
   - Noto'g'ri blok qizil holatda ko'rinsin.
   - Sudrash animatsiyasi silliq, soya kuchli bo'lmasin.
   - Tor ekranda (mobil) ishlashini tekshir.

F) TO'LIQ TEST QOPLAMI (§37)

   Mavjud testlarni ko'rib chiq va yetishmayotganini qo'sh:
   - Har bir blok turi uchun generator testi
   - Barcha kategoriyalar uchun kamida bitta integratsiya testi
   - i18n to'liqligi testi (yuqorida)
   - Serializatsiya: har bir blok turi saqlanib-tiklanadi
   - Validation testlari
   - Component binding testlari

== YAKUNIY TEKSHIRUV ==

npm run typecheck && npm run lint && npm test && npm run build

Keyin QO'LDA brauzerda tekshir (npm run dev, /lab/onlayn):
  1. Bloklar sudralib ulanadi
  2. LED Blink bloklar bilan ishlaydi va simulyatsiyada LED yonib-o'chadi
  3. Sensor bloki qiymat o'qiydi
  4. Servo bloki motorni buradi
  5. LCD bloki matn chiqaradi
  6. DHT11 ishlaydi
  7. HC-SR04 ishlaydi
  8. Sxemadan komponent o'chirilsa blok ogohlantiradi
  9. Loyiha saqlanadi va qayta ochilganda bloklar joyida
 10. Kod rejimi ishlaydi, eski loyihalar buzilmaydi
 11. Konsolda kritik xato yo'q

== YAKUNIY HISOBOT ==

1. Qaysi blok kategoriyalar qo'shildi
2. Nechta blok yaratildi
3. Blok → Arduino generator qanday ishlaydi
4. Qaysi komponentlar component-aware
5. Qaysi Arduino kutubxonalar qo'llab-quvvatlanadi
6. Qaysi fayllar yaratildi/o'zgardi
7. Test natijalari
8. Hozirgi cheklovlar
9. Keyingi bosqich uchun tavsiyalar
```

---

## Eslatma

Har bir promptning boshiga Faza 2 dagi **«NIMA BOR» + «BLOK QANDAY YOZILADI» +
«QATTIQ QOIDALAR»** bo‘limlarini ko‘chirishni unutmang — 3, 4, 5-fazalarda
ular `[…ko‘chir]` deb belgilangan. Ularsiz yangi sessiya runtime API
cheklovini bilmaydi va simulyatorda ishlamaydigan kod generatsiya qiladi.
