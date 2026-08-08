/**
 * Motor bloklari (§13).
 *
 * Servo obyekti PIN bo'yicha yaratiladi (`api.declareObject`), shuning uchun:
 *   • bitta pinga ulangan o'nta `servo.write` bloki BITTA `Servo servo1;`
 *     va BITTA `servo1.attach(9);` beradi;
 *   • ikki xil pin — `servo1` va `servo2`, ikkita alohida `attach`.
 *
 * DC motor katalogdagi `l298n` drayveri bilan ishlaydi: Arduino pinini
 * to'g'ridan-to'g'ri motorga ulash mumkin emas (tok yetmaydi), shuning
 * uchun bloklar IN1/IN2 va ENA pinlarini so'raydi. Sxemadagi ulanishni
 * `validation.ts` tekshiradi (§34).
 */

import { DIGITAL_PIN_OPTIONS, PWM_PIN_OPTIONS } from "../pins";
import { type BlockDefinition, type BlockNode, type GenApi } from "../types";

/** Servo obyekti — pin bo'yicha bitta, nomi `servo1`, `servo2` … */
function servoObject(block: BlockNode, api: GenApi): string {
  const pin = api.field(block, "pin");
  return api.declareObject(
    `servo:${pin}`,
    "servo",
    (name) => ({
      include: "Servo.h",
      global: `Servo ${name};`,
      setup: `${name}.attach(${pin});`,
    }),
    { numbered: true },
  );
}

/** Yo'nalish pinlarini `setup()` da chiqishga o'giradi. */
function directionPins(block: BlockNode, api: GenApi): { in1: string; in2: string } {
  const in1 = api.field(block, "IN1");
  const in2 = api.field(block, "IN2");
  api.setupLine(`pinMode:${in1}`, `pinMode(${in1}, OUTPUT);`);
  api.setupLine(`pinMode:${in2}`, `pinMode(${in2}, OUTPUT);`);
  return { in1, in2 };
}

/** Ikkala yo'nalish bloki uchun umumiy uyalar. */
const DIRECTION_SLOTS = [
  { kind: "dropdown", name: "IN1", options: DIGITAL_PIN_OPTIONS, default: "8" },
  { kind: "dropdown", name: "IN2", options: DIGITAL_PIN_OPTIONS, default: "7" },
] as const;

export const MOTOR_BLOCKS: BlockDefinition[] = [
  {
    type: "motor_servo_write",
    category: "motors",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["Servo"],
    messageKey: "blocks.motors.servoWrite",
    tooltipKey: "blocks.motors.servoWrite.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "9" },
      {
        kind: "value",
        name: "ANGLE",
        check: "number",
        inline: { kind: "number", default: 90 },
      },
    ],
    generateStatement: (block, api) => [
      `${servoObject(block, api)}.write(${api.value(block, "ANGLE")});`,
    ],
  },
  {
    type: "motor_dc_forward",
    category: "motors",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.motors.dcForward",
    tooltipKey: "blocks.motors.dcForward.tip",
    slots: [...DIRECTION_SLOTS],
    generateStatement: (block, api) => {
      const { in1, in2 } = directionPins(block, api);
      return [`digitalWrite(${in1}, HIGH);`, `digitalWrite(${in2}, LOW);`];
    },
  },
  {
    type: "motor_dc_back",
    category: "motors",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.motors.dcBack",
    tooltipKey: "blocks.motors.dcBack.tip",
    slots: [...DIRECTION_SLOTS],
    generateStatement: (block, api) => {
      const { in1, in2 } = directionPins(block, api);
      return [`digitalWrite(${in1}, LOW);`, `digitalWrite(${in2}, HIGH);`];
    },
  },
  {
    type: "motor_dc_stop",
    category: "motors",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.motors.dcStop",
    tooltipKey: "blocks.motors.dcStop.tip",
    slots: [...DIRECTION_SLOTS],
    generateStatement: (block, api) => {
      const { in1, in2 } = directionPins(block, api);
      return [`digitalWrite(${in1}, LOW);`, `digitalWrite(${in2}, LOW);`];
    },
  },
  {
    type: "motor_dc_speed",
    category: "motors",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.motors.dcSpeed",
    tooltipKey: "blocks.motors.dcSpeed.tip",
    slots: [
      // ENA/ENB tezlikni PWM bilan beradi — PWM bo'lmagan pin ishlamaydi.
      { kind: "dropdown", name: "EN", options: PWM_PIN_OPTIONS, default: "6" },
      { kind: "value", name: "SPEED", check: "number", inline: { kind: "number", default: 200 } },
    ],
    generateStatement: (block, api) => {
      const en = api.field(block, "EN");
      api.setupLine(`pinMode:${en}`, `pinMode(${en}, OUTPUT);`);
      return [`analogWrite(${en}, ${api.value(block, "SPEED")});`];
    },
  },
];
