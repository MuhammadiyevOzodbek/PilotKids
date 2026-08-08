"use client";

import { CATALOG } from "@/lib/virtual-lab/catalog";
import { sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, M } from "./model-kit";
import { BreadboardModel, type ModelProps } from "./models-boards";
import { ArduinoUnoModel } from "./models-uno";
import {
  BatteryModel,
  ButtonModel,
  BuzzerModel,
  CapacitorModel,
  DcMotorModel,
  Dht11Model,
  DiodeModel,
  JoystickModel,
  KeypadModel,
  L298nModel,
  LdrModel,
  LedModel,
  Lcd1602Model,
  MultimeterModel,
  PirModel,
  PotentiometerModel,
  RelayModel,
  ResistorModel,
  RgbLedModel,
  ServoModel,
  SevenSegmentModel,
  ShiftRegisterModel,
  SoilMoistureModel,
  TerminalModel,
  Tmp36Model,
  TransistorModel,
  UltrasonicModel,
} from "./models-parts";

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

  servo: ServoModel,
  "dc-motor": DcMotorModel,
  l298n: L298nModel,

  buzzer: BuzzerModel,
  lcd1602: Lcd1602Model,
  relay: RelayModel,
  "seven-segment": SevenSegmentModel,
  "shift-register": ShiftRegisterModel,

  battery: BatteryModel,
  "power-5v": () => <TerminalModel kind="power" />,
  ground: () => <TerminalModel kind="ground" />,

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
