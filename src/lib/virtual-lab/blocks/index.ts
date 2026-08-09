/**
 * Blok tizimining yagona kirish nuqtasi.
 *
 * Ro'yxatga olish AYNAN shu yerda, bir marta bajariladi. Ta'rif modullari
 * o'zini o'zi ro'yxatga olmaydi: unda import tartibiga qarab registr goh
 * to'la, goh bo'sh bo'lardi va testlar tasodifiy yiqilardi.
 */

import { registerBlocks, resetRegistry } from "./registry";
import { EVENT_BLOCKS } from "./defs/events";
import { CONTROL_BLOCKS } from "./defs/control";
import { ARDUINO_BLOCKS } from "./defs/arduino";
import { ANALOG_BLOCKS } from "./defs/analog";
import { LOGIC_BLOCKS } from "./defs/logic";
import { MATH_BLOCKS } from "./defs/math";
import { VARIABLE_BLOCKS } from "./defs/variables";
import { SERIAL_BLOCKS } from "./defs/serial";
import { SENSOR_BLOCKS } from "./defs/sensors";
import { OUTPUT_BLOCKS } from "./defs/output";
import { MOTOR_BLOCKS } from "./defs/motors";
import { DISPLAY_BLOCKS } from "./defs/display";
import { COMPONENT_BLOCKS } from "./defs/component-blocks";

let registered = false;

function registerAll() {
  if (registered) return;
  registered = true;
  /*
   * Toza holatdan boshlaymiz.
   *
   * `registered` bayrog'i SHU modulning nusxasiga tegishli, registr esa
   * boshqa modulda turadi. Dasturlash muhitida bu ikkisi ajralib qolishi
   * mumkin: `blocks/index.ts` qayta baholanadi (bayroq — yangi, ya'ni
   * `false`), `registry.ts` esa keshda qoladi (ro'yxat — to'la). Natijada
   * birinchi `registerBlocks` chaqiruvi «Blok turi takrorlandi:
   * event_on_start» deb yiqilardi va butun laboratoriya ochilmasdi.
   */
  resetRegistry();
  registerBlocks(EVENT_BLOCKS);
  registerBlocks(CONTROL_BLOCKS);
  registerBlocks(LOGIC_BLOCKS);
  registerBlocks(ARDUINO_BLOCKS);
  registerBlocks(ANALOG_BLOCKS);
  registerBlocks(MATH_BLOCKS);
  registerBlocks(VARIABLE_BLOCKS);
  // Komponentga bog'langan bloklar palitrada XOM pinli bloklardan OLDIN
  // turadi: boshlang'ich foydalanuvchi birinchi ko'radigan blok «LED #1 ni
  // yoq» bo'lishi kerak, «13 ni HIGH qil» emas (§32).
  registerBlocks(COMPONENT_BLOCKS);
  registerBlocks(SENSOR_BLOCKS);
  registerBlocks(OUTPUT_BLOCKS);
  registerBlocks(MOTOR_BLOCKS);
  registerBlocks(DISPLAY_BLOCKS);
  registerBlocks(SERIAL_BLOCKS);
}

registerAll();

export * from "./types";
export * from "./registry";
export * from "./workspace";
export * from "./generator";
export * from "./messages";
export * from "./pins";
export * from "./components";
export * from "./validation";
