"use client";

import { useEffect, useState } from "react";

export interface DeviceState {
  /** Mount bo'ldimi (hydration xavfsizligi) */
  ready: boolean;
  /** Kengligi ≥ 1024px */
  isDesktop: boolean;
  /** prefers-reduced-motion yoqilganmi */
  reducedMotion: boolean;
}

/**
 * Qurilma va harakat afzalliklarini kuzatadi. Aqlli 3D gate uchun ishlatiladi:
 * 3D faqat `isDesktop && !reducedMotion` bo'lsa yuklanadi.
 */
export function useDevice(): DeviceState {
  const [state, setState] = useState<DeviceState>({
    ready: false,
    isDesktop: false,
    reducedMotion: false,
  });

  useEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () =>
      setState({
        ready: true,
        isDesktop: desktopMq.matches,
        reducedMotion: motionMq.matches,
      });

    update();
    desktopMq.addEventListener("change", update);
    motionMq.addEventListener("change", update);
    return () => {
      desktopMq.removeEventListener("change", update);
      motionMq.removeEventListener("change", update);
    };
  }, []);

  return state;
}
