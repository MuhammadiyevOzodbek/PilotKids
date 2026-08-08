"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  BLOCK_CATEGORIES,
  blocksInCategory,
  checkVariableName,
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
  const locale = useBlocksStore((s) => s.locale);
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
      <div
        className="blk-level"
        role="group"
        aria-label={t("blocks.ui.levelGroup", undefined, locale)}
      >
        <button
          type="button"
          aria-pressed={level === "beginner"}
          onClick={() => setLevel("beginner")}
        >
          {t("blocks.ui.level.beginner", undefined, locale)}
        </button>
        <button
          type="button"
          aria-pressed={level === "advanced"}
          onClick={() => setLevel("advanced")}
        >
          {t("blocks.ui.level.advanced", undefined, locale)}
        </button>
      </div>

      <div className="blk-palette-body">
        <nav className="blk-cats" aria-label={t("blocks.ui.categories", undefined, locale)}>
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
                {t(`blocks.category.${id}`, undefined, locale)}
              </button>
            );
          })}
        </nav>

        <div className="blk-drawer" role="list">
          {category === "variables" && <VariablesPanel />}
          {blocks.map((def) => (
            <div
              key={def.type}
              className="blk-drawer-item"
              role="listitem"
              onPointerDown={(event) => onPickBlock(def.type, event)}
              title={def.tooltipKey ? t(def.tooltipKey, undefined, locale) : undefined}
            >
              <BlockPreview type={def.type} locale={locale} level={level} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── O'zgaruvchilar paneli ─────────────────────────── */

/**
 * O'zgaruvchilarni yaratish, nomini o'zgartirish va o'chirish (§9).
 *
 * Panel ataylab palitraning ICHIDA: o'zgaruvchi blokining ro'yxati shu
 * yerdagi nomlardan quriladi, ya'ni «avval yarat, keyin blokni sudra»
 * tartibi bola uchun bir joyda ko'rinadi.
 *
 * Nom tekshiruvi model qatlamidagi `checkVariableName()` bilan — xato sababi
 * i18n kalitiga aylantiriladi, panel o'zi qoida o'ylab topmaydi.
 */
function VariablesPanel() {
  const workspace = useBlocksStore((s) => s.workspace);
  const locale = useBlocksStore((s) => s.locale);
  const addVar = useBlocksStore((s) => s.addVar);
  const renameVar = useBlocksStore((s) => s.renameVar);
  const removeVar = useBlocksStore((s) => s.removeVar);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  /** Nomi o'zgartirilayotgan o'zgaruvchi. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const closeForms = () => {
    setCreating(false);
    setEditingId(null);
    setDraft("");
    setErrorKey(null);
  };

  const submit = () => {
    const check = checkVariableName(workspace, draft, editingId ?? undefined);
    if (!check.ok) {
      setErrorKey(`blocks.ui.vars.error.${check.reason}`);
      return;
    }
    if (editingId) renameVar(editingId, check.name);
    else addVar(check.name);
    closeForms();
  };

  const nameInput = (
    <div className="blk-var-form">
      <input
        className="blk-var-input"
        value={draft}
        autoFocus
        placeholder={t("blocks.ui.vars.namePlaceholder", undefined, locale)}
        onChange={(event) => {
          setDraft(event.target.value);
          setErrorKey(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") closeForms();
          // Ish maydonining klaviatura yorliqlari aralashmasin.
          event.stopPropagation();
        }}
      />
      <button
        type="button"
        aria-label={t("blocks.ui.vars.add", undefined, locale)}
        onClick={submit}
      >
        <Check size={13} />
      </button>
      <button
        type="button"
        aria-label={t("blocks.ui.vars.cancel", undefined, locale)}
        onClick={closeForms}
      >
        <X size={13} />
      </button>
    </div>
  );

  return (
    <section className="blk-vars" aria-label={t("blocks.ui.vars.title", undefined, locale)}>
      {workspace.variables.length === 0 && !creating && (
        <p className="blk-vars-empty">{t("blocks.ui.vars.empty", undefined, locale)}</p>
      )}

      <ul className="blk-var-list">
        {workspace.variables.map((variable) =>
          editingId === variable.id ? (
            <li key={variable.id}>{nameInput}</li>
          ) : (
            <li key={variable.id} className="blk-var-row">
              <span className="blk-var-name">{variable.name}</span>
              <button
                type="button"
                aria-label={t("blocks.ui.vars.rename", undefined, locale)}
                onClick={() => {
                  setCreating(false);
                  setEditingId(variable.id);
                  setDraft(variable.name);
                  setErrorKey(null);
                }}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                aria-label={t("blocks.ui.vars.remove", undefined, locale)}
                onClick={() => removeVar(variable.id)}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ),
        )}
      </ul>

      {creating ? (
        nameInput
      ) : (
        <button
          type="button"
          className="blk-var-create"
          onClick={() => {
            setEditingId(null);
            setCreating(true);
            setDraft("");
            setErrorKey(null);
          }}
        >
          <Plus size={13} />
          {t("blocks.ui.vars.create", undefined, locale)}
        </button>
      )}

      {errorKey && (
        <p className="blk-var-error" role="alert">
          {t(errorKey, undefined, locale)}
        </p>
      )}
    </section>
  );
}
