import type { ComponentDefinition, ComponentPin } from "./types";

export interface Point {
  x: number;
  y: number;
}

/** Pin markazining node ichidagi piksel koordinatasi, rotation bilan birga. */
export function pinPoint(def: ComponentDefinition, pin: ComponentPin, rotation: number): Point {
  const x = pin.x * def.width;
  const y = pin.y * def.height;
  const normalized = ((rotation % 360) + 360) % 360;
  if (normalized === 0) return { x, y };

  const rad = (normalized * Math.PI) / 180;
  const cx = def.width / 2;
  const cy = def.height / 2;
  const dx = x - cx;
  const dy = y - cy;

  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}
