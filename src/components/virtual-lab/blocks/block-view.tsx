"use client";

import { createContext, memo, useContext, type PointerEvent as ReactPointerEvent } from "react";
import {
  getBlockDefinition,
  splitLabel,
  stackIds,
  t,
  type BlockDefinition,
  type BlockIssueSeverity,
  type BlockLevel,
  type BlockLocale,
  type BlockNode,
  type BlockWorkspace,
  type DropdownOption,
  type SlotDef,
  type WorkspaceVariable,
} from "@/lib/virtual-lab/blocks";
import type { Circuit } from "@/lib/virtual-lab/types";
import { useBlocksStore } from "@/stores/blocks";
import { registerElement } from "./block-dnd";

/**
 * Blokni ekranga chizish.
 *
 * Bloklar oddiy DOM elementlari: shakl CSS bilan beriladi, o'lchamni esa
 * brauzer hisoblaydi. SVG o'rniga shu tanlangan, chunki blok ichida
 * `<select>` va `<input>` bor — ular DOM'da klaviatura va ekran o'quvchi
 * bilan o'z-o'zidan ishlaydi (§40), SVG ichida esa qo'lda qayta yozish
 * kerak bo'lardi.
 *
 * TEZLIK (§39). Ilgari butun `workspace` bitta kontekstdan olinardi va
 * har o'zgarishda HAMMA blok qayta chizilardi. Endi:
 *   • kontekstda faqat O'ZGARMAYDIGAN narsalar (callback'lar, til, sxema);
 *   • blokning o'zi zustand selektori bilan ID bo'yicha olinadi;
 *   • `workspace.ts` copy-on-write ishlaydi, ya'ni tegilmagan blok
 *     obyekti o'sha havolada qoladi va `memo` haqiqatan ushlab qoladi.
 */

/* ─────────────────────────── Kontekstlar ─────────────────────────── */

interface BlockEditorContextValue {
  circuit: Circuit;
  locale: BlockLocale;
  level: BlockLevel;
  onGrab: (blockId: string, event: ReactPointerEvent) => void;
  onSelect: (blockId: string) => void;
  onFieldChange: (blockId: string, name: string, value: string) => void;
}

const BlockEditorContext = createContext<BlockEditorContextValue | null>(null);
export const BlockEditorProvider = BlockEditorContext.Provider;

/**
 * Tanlov, sudrash va sxema muammolari.
 *
 * Alohida kontekst: bu qiymatlar kamdan-kam o'zgaradi, ish maydoni esa
 * har harakatda. Bittasiga qo'shib yuborilsa, tanlash ham hamma blokni
 * qayta chizardi.
 */
interface BlockStateContextValue {
  workspace: BlockWorkspace;
  selectedId: string | null;
  issues: Map<string, BlockIssueSeverity>;
}

const BlockStateContext = createContext<BlockStateContextValue | null>(null);
export const BlockStateProvider = BlockStateContext.Provider;

function useBlockEditor(): BlockEditorContextValue {
  const value = useContext(BlockEditorContext);
  if (!value) throw new Error("BlockView faqat BlockEditorProvider ichida ishlaydi");
  return value;
}

/* ─────────────────────────── Stek ─────────────────────────── */

/**
 * `next` zanjiridagi bloklarni ustma-ust chizadi.
 *
 * Selektor ID'lar ro'yxatini MATN qilib qaytaradi: massiv har chaqiruvda
 * yangi obyekt bo'lardi va zustand «o'zgardi» deb hisoblardi. Matn esa
 * zanjir o'zgarmagunicha aynan bir xil qoladi.
 */
export function BlockStack({ firstId }: { firstId: string | null }) {
  const joined = useBlocksStore((s) => stackIds(s.workspace, firstId).join(" "));
  const ids = joined.length === 0 ? [] : joined.split(" ");
  return (
    <>
      {ids.map((id) => (
        <BlockView key={id} id={id} />
      ))}
    </>
  );
}

/* ─────────────────────────── Blok ─────────────────────────── */

