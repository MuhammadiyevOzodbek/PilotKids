/**
 * Blok tizimining yagona kirish nuqtasi.
 *
 * Ro'yxatga olish AYNAN shu yerda, bir marta bajariladi. Ta'rif modullari
 * o'zini o'zi ro'yxatga olmaydi: unda import tartibiga qarab registr goh
 * to'la, goh bo'sh bo'lardi va testlar tasodifiy yiqilardi.
 */

import { registerBlocks } from "./registry";
import { EVENT_BLOCKS } from "./defs/events";
import { CONTROL_BLOCKS } from "./defs/control";
import { ARDUINO_BLOCKS } from "./defs/arduino";

let registered = false;

function registerAll() {
  if (registered) return;
  registered = true;
  registerBlocks(EVENT_BLOCKS);
  registerBlocks(CONTROL_BLOCKS);
  registerBlocks(ARDUINO_BLOCKS);
}

registerAll();

export * from "./types";
export * from "./registry";
export * from "./workspace";
export * from "./generator";
export * from "./messages";
export * from "./pins";
