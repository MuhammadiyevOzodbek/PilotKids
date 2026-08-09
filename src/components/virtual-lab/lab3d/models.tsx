"use client";

import { CATALOG } from "@/lib/virtual-lab/catalog";
import { sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, M } from "./model-kit";
import { BreadboardModel, type ModelProps } from "./models-boards";
import { ArduinoUnoModel } from "./models-uno";
import {
  ButtonModel,
  BuzzerModel,
  CapacitorModel,
  Dht11Model,
  DiodeModel,
  JoystickModel,
  KeypadModel,
  L298nModel,
  LdrModel,
  LedModel,
  MultimeterModel,
  PirModel,
  ResistorModel,
  RgbLedModel,
  SevenSegmentModel,
  ShiftRegisterModel,
  SoilMoistureModel,
  Tmp36Model,
  TransistorModel,
} from "./models-parts";
import { BatteryModel } from "./models-battery";
import { Lcd1602Model } from "./models-lcd";
import { DcMotorModel } from "./models-motor";
import { PotentiometerModel } from "./models-potentiometer";
import { PowerTerminalModel } from "./models-power";
import { RelayModel } from "./models-relay";
import { ServoMotorModel } from "./models-servo";
import { UltrasonicModel } from "./models-ultrasonic";

/**
 * Komponent turi → 3D model registri (§5).
 *
 * Model komponentning MANTIG'INI bilmaydi: unga faqat sozlamalar va
 * simulyator holati beriladi. Shu sababli modelni almashtirish (masalan
 * kelajakda GLTF ga o'tkazish) qolgan hech nimaga tegmaydi:
 *
 *     Circuit  →  Simulator  →  ModelProps  →  3D model
 */

type ModelComponent = (props: ModelProps) => React.ReactElement;

const REGISTRY: Record<string, ModelComponent> = {
  "arduino-uno": ArduinoUnoModel,
  breadboard: BreadboardModel,

  led: LedModel,
  "rgb-led": RgbLedModel,

  resistor: ResistorModel,
  diode: DiodeModel,
  capacitor: CapacitorModel,
  "npn-transistor": TransistorModel,
  "push-button": ButtonModel,
  potentiometer: PotentiometerModel,
  joystick: JoystickModel,
  "keypad-4x4": KeypadModel,

  ldr: LdrModel,
  tmp36: Tmp36Model,
  "soil-moisture": SoilMoistureModel,
  pir: PirModel,
  ultrasonic: UltrasonicModel,
  dht11: Dht11Model,

  servo: ServoMotorModel,
  "dc-motor": DcMotorModel,
  l298n: L298nModel,

  buzzer: BuzzerModel,
  lcd1602: Lcd1602Model,
  relay: RelayModel,
  "seven-segment": SevenSegmentModel,
  "shift-register": ShiftRegisterModel,

  battery: BatteryModel,
  "power-5v": () => <PowerTerminalModel kind="power" />,
  ground: () => <PowerTerminalModel kind="ground" />,

  multimeter: MultimeterModel,
};

/**
 * Registrda yo'q komponent uchun zaxira.
 *
 * Katalogga yangi komponent qo'shilsa, u 3D da MODELSIZ qolmaydi — o'z
 * o'lchamidagi oddiy korpus bo'lib chiziladi va pinlari baribir ishlaydi
 * (§34: «3D asset yo'qligi sababli komponentni tashlab ketma»).
 */
function FallbackModel({ type }: { type: string }) {
  const { w, d, h } = sizeOf(type);
  return (
    <group>
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={M.pcbGreen()} />
      <Box pos={[0, h + 0.01, 0]} size={[w * 0.8, 0.02, d * 0.6]} material={M.plasticBlack()} />
    </group>
  );
}

export function ComponentModel({ type, settings, runtime }: { type: string } & ModelProps) {
  const Model = REGISTRY[type];
  if (!Model) return <FallbackModel type={type} />;
  return <Model settings={settings} runtime={runtime} />;
}

/** Registrda modeli bor turlar. */
export function modelledTypes(): string[] {
  return Object.keys(REGISTRY);
}

/**
 * Katalogda bor, lekin o'z modeli YO'Q turlar.
 *
 * Test shu ro'yxat bo'shligini tekshiradi: katalogga yangi komponent
 * qo'shilsa, u 3D da zaxira korpus bilan chiqib ketmasin.
 */
export function missingModels(): string[] {
  return CATALOG.filter((component) => !REGISTRY[component.type]).map((c) => c.type);
}