export const BlockView = memo(function BlockView({ id }: { id: string }) {
  const ctx = useBlockEditor();
  const block = useBlocksStore((s) => s.workspace.blocks[id]);
  // Boolean qaytaradigan selektor: tanlov o'zgarganda faqat IKKI blok
  // qayta chiziladi — eskisi va yangisi.
  const selected = useBlocksStore((s) => s.selectedId === id);
  const dragging = useBlocksStore((s) => s.draggingId === id);
  const severity = useContext(BlockStateContext)?.issues.get(id);

  const def = block ? getBlockDefinition(block.type) : null;
  if (!block || !def) return null;

  const parts = splitLabel(labelKeyOf(def, ctx.level), undefined, ctx.locale);
  const statementSlots = def.slots.filter(
    (s): s is Extract<SlotDef, { kind: "statement" }> => s.kind === "statement",
  );

  const className = classes(
    "blk",
    `blk-shape-${def.shape}`,
    `blk-cat-${def.category}`,
    selected && "blk-selected",
    dragging && "blk-dragging",
    severity && `blk-issue-${severity}`,
  );

  return (
    <div
      className={className}
      ref={(el) => registerElement("block", id, undefined, el)}
      data-block-id={id}
    >
      <div
        className="blk-row"
        onPointerDown={(event) => ctx.onGrab(id, event)}
        onClick={(event) => {
          event.stopPropagation();
          ctx.onSelect(id);
        }}
        title={def.tooltipKey ? t(def.tooltipKey, undefined, ctx.locale) : undefined}
      >
        {parts.map((part, index) =>
          part.kind === "text" ? (
            <span key={index} className="blk-text">
              {part.text}
            </span>
          ) : (
            <SlotView key={index} block={block} def={def} name={part.name} />
          ),
        )}
      </div>

      {statementSlots.map((slot) => (
        <div key={slot.name} className="blk-substack">
          {/* «aks holda» kabi yorliq BIRINCHI stekdan keyin turadi, shuning
              uchun u yorliq shablonida emas, uyaning o'zida (§7). */}
          {slot.labelKey && (
            <div className="blk-substack-label">{t(slot.labelKey, undefined, ctx.locale)}</div>
          )}
          <div
            className="blk-substack-body"
            ref={(el) => registerElement("statement", id, slot.name, el)}
          >
            {block.statements[slot.name] ? (
              <BlockStack firstId={block.statements[slot.name]!} />
            ) : (
              <div className="blk-substack-empty" />
            )}
          </div>
          {/* C shaklining pastki tirgagi — faqat OXIRGI stekdan keyin. */}
          {slot === statementSlots[statementSlots.length - 1] && (
            <div className="blk-substack-foot" />
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * Blok yorlig'ining kaliti.
 *
 * Boshlang'ich darajada soddaroq matn ishlatiladi (§32) — blok mantiqi
 * ikkiga bo'linmaydi, faqat kalit almashadi. Soddalashtirilgan matni
 * bo'lmagan blok odatdagi kalitida qolaveradi.
 */
function labelKeyOf(def: BlockDefinition, level: BlockLevel): string {
  return level === "beginner" && def.messageKeyBeginner ? def.messageKeyBeginner : def.messageKey;
}

/* ─────────────────────────── Uyalar ─────────────────────────── */

function SlotView({ block, def, name }: { block: BlockNode; def: BlockDefinition; name: string }) {
  const ctx = useBlockEditor();
  /*
   * O'zgaruvchilar ro'yxatiga ALOHIDA obuna.
   *
   * Copy-on-write tufayli o'zgaruvchi qo'shilganda blok obyekti
   * o'zgarmaydi — obunasiz `variables_get` ro'yxati yangilanmay qolardi.
   * Massiv havolasi o'zgarmaguncha qayta chizish ham bo'lmaydi.
   */
  const variables = useBlocksStore((s) => s.workspace.variables);
  const slot = def.slots.find((s) => s.name === name);
  if (!slot || slot.kind === "statement") return null;

  // Uyaga tegilganda blok sudralib ketmasligi kerak.
  const stopDrag = (event: ReactPointerEvent) => event.stopPropagation();
  const label = t(`blocks.slot.${name}`, undefined, ctx.locale);
  // Tarjimasi yo'q uya nomi kalitning o'zini qaytaradi — o'shanda xom nom.
  const ariaLabel = label.startsWith("blocks.slot.") ? name : label;

  if (slot.kind === "dropdown") {
    const options = resolveOptions(slot, ctx.circuit, variables);
    const value = block.fields[name] ?? "";
    /*
     * Tanlangan qiymat ro'yxatda yo'q — ikki holatda uchraydi: komponent
     * (yoki o'zgaruvchi) o'chirilgan, yoki hali umuman tanlanmagan.
     * Ikkalasi ham bir xil ko'rinadi: uya qizil, ya'ni "bu yerga qara".
     */
    const missing = !options.some((o) => o.value === value);

    return (
      <select
        className={classes("blk-field", "blk-select", missing && "blk-field-missing")}
        value={value}
        onPointerDown={stopDrag}
        onChange={(event) => ctx.onFieldChange(block.id, name, event.target.value)}
        aria-label={ariaLabel}
        aria-invalid={missing || undefined}
      >
        {/* Tanlangan variant yo'qolgan bo'lsa ham ko'rinib tursin — bola
            nima o'zgarganini tushunsin (§33). */}
        {missing && <option value={value}>{value}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (slot.kind === "number" || slot.kind === "text") {
    return (
      <input
        className={classes("blk-field", slot.kind === "number" ? "blk-num" : "blk-textfield")}
        type={slot.kind === "number" ? "number" : "text"}
        value={block.fields[name] ?? ""}
        min={slot.kind === "number" ? slot.min : undefined}
        max={slot.kind === "number" ? slot.max : undefined}
        step={slot.kind === "number" ? slot.step : undefined}
        maxLength={slot.kind === "text" ? slot.maxLength : undefined}
        onPointerDown={stopDrag}
        onChange={(event) => ctx.onFieldChange(block.id, name, event.target.value)}
        aria-label={ariaLabel}
      />
    );
  }

  // Qiymat uyasi: blok ulangan bo'lsa o'sha, aks holda ichki kiritish maydoni.
  const childId = block.inputs[name] ?? null;
  return (
    <span
      className={classes(
        "blk-input",
        // Shart uyasi olti burchakli — unga faqat shart bloki tushadi.
        slot.check === "boolean" && "blk-input-boolean",
        childId && "blk-input-filled",
      )}
      ref={(el) => registerElement("input", block.id, name, el)}
    >
      {childId ? (
        <BlockView id={childId} />
      ) : slot.inline ? (
        <input
          className={classes(
            "blk-field",
            "blk-inline",
            slot.inline.kind === "number" ? "blk-num" : "blk-textfield",
          )}
          type={slot.inline.kind === "number" ? "number" : "text"}
          value={block.fields[name] ?? ""}
          onPointerDown={stopDrag}
          onChange={(event) => ctx.onFieldChange(block.id, name, event.target.value)}
          aria-label={ariaLabel}
        />
      ) : (
        <span className="blk-input-empty" />
      )}
    </span>
  );
}

function resolveOptions(
  slot: Extract<SlotDef, { kind: "dropdown" }>,
  circuit: Circuit,
  variables: readonly WorkspaceVariable[],
): DropdownOption[] {
  return typeof slot.options === "function"
    ? slot.options({ circuit, variables })
    : [...slot.options];
}

/* ─────────────────────────── Palitra ko'rinishi ─────────────────────────── */

/**
 * Palitradagi namuna blok.
 *
 * Ish maydonidagi blokdan farqi: ichki steklari chizilmaydi va uyalari
 * o'zgartirilmaydi — bu shunchaki "shundayi bor" degan ko'rgazma.
 */
export function BlockPreview({
  type,
  locale,
  level,
}: {
  type: string;
  locale: BlockLocale;
  level: BlockLevel;
}) {
  const def = getBlockDefinition(type);
  if (!def) return null;

  const parts = splitLabel(labelKeyOf(def, level), undefined, locale);
  return (
    <div className={`blk blk-preview blk-shape-${def.shape} blk-cat-${def.category}`}>
      <div className="blk-row">
        {parts.map((part, index) =>
          part.kind === "text" ? (
            <span key={index} className="blk-text">
              {part.text}
            </span>
          ) : (
            <PreviewSlot key={index} def={def} name={part.name} />
          ),
        )}
      </div>
    </div>
  );
}

function PreviewSlot({ def, name }: { def: BlockDefinition; name: string }) {
  const slot = def.slots.find((s) => s.name === name);
  if (!slot) return null;

  if (slot.kind === "dropdown")
    return <span className="blk-field blk-select-static">{slot.default || "…"}</span>;
  if (slot.kind === "number")
    return <span className="blk-field blk-num-static">{slot.default}</span>;
  if (slot.kind === "text") return <span className="blk-field blk-num-static">{slot.default}</span>;
  if (slot.kind === "value") {
    const label = slot.inline ? String(slot.inline.default) : "";
    return (
      <span className={classes("blk-input", slot.check === "boolean" && "blk-input-boolean")}>
        {label ? (
          <span className="blk-field blk-num-static">{label}</span>
        ) : (
          <span className="blk-input-empty" />
        )}
      </span>
    );
  }
  return null;
}

/**
 * CSS sinflarini birlashtiradi.
 *
 * Shablon satri (`` `a${b ? " c" : ""}` ``) ISHLATILMAYDI: `prettier` ning
 * tailwind plagini shablon ichidagi satr bo'laklarini "sinflar ro'yxati" deb
 * biladi va boshidagi bo'sh joyni qirqib tashlaydi — natijada ikki sinf
 * yopishib qolardi.
 */
function classes(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
