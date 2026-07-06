"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Komponent mijozda mount bo'lganini hydration-xavfsiz aniqlaydi.
 * Serverda `false`, mijozda `true` qaytaradi — setState-in-effect'siz.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
