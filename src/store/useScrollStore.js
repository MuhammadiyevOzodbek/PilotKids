import { create } from 'zustand'

// Scroll bosqichi — UZLUKSIZ float qiymat: 2.4 = 2-bosqich markazidan 3-bosqich
// markazigacha 40% yo'l bosilgan. 3D sahna (SceneController) buni useFrame ichida
// getState() bilan o'qiydi — React re-render bo'lmaydi (eng ko'p uchraydigan
// scroll+3D performance xatosining oldini oladi).
export const useScrollStore = create((set) => ({
  stage: 0,
  setStage: (stage) => set({ stage }),
}))
