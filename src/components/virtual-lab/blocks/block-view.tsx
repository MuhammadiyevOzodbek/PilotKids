"use client";

import { createContext, useContext, type PointerEvent as ReactPointerEvent } from "react";
import {
  getBlockDefinition,
  splitLabel,
  stackIds,
  t,
  type BlockDefinition,
  type BlockNode,
  type BlockWorkspace,
  type DropdownOption,
  type SlotDef,
} from "@/lib/virtual-lab/blocks";
import type { Circuit } from "@/lib/virtual-lab/types";
import { registerElement } from "./block-dnd";

/**
 * Blokni ekranga chizish.
 *
 * Bloklar oddiy DOM elementlari: shakl CSS bilan beriladi, o'lchamni esa
 * brauzer hisoblaydi. SVG o'rniga shu tanlangan, chunki blok ichida
 * `<select>` va `<input>` bor — ular DOM'da klaviatura va ekran o'quvchi
 * bilan o'z-o'zidan ishlaydi (§40), SVG ichida esa qo'lda qayta yozish
 * kerak bo'lardi.
 */

interface BlockEditorContextValue {
  workspace: BlockWorkspace;
  circuit: Circuit;
  selectedId: string | null;
  /** Sudrash paytida yashiriladigan blok (ko'chirma ustida ko'rinadi). */
  draggingId: string | null;
  onGrab: (blockId: string, event: ReactPointerEvent) => void;
  onSelect: (blockId: string) => void;
  onFieldChange: (blockId: string, name: string, value: string) => void;
}

const BlockEditorContext = createContext<BlockEditorContextValue | null>(null);

export const BlockEditorProvider = BlockEditorContext.Provider;

function useBlockEditor(): BlockEditorContextValue {
  const value = useContext(BlockEditorContext);
  if (!value) throw new Error("BlockView faqat BlockEditorProvider ichida ishlaydi");
  return value;
}

/* ─────────────────────────── Stek ─────────────────────────── */

/** `next` zanjiridagi bloklarni ustma-ust chizadi. */
export function BlockStack({ firstId }: { firstId: string | null }) {
  const { workspace } = useBlockEditor();
  const ids = stackIds(workspace, firstId);
  return (
    <>
      {ids.map((id) => (
        <BlockView key={id} id={id} />
      ))}
    </>
  );
}

/* ─────────────────────────── Blok ─────────────────────────── */

export function BlockView({ id }: { id: string }) {
  const ctx = useBlockEditor();
  const block = ctx.workspace.blocks[id];
  const def = block ? getBlockDefinition(block.type) : null;
  if (!block || !def) return null;

  const parts = splitLabel(def.messageKey);
  const statementSlots = def.slots.filter((s) => s.kind === "statement");
  const selected = ctx.selectedId === id;

  const className = [
    "blk",
    `blk-shape-${def.shape}`,
    `blk-cat-${def.category}`,
    selected ? "blk-selected" : "",
    ctx.draggingId === id ? "blk-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
        title={def.tooltipKey ? t(def.tooltipKey) : undefined}
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
          <div className="blk-substack-foot" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Uyalar ─────────────────────────── */

function SlotView({ block, def, name }: { block: BlockNode; def: BlockDefinition; name: string }) {
  const ctx = useBlockEditor();
  const slot = def.slots.find((s) => s.name === name);
  if (!slot || slot.kind === "statement") return null;

  // Uyaga tegilganda blok sudralib ketmasligi kerak.
  const stopDrag = (event: ReactPointerEvent) => event.stopPropagation();

  if (slot.kind === "dropdown") {
    const options = resolveOptions(slot, ctx.workspace, ctx.circuit);
    const value = block.fields[name] ?? "";
    const missing = value !== "" && !options.some((o) => o.value === value);

    return (
      <select
        className={`blk-field blk-select${missing ? "blk-field-missing" : ""}`}
        value={value}
        onPointerDown={stopDrag}
        onChange={(event) => ctx.onFieldChange(block.id, name, event.target.value)}
        aria-label={name}
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
        className={`blk-field ${slot.kind === "number" ? "blk-num" : "blk-textfield"}`}
        type={slot.kind === "number" ? "number" : "text"}
        value={block.fields[name] ?? ""}
        min={slot.kind === "number" ? slot.min : undefined}
        max={slot.kind === "number" ? slot.max : undefined}
        step={slot.kind === "number" ? slot.step : undefined}
        maxLength={slot.kind === "text" ? slot.maxLength : undefined}
        onPointerDown={stopDrag}
        onChange={(event) => ctx.onFieldChange(block.id, name, event.target.value)}
        aria-label={name}
      />
    );
  }

  // Qiymat uyasi: blok ulangan bo'lsa o'sha, aks holda ichki kiritish maydoni.
  const childId = block.inputs[name] ?? null;
  return (
    <span
      className={`blk-input${childId ? "blk-input-filled" : ""}`}
      ref={(el) => registerElement("input", block.id, name, el)}
    >
      {childId ? (
        <BlockView id={childId} />
      ) : slot.inline ? (
        <input
          className={`blk-field blk-inline ${slot.inline.kind === "number" ? "blk-num" : "blk-textfield"}`}
          type={slot.inline.kind === "number" ? "number" : "text"}
          value={block.fields[name] ?? ""}
          onPointerDown={stopDrag}
          onChange={(event) => ctx.onFieldChange(block.id, name, event.target.value)}
          aria-label={name}
        />
      ) : (
        <span className="blk-input-empty" />
      )}
    </span>
  );
}

function resolveOptions(
  slot: Extract<SlotDef, { kind: "dropdown" }>,
  workspace: BlockWorkspace,
  circuit: Circuit,
): DropdownOption[] {
  return typeof slot.options === "function"
    ? slot.options({ circuit, variables: workspace.variables })
    : [...slot.options];
}

/* ─────────────────────────── Palitra ko'rinishi ─────────────────────────── */

/**
 * Palitradagi namuna blok.
 *
 * Ish maydonidagi blokdan farqi: ichki steklari chizilmaydi va uyalari
 * o'zgartirilmaydi — bu shunchaki "shundayi bor" degan ko'rgazma.
 */
export function BlockPreview({ type }: { type: string }) {
  const def = getBlockDefinition(type);
  if (!def) return null;

  const parts = splitLabel(def.messageKey);
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
    return <span className="blk-field blk-select-static">{slot.default}</span>;
  if (slot.kind === "number")
    return <span className="blk-field blk-num-static">{slot.default}</span>;
  if (slot.kind === "text") return <span className="blk-field blk-num-static">{slot.default}</span>;
  if (slot.kind === "value") {
    const label = slot.inline ? String(slot.inline.default) : "";
    return (
      <span className="blk-input">
        {label && <span className="blk-field blk-num-static">{label}</span>}
      </span>
    );
  }
  return null;
}
