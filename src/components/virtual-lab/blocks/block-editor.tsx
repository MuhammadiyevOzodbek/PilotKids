"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Blocks,
  Code2,
  Columns2,
  Maximize2,
  Redo2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  generateProgram,
  isEmptyWorkspace,
  issuesByBlock,
  netlistFor,
  t,
  validateWorkspace,
  type BlockIssue,
  type BlockLocale,
  type GenWarning,
} from "@/lib/virtual-lab/blocks";
import type { CodeError, Circuit } from "@/lib/virtual-lab/types";
import { useBlocksStore, type ProgrammingMode } from "@/stores/blocks";
import { CodeEditor } from "../code-editor";
import { BlockCanvas, type BlockCanvasApi } from "./block-canvas";
import { BlockPalette } from "./block-palette";

/**
 * Dasturlash paneli — bloklar, kod va ikkalasi (§1).
 *
 * Bu panel MAVJUD kod muharririni almashtirmaydi, uni o'z ichiga oladi:
 * eski loyihalar va Arduino kod yozadigan foydalanuvchilar hech narsa
 * yo'qotmaydi (§38). Yangi boshlovchi uchun esa boshlang'ich rejim —
 * bloklar.
 *
 * Kod bloklardan doim BIR TOMONLAMA hosil bo'ladi (§28): blok → kod.
 * Teskarisi yo'q, shuning uchun kod rejimiga o'tishdan oldin ogohlantirish
 * ko'rsatiladi.
 *
 * Ikki mustaqil tekshiruv ko'rsatiladi:
 *   • generator OGOHLANTIRISHLARI — «blok ulanmagan», «uya bo'sh»;
 *   • sxema MUAMMOLARI (`validateWorkspace`) — «LED ulanmagan», «PWM emas».
 * Ular alohida hisoblanadi va alohida ko'rinadi (§34).
 */

/** Kodni qayta yig'ishdan oldingi kutish (ms) — har harakatda kompilyatsiya bo'lmasin (§27). */
const GENERATE_DEBOUNCE_MS = 220;

