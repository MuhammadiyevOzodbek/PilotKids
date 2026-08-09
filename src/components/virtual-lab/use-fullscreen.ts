"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Berilgan elementni butun ekranga ochish.
 *
 * ── Nega alohida hook ───────────────────────────────────────────────────
 * Ikkala laboratoriya ham (2D ish stoli va 3D sahna) bir xil narsani
 * so'raydi, lekin brauzer API'si tekis emas: Safari hanuz `webkit`
 * prefiksini ishlatadi, `requestFullscreen()` esa `Promise` qaytarishi
 * ham, qaytarmasligi ham mumkin. Bu qirralar bitta joyda turadi, aks
 * holda har bir laboratoriyada o'z nusxasi bo'lardi va biri tuzatilganda
 * ikkinchisi eskiligicha qolardi.
 *
 * ── Nega holat brauzerdan o'qiladi ──────────────────────────────────────
 * `isFullscreen` tugma bosilganda EMAS, `fullscreenchange` hodisasida
 * yangilanadi. Foydalanuvchi `Esc` bosib chiqishi yoki rejim boshqa
 * sabab bilan tugashi mumkin — o'z holatimizga ishonsak, tugma
 * "chiqish" deb turaverardi.
 */

/** Safari prefikslari — standart tiplarda yo'q. */
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

/** Hozir to'liq ekranda turgan element (yoki `null`). */
function activeElement(): Element | null {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export interface Fullscreen {
  isFullscreen: boolean;
  toggle: () => void;
}

export function useFullscreen(
  ref: RefObject<HTMLElement | null>,
  /** Brauzer rad etsa foydalanuvchiga aytish uchun (masalan toast). */
  onError?: (message: string) => void,
): Fullscreen {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggle = useCallback(() => {
    const element = ref.current as FullscreenElement | null;
    if (!element) return;

    const doc = document as FullscreenDocument;
    const result = activeElement()
      ? (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
      : (element.requestFullscreen?.() ?? element.webkitRequestFullscreen?.());

    // Rad etilgan `Promise` konsolda "unhandled rejection" bo'lib chiqmasin.
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => onError?.("To'liq ekran rejimini ochib bo'lmadi"));
    }
  }, [ref, onError]);

  useEffect(() => {
    /*
     * To'liq ekranda BIZNING element turibdimi.
     *
     * Shunchaki "kimdir to'liq ekranda" degan tekshiruv yetarli emas:
     * sahifadagi boshqa element (masalan video) ochilganda ham tugma
     * «chiqish» ko'rinishiga o'tib qolardi. Ichki element (kanvas) o'zi
     * so'ragan holat ham hisobga olinadi — shuning uchun `contains`.
     */
    const sync = () => {
      const active = activeElement();
      const root = ref.current;
      setIsFullscreen(
        active !== null && root !== null && (active === root || root.contains(active)),
      );
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, [ref]);

  return { isFullscreen, toggle };
}
