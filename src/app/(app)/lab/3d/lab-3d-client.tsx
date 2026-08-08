"use client";

import { useEffect } from "react";
/*
 * Kod muharriri 2D laboratoriya bilan BITTA komponent (`CodeEditor`) va u
 * `.vlab-panel`, `.vlab-panel-head`, `--vlab-head` kabi uslublarга tayanadi.
 * Shu bois uning uslublari ham yuklanishi SHART — aks holda muharrir
 * uslubsiz, sarlavhasi qatorga yoyilgan holda chiqadi.
 */
import "@/components/virtual-lab/virtual-lab.css";
import { Lab3D } from "@/components/virtual-lab/lab3d/lab-3d";
import { useProjectStore } from "@/stores/virtual-lab";

/**
 * 3D laboratoriya sahifasining mijoz qismi.
 *
 * `.lab3d-page` qobig'i 2D dagi `.vlab-page` bilan bir xil vazifani
 * bajaradi: ilova sarlavhasini yashiradi va laboratoriyaga butun ekran
 * balandligini beradi. Qoidalar `lab-3d.css` da.
 */
export function Lab3DClient() {
  const hydrate = useProjectStore((s) => s.hydrate);

  // Saqlangan loyihalar `localStorage` da — ular faqat brauzerda o'qiladi.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="lab3d-page">
      <Lab3D />
    </div>
  );
}
