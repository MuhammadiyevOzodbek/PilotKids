"use client";

import { useMemo } from "react";
import {
  BLOCK_CATEGORIES,
  blocksInCategory,
  t,
  type BlockCategoryId,
} from "@/lib/virtual-lab/blocks";
import { useBlocksStore } from "@/stores/blocks";
import { BlockPreview } from "./block-view";

/**
 * Blok palitrasi (§2).
 *
 * Kategoriya ro'yxati DOIM to'liq ko'rinadi — hozircha bo'sh bo'lganlari
 * ham. Sabab: bola qaysi imkoniyatlar borligini oldindan ko'radi va
 * "bu yerda yana nima bo'lishi mumkin?" degan savol tug'iladi. Bo'sh
 * kategoriya o'chirilgan holatda ko'rsatiladi, ya'ni bosilmaydi.
 *
 * Palitra ayni paytda savat vazifasini ham bajaradi: ish maydonidan
 * sudralib kelingan blok shu yerga tashlansa o'chadi (`blk-palette`
 * sinfini `block-canvas` qidiradi).
 */

export function BlockPalette({
  onPickBlock,
}: {
  /** Palitradagi blokdan sudrash boshlanganda. */
  onPickBlock: (type: string, event: React.PointerEvent) => void;
}) {
  const level = useBlocksStore((s) => s.level);
  const category = useBlocksStore((s) => s.category);
  const setCategory = useBlocksStore((s) => s.setCategory);
  const setLevel = useBlocksStore((s) => s.setLevel);

  const counts = useMemo(() => {
    const map = new Map<BlockCategoryId, number>();
    for (const id of BLOCK_CATEGORIES) map.set(id, blocksInCategory(id, level).length);
    return map;
  }, [level]);

  const blocks = useMemo(
    () => blocksInCategory(category as BlockCategoryId, level),
    [category, level],
  );

  return (
    <div className="blk-palette">
      <div className="blk-level" role="group" aria-label={t("blocks.ui.title")}>
        <button
          type="button"
          aria-pressed={level === "beginner"}
          onClick={() => setLevel("beginner")}
        >
          {t("blocks.ui.level.beginner")}
        </button>
        <button
          type="button"
          aria-pressed={level === "advanced"}
          onClick={() => setLevel("advanced")}
        >
          {t("blocks.ui.level.advanced")}
        </button>
      </div>

      <div className="blk-palette-body">
        <nav className="blk-cats" aria-label={t("blocks.ui.title")}>
          {BLOCK_CATEGORIES.map((id) => {
            const count = counts.get(id) ?? 0;
            return (
              <button
                key={id}
                type="button"
                className={`blk-cat blk-cat-${id}`}
                aria-pressed={category === id}
                disabled={count === 0}
                onClick={() => setCategory(id)}
              >
                <span className="blk-cat-dot" />
                {t(`blocks.category.${id}`)}
              </button>
            );
          })}
        </nav>

        <div className="blk-drawer">
          {blocks.map((def) => (
            <div
              key={def.type}
              className="blk-drawer-item"
              onPointerDown={(event) => onPickBlock(def.type, event)}
              title={def.tooltipKey ? t(def.tooltipKey) : undefined}
            >
              <BlockPreview type={def.type} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
