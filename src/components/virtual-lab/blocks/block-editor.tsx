"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { generateProgram, isEmptyWorkspace, t, type GenWarning } from "@/lib/virtual-lab/blocks";
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
  const setMode = useBlocksStore((s) => s.setMode);
  const setZoom = useBlocksStore((s) => s.setZoom);
  const setPan = useBlocksStore((s) => s.setPan);
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
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [setZoom, setPan]);

  const pickBlock = useCallback((type: string, event: React.PointerEvent) => {
    canvasApi.current?.startPaletteDrag(type, event);
  }, []);

  return (
    <div className="blk-editor" data-mode={mode}>
      <div className="blk-toolbar">
        <span className="vlab-panel-title">
          <Blocks size={15} />
          {t("blocks.ui.title")}
        </span>

        <div className="blk-modes" role="group" aria-label={t("blocks.ui.title")}>
          <button type="button" aria-pressed={mode === "block"} onClick={() => switchMode("block")}>
            <Blocks size={14} />
            {t("blocks.ui.mode.block")}
          </button>
          <button type="button" aria-pressed={mode === "split"} onClick={() => switchMode("split")}>
            <Columns2 size={14} />
            {t("blocks.ui.mode.split")}
          </button>
          <button type="button" aria-pressed={mode === "code"} onClick={() => switchMode("code")}>
            <Code2 size={14} />
            {t("blocks.ui.mode.code")}
          </button>
        </div>

        <span className="vlab-spacer" />

        {mode !== "code" && (
          <div className="blk-tools">
            <ToolButton icon={<Undo2 size={14} />} label={t("blocks.ui.undo")} onClick={undo} />
            <ToolButton icon={<Redo2 size={14} />} label={t("blocks.ui.redo")} onClick={redo} />
            <ToolButton
              icon={<ZoomOut size={14} />}
              label={t("blocks.ui.zoomOut")}
              onClick={() => setZoom(zoom - 0.1)}
            />
            <span className="blk-zoom-value">{Math.round(zoom * 100)}%</span>
            <ToolButton
              icon={<ZoomIn size={14} />}
              label={t("blocks.ui.zoomIn")}
              onClick={() => setZoom(zoom + 0.1)}
            />
            <ToolButton
              icon={<Maximize2 size={14} />}
              label={t("blocks.ui.zoomFit")}
              onClick={fitToBlocks}
            />
            <ToolButton icon={<Trash2 size={14} />} label={t("blocks.ui.clear")} onClick={clear} />
          </div>
        )}
      </div>

      <div className="blk-body">
        {mode !== "code" && (
          <>
            <BlockPalette onPickBlock={pickBlock} />
            <BlockCanvas circuit={circuit} apiRef={canvasApi} />
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
              title={mode === "split" ? t("blocks.ui.generated") : undefined}
            />
          </div>
        )}
      </div>

      {mode !== "code" && warnings.length > 0 && (
        <ul className="blk-warnings">
          {warnings.map((warning, index) => (
            <li key={`${warning.code}-${warning.blockId ?? index}`}>
              {t(warning.messageKey, warning.params)}
            </li>
          ))}
        </ul>
      )}

      {confirmCodeMode && (
        <div className="blk-confirm" role="alertdialog" aria-modal="true">
          <p>{t("blocks.ui.codeModeWarning")}</p>
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
              {t("blocks.ui.codeModeContinue")}
            </button>
            <button type="button" onClick={() => setConfirmCodeMode(false)}>
              {t("blocks.ui.codeModeCancel")}
            </button>
          </div>
        </div>
      )}
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
    <button type="button" className="vlab-tool" aria-label={label} onClick={onClick}>
      {icon}
    </button>
  );
}
