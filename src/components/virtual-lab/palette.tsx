"use client";

import { useMemo, useState } from "react";
import { Blocks, Search } from "lucide-react";
import { CATALOG, CATEGORY_LABELS } from "@/lib/virtual-lab/catalog";
import { useCircuitStore } from "@/stores/virtual-lab";
import { ComponentSymbol } from "./symbols";

/**
 * Komponentlar kutubxonasi (chap panel).
 *
 * Komponentni ish maydoniga ikki xil yo'l bilan qo'shish mumkin: sudrab
 * tashlash yoki shunchaki bosish (planshet va sichqonchasiz ishlash uchun).
 */
export function ComponentPalette() {
  const [query, setQuery] = useState("");
  const addNode = useCircuitStore((s) => s.addNode);

  const { groups, total } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? CATALOG.filter(
          (c) =>
            c.name.toLowerCase().includes(needle) || c.description.toLowerCase().includes(needle),
        )
      : CATALOG;

    const byCategory = new Map<string, typeof CATALOG>();
    for (const c of filtered) {
      const list = byCategory.get(c.category);
      if (list) list.push(c);
      else byCategory.set(c.category, [c]);
    }
    return { groups: [...byCategory.entries()], total: filtered.length };
  }, [query]);

  return (
    <div className="vlab-panel">
      <div className="vlab-panel-head">
        <span className="vlab-panel-title">
          <Blocks size={15} />
          Komponentlar
        </span>
        <span className="vlab-spacer" />
        <span className="vlab-count">{total}</span>
      </div>

      <div className="vlab-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish…"
          aria-label="Komponent qidirish"
        />
      </div>

      <div className="vlab-panel-body">
        {groups.length === 0 && (
          <p className="vlab-empty">
            Hech narsa topilmadi.
            <br />
            Boshqa so&apos;z bilan qidirib ko&apos;ring.
          </p>
        )}

        {groups.map(([category, items]) => (
          <div key={category} className="vlab-cat">
            <div className="vlab-cat-title">{CATEGORY_LABELS[category] ?? category}</div>

            <div className="vlab-items">
              {items.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/pilotkids-component", c.type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  // Sudrab bo'lmasa — bosib qo'shiladi (markazga yaqin joyga).
                  onClick={() =>
                    addNode(c.type, 120 + Math.random() * 160, 120 + Math.random() * 120)
                  }
                  title={c.description}
                  className="vlab-item"
                >
                  <span className="vlab-item-thumb">
                    {/*
                     * O'lcham nisbatni saqlagan holda plitkaga sig'diriladi.
                     * Ilgari bu yerda qat'iy `scale(.32)` turardi — katta
                     * komponentlar (plata, breadboard) plitkadan chiqib
                     * ketib, chetlari kesilardi.
                     */}
                    {(() => {
                      const scale = Math.min(38 / c.width, 28 / c.height);
                      return (
                        <ComponentSymbol
                          type={c.type}
                          width={c.width * scale}
                          height={c.height * scale}
                          settings={c.defaults}
                          // Bunday o'lchamda mayda yozuvlar o'qilmaydi.
                          showDetail={false}
                          detail="low"
                        />
                      );
                    })()}
                  </span>
                  <span className="vlab-item-name">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