export function BlockEditor({
  circuit,
  code,
  fontSize,
  codeErrors,
  onCodeChange,
  onFontSize,
  onResetCode,
  reveal,
}: {
  circuit: Circuit;
  code: string;
  fontSize: number;
  codeErrors: CodeError[];
  onCodeChange: (code: string) => void;
  onFontSize: (size: number) => void;
  onResetCode: () => void;
  reveal?: { line: number; token: number } | null;
}) {
  const workspace = useBlocksStore((s) => s.workspace);
  const mode = useBlocksStore((s) => s.mode);
  const zoom = useBlocksStore((s) => s.zoom);
  const locale = useBlocksStore((s) => s.locale);
  const selectedId = useBlocksStore((s) => s.selectedId);
  const setMode = useBlocksStore((s) => s.setMode);
  const setZoom = useBlocksStore((s) => s.setZoom);
  const setLocale = useBlocksStore((s) => s.setLocale);
  const undo = useBlocksStore((s) => s.undo);
  const redo = useBlocksStore((s) => s.redo);
  const clear = useBlocksStore((s) => s.clear);
  const codeDirty = useBlocksStore((s) => s.codeDirty);
  const markCodeDirty = useBlocksStore((s) => s.markCodeDirty);

  const [warnings, setWarnings] = useState<GenWarning[]>([]);
  /** Kod rejimiga o'tishni tasdiqlash oynasi (§28). */
  const [confirmCodeMode, setConfirmCodeMode] = useState(false);

  const canvasApi = useRef<BlockCanvasApi | null>(null);

  /*
   * Bloklardan kod.
   *
   * Ikki holatda ATAYLAB ishlamaydi:
   *   • kod rejimida — u yerda matn foydalanuvchiniki bo'lib qoladi va uni
   *     bosib yozish bolaning yozganini jim yo'qotardi;
   *   • ish maydoni bo'sh bo'lganda — aks holda dasturlash ko'rinishini
   *     ochishning O'ZI darsning boshlang'ich kodini yoki qo'lda yozilgan
   *     eskizni bo'sh `setup()/loop()` bilan almashtirib yuborardi.
   */
  useEffect(() => {
    if (mode === "code" || isEmptyWorkspace(workspace)) return;
    const timer = window.setTimeout(() => {
      const program = generateProgram(workspace, { circuit });
      setWarnings(program.warnings);
      onCodeChange(program.code);
    }, GENERATE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [workspace, circuit, mode, onCodeChange]);

  /*
   * Sxema tekshiruvi (§34).
   *
   * Kod generatsiyasidan MUSTAQIL: u sxema yoki ish maydoni o'zgarganda
   * qayta hisoblanadi va hech qachon kod yozmaydi. `useMemo` yetarli —
   * tekshiruv yengil, kechiktirish kerak emas.
   */
  const issues = useMemo<BlockIssue[]>(() => {
    if (isEmptyWorkspace(workspace)) return [];
    return validateWorkspace(workspace, {
      circuit,
      netlist: netlistFor(circuit),
      variables: workspace.variables,
    });
  }, [workspace, circuit]);

  const issueSeverity = useMemo(() => issuesByBlock(issues), [issues]);

  const switchMode = useCallback(
    (next: ProgrammingMode) => {
      // Kod rejimiga birinchi o'tishda ogohlantiramiz.
      if (next === "code" && !codeDirty) {
        setConfirmCodeMode(true);
        return;
      }
      setMode(next);
    },
    [codeDirty, setMode],
  );

  const fitToBlocks = useCallback(() => {
    canvasApi.current?.fitToBlocks();
  }, []);

  const pickBlock = useCallback((type: string, event: React.PointerEvent) => {
    canvasApi.current?.startPaletteDrag(type, event);
  }, []);

  /* ─────────────────── Klaviatura yorliqlari (§30) ─────────────────── */

  /*
   * Yorliqlar `window` da: blok muharriri FAQAT dasturlash ko'rinishida
   * chiziladi, ya'ni tinglovchi ham o'sha paytdagina mavjud bo'ladi.
   * Sxema ko'rinishidagi yorliqlar bilan to'qnashmaydi — `workbench.tsx`
   * o'z tomonidan shu ko'rinishda ularni o'chirib qo'yadi.
   */
  useEffect(() => {
    if (mode === "code") return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Matn kiritilayotgan bo'lsa aralashmaymiz.
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (target?.closest(".monaco-editor")) return;

      const store = useBlocksStore.getState();
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        store.redo();
        return;
      }
      if (!store.selectedId && !(mod && key === "v")) return;

      if (mod && key === "d") {
        event.preventDefault();
        if (store.selectedId) store.duplicate(store.selectedId);
        return;
      }
      if (mod && key === "c") {
        if (store.selectedId) store.copy(store.selectedId);
        return;
      }
      if (mod && key === "v") {
        event.preventDefault();
        store.paste();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (store.selectedId) store.remove(store.selectedId);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  return (
    <div className="blk-editor" data-mode={mode}>
      <div className="blk-toolbar">
        <span className="vlab-panel-title">
          <Blocks size={15} />
          {t("blocks.ui.title", undefined, locale)}
        </span>

        <div
          className="blk-modes"
          role="group"
          aria-label={t("blocks.ui.title", undefined, locale)}
        >
          <button type="button" aria-pressed={mode === "block"} onClick={() => switchMode("block")}>
            <Blocks size={14} />
            {t("blocks.ui.mode.block", undefined, locale)}
          </button>
          <button type="button" aria-pressed={mode === "split"} onClick={() => switchMode("split")}>
            <Columns2 size={14} />
            {t("blocks.ui.mode.split", undefined, locale)}
          </button>
          <button type="button" aria-pressed={mode === "code"} onClick={() => switchMode("code")}>
            <Code2 size={14} />
            {t("blocks.ui.mode.code", undefined, locale)}
          </button>
        </div>

        <span className="vlab-spacer" />

        {mode !== "code" && (
          <div className="blk-tools">
            <select
              className="blk-locale"
              value={locale}
              onChange={(event) => setLocale(event.target.value as BlockLocale)}
              aria-label={t("blocks.ui.language", undefined, locale)}
            >
              <option value="uz">O&apos;zbekcha</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
            <ToolButton
              icon={<Undo2 size={14} />}
              label={t("blocks.ui.undo", undefined, locale)}
              onClick={undo}
            />
            <ToolButton
              icon={<Redo2 size={14} />}
              label={t("blocks.ui.redo", undefined, locale)}
              onClick={redo}
            />
            <ToolButton
              icon={<ZoomOut size={14} />}
              label={t("blocks.ui.zoomOut", undefined, locale)}
              onClick={() => setZoom(zoom - 0.1)}
            />
            <span className="blk-zoom-value">{Math.round(zoom * 100)}%</span>
            <ToolButton
              icon={<ZoomIn size={14} />}
              label={t("blocks.ui.zoomIn", undefined, locale)}
              onClick={() => setZoom(zoom + 0.1)}
            />
            <ToolButton
              icon={<Maximize2 size={14} />}
              label={t("blocks.ui.zoomFit", undefined, locale)}
              onClick={fitToBlocks}
            />
            <ToolButton
              icon={<Trash2 size={14} />}
              label={t("blocks.ui.clear", undefined, locale)}
              onClick={clear}
            />
          </div>
        )}
      </div>

      <div className="blk-body">
        {mode !== "code" && (
          <>
            <BlockPalette onPickBlock={pickBlock} />
            <BlockCanvas circuit={circuit} apiRef={canvasApi} issues={issueSeverity} />
          </>
        )}

        {mode !== "block" && (
          <div className="blk-code">
            <CodeEditor
              code={code}
              fontSize={fontSize}
              errors={codeErrors}
              onChange={(value) => {
                if (mode === "code") markCodeDirty(true);
                onCodeChange(value);
              }}
              onFontSize={onFontSize}
              onReset={onResetCode}
              reveal={reveal}
              readOnly={mode === "split"}
              title={mode === "split" ? t("blocks.ui.generated", undefined, locale) : undefined}
            />
          </div>
        )}
      </div>

      {mode !== "code" && (issues.length > 0 || warnings.length > 0) && (
        <ul className="blk-warnings">
          {issues.map((issue, index) => (
            <li
              key={`i-${issue.blockId}-${index}`}
              className={`blk-issue blk-issue-${issue.severity}`}
            >
              <button type="button" onClick={() => useBlocksStore.getState().select(issue.blockId)}>
                {t(issue.messageKey, issue.params, locale)}
              </button>
            </li>
          ))}
          {warnings.map((warning, index) => (
            <li key={`w-${warning.code}-${warning.blockId ?? index}`} className="blk-issue">
              {t(warning.messageKey, warning.params, locale)}
            </li>
          ))}
        </ul>
      )}

      {confirmCodeMode && (
        <div className="blk-confirm" role="alertdialog" aria-modal="true">
          <p>{t("blocks.ui.codeModeWarning", undefined, locale)}</p>
          <div className="blk-confirm-actions">
            <button
              type="button"
              className="blk-confirm-ok"
              onClick={() => {
                setConfirmCodeMode(false);
                markCodeDirty(true);
                setMode("code");
              }}
            >
              {t("blocks.ui.codeModeContinue", undefined, locale)}
            </button>
            <button type="button" onClick={() => setConfirmCodeMode(false)}>
              {t("blocks.ui.codeModeCancel", undefined, locale)}
            </button>
          </div>
        </div>
      )}

      {/* Tanlangan blok yo'qolib qolmasin — ekran o'quvchi uchun holat. */}
      <span className="vlab-sr-only" role="status">
        {selectedId ? t("blocks.ui.selected", undefined, locale) : ""}
      </span>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="vlab-tool" aria-label={label} title={label} onClick={onClick}>
      {icon}
    </button>
  );
}
