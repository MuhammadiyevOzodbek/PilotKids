"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { loader, type Monaco } from "@monaco-editor/react";
import type { editor, IPosition } from "monaco-editor";
import { FileCode2, Minus, Plus, RotateCcw } from "lucide-react";
import type { CodeError } from "@/lib/virtual-lab/types";

/**
 * Arduino kod muharriri (Monaco).
 *
 * MUHIM: Monaco standart holatda o'zini CDN'dan yuklaydi, bizning CSP esa
 * tashqi skriptlarni bloklaydi (`script-src 'self' …`). Shuning uchun paket
 * lokal `node_modules` dan olinadi va `loader.config` bilan ko'rsatiladi.
 *
 * Til xizmati worker'i ham paketdan olinadi va bundler tomonidan o'z
 * domenimizga joylanadi (`worker-src 'self'`). C/C++ uchun sintaksis bo'yash
 * Monarch tokenizatori orqali ishlaydi, avtoto'ldirishni esa o'zimiz beramiz.
 *
 * MUHIM: sozlash va'dasi (promise) modul darajasida saqlanadi. Oldin bu yerda
 * oddiy `configured` bayrog'i bor edi — u `await` dan OLDIN `true` bo'lgani
 * uchun komponent qayta ulanganda (dev'dagi ikki karra effekt) ikkinchi
 * chaqiruv darhol qaytib ketardi va muharrir `loader.config` tugamasidan
 * render bo'lardi. Natijada `loader` monaco'ni CDN'dan yuklamoqchi bo'lib,
 * CSP uni bloklardi — "Monaco initialization: error: {}" va `[object Event]`
 * xatolari aynan shundan chiqqan.
 */

let configurePromise: Promise<void> | null = null;
let completionsRegistered = false;

function configureMonaco(): Promise<void> {
  configurePromise ??= (async () => {
    // Worker `loader.config` dan oldin e'lon qilinsin — monaco yuklangan
    // zahoti uni izlaydi.
    const globalScope = self as unknown as {
      MonacoEnvironment?: { getWorker: () => Worker };
    };
    globalScope.MonacoEnvironment = {
      getWorker: () =>
        new Worker(
          new URL(
            "../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js",
            import.meta.url,
          ),
          { type: "module" },
        ),
    };

    const monaco = await import("monaco-editor");
    loader.config({ monaco });
  })().catch((error: unknown) => {
    // Keyingi urinish qayta sinab ko'rsin, aks holda muharrir abadiy
    // "yuklanmoqda" holatida qolib ketadi.
    configurePromise = null;
    throw error;
  });

  return configurePromise;
}

/** Arduino funksiyalari uchun avtoto'ldirish. */
function registerArduinoCompletions(monaco: Monaco) {
  if (completionsRegistered) return;
  completionsRegistered = true;

  const suggestions = [
    {
      label: "pinMode",
      insert: "pinMode(${1:13}, ${2:OUTPUT});",
      doc: "Pinni kirish yoki chiqish qilib sozlaydi",
    },
    {
      label: "digitalWrite",
      insert: "digitalWrite(${1:13}, ${2:HIGH});",
      doc: "Raqamli pinga HIGH yoki LOW beradi",
    },
    { label: "digitalRead", insert: "digitalRead(${1:2})", doc: "Raqamli pindan 0 yoki 1 o'qiydi" },
    { label: "analogRead", insert: "analogRead(${1:A0})", doc: "Analog pindan 0–1023 o'qiydi" },
    {
      label: "analogWrite",
      insert: "analogWrite(${1:9}, ${2:128});",
      doc: "PWM pinga 0–255 beradi",
    },
    { label: "delay", insert: "delay(${1:1000});", doc: "Millisekundda kutadi" },
    {
      label: "delayMicroseconds",
      insert: "delayMicroseconds(${1:100});",
      doc: "Mikrosekundda kutadi",
    },
    { label: "Serial.begin", insert: "Serial.begin(9600);", doc: "Serial aloqani ochadi" },
    {
      label: "Serial.println",
      insert: 'Serial.println(${1:"salom"});',
      doc: "Serial monitorga qator yozadi",
    },
    {
      label: "Serial.print",
      insert: 'Serial.print(${1:"salom"});',
      doc: "Serial monitorga yozadi",
    },
    {
      label: "Serial.available",
      insert: "Serial.available()",
      doc: "Serial monitorda o'qilmagan belgi soni",
    },
    {
      label: "Serial.read",
      insert: "Serial.read()",
      doc: "Serial monitordan bitta belgini o'qiydi",
    },
    {
      label: "Serial.readString",
      insert: "Serial.readString()",
      doc: "Serial monitordan kelgan matnni o'qiydi",
    },
    {
      label: "Serial.parseInt",
      insert: "Serial.parseInt()",
      doc: "Serial monitordan butun son o'qiydi",
    },
    { label: "millis", insert: "millis()", doc: "Ishga tushgandan beri o'tgan ms" },
    {
      label: "pulseIn",
      insert: "pulseIn(${1:8}, ${2:HIGH})",
      doc: "Ultrasonic echo impuls davomiyligini o'qiydi",
    },
    { label: "tone", insert: "tone(${1:3}, ${2:440});", doc: "Buzzer pinida tovush chiqaradi" },
    { label: "noTone", insert: "noTone(${1:3});", doc: "Buzzer tovushini to'xtatadi" },
    { label: "random", insert: "random(${1:0}, ${2:100})", doc: "Tasodifiy butun son qaytaradi" },
    {
      label: "constrain",
      insert: "constrain(${1:value}, ${2:0}, ${3:255})",
      doc: "Qiymatni berilgan oraliqda ushlab turadi",
    },
    { label: "abs", insert: "abs(${1:value})", doc: "Sonning modulini qaytaradi" },
    { label: "min", insert: "min(${1:a}, ${2:b})", doc: "Ikki qiymatdan kichigini qaytaradi" },
    { label: "max", insert: "max(${1:a}, ${2:b})", doc: "Ikki qiymatdan kattasini qaytaradi" },
    { label: "sq", insert: "sq(${1:value})", doc: "Sonning kvadratini qaytaradi" },
    { label: "sqrt", insert: "sqrt(${1:value})", doc: "Kvadrat ildizni qaytaradi" },
    { label: "pow", insert: "pow(${1:base}, ${2:exponent})", doc: "Sonni darajaga oshiradi" },
    { label: "round", insert: "round(${1:value})", doc: "Sonni eng yaqin butun songa yaxlitlaydi" },
    { label: "Servo", insert: "Servo ${1:myservo};", doc: "Servo obyektini e'lon qiladi" },
    {
      label: "servo.attach",
      insert: "${1:myservo}.attach(${2:9});",
      doc: "Servoni Arduino piniga bog'laydi",
    },
    {
      label: "servo.write",
      insert: "${1:myservo}.write(${2:90});",
      doc: "Servo burchagini o'zgartiradi",
    },
    {
      label: "map",
      insert: "map(${1:value}, ${2:0}, ${3:1023}, ${4:0}, ${5:255})",
      doc: "Qiymatni boshqa oraliqqa o'tkazadi",
    },
    { label: "LED_BUILTIN", insert: "LED_BUILTIN", doc: "Arduino Uno dagi ichki LED pini (13)" },
    {
      label: "INPUT_PULLUP",
      insert: "INPUT_PULLUP",
      doc: "Ichki pull-up rezistorli kirish rejimi",
    },
  ];

  monaco.languages.registerCompletionItemProvider("cpp", {
    provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: suggestions.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: s.insert,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: s.doc,
          range,
        })),
      };
    },
  });
}

export function CodeEditor({
  code,
  fontSize,
  errors,
  onChange,
  onFontSize,
  onReset,
}: {
  code: string;
  fontSize: number;
  errors: CodeError[];
  onChange: (value: string) => void;
  onFontSize: (size: number) => void;
  onReset: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    let active = true;
    configureMonaco().then(
      () => {
        if (active) setStatus("ready");
      },
      () => {
        if (active) setStatus("failed");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  // Parser xatolarini muharrirda qizil chizib ko'rsatamiz.
  useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;
    const model = ed.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(
      model,
      "arduino",
      errors.map((e) => ({
        severity: monaco.MarkerSeverity.Error,
        message: `${e.message}\n${e.hint}`,
        startLineNumber: e.line,
        endLineNumber: e.line,
        startColumn: e.column,
        endColumn: e.column + 1,
      })),
    );
  }, [errors]);

  const errorCount = errors.length;

  return (
    <div className="vlab-panel vlab-right-code">
      <div className="vlab-panel-head">
        <span className="vlab-panel-title">
          <FileCode2 size={15} />
          Arduino kod
        </span>
        {errorCount > 0 && <span className="vlab-badge vlab-badge-error">{errorCount} xato</span>}

        <span className="vlab-spacer" />

        <button
          type="button"
          onClick={() => onFontSize(fontSize - 1)}
          className="vlab-tool"
          aria-label="Shriftni kichraytirish"
        >
          <Minus size={14} />
        </button>
        <span className="vlab-fs">{fontSize}</span>
        <button
          type="button"
          onClick={() => onFontSize(fontSize + 1)}
          className="vlab-tool"
          aria-label="Shriftni kattalashtirish"
        >
          <Plus size={14} />
        </button>
        <button type="button" onClick={onReset} className="vlab-tool" aria-label="Kodni tiklash">
          <RotateCcw size={14} />
          <span className="vlab-tip">Boshlang&apos;ich kod</span>
        </button>
      </div>

      <div className="vlab-editor">
        {status === "ready" ? (
          <Editor
            height="100%"
            defaultLanguage="cpp"
            value={code}
            onChange={(v) => onChange(v ?? "")}
            theme="vs-dark"
            options={{
              fontSize,
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              autoClosingBrackets: "always",
              formatOnPaste: true,
              wordWrap: "on",
              // Worker yo'q — model xizmatlari o'rniga bizning parserimiz.
              quickSuggestions: { other: true, comments: false, strings: false },
            }}
            onMount={(ed, monaco) => {
              editorRef.current = ed;
              monacoRef.current = monaco;
              registerArduinoCompletions(monaco);
            }}
          />
        ) : status === "loading" ? (
          <div className="vlab-editor-loading">Muharrir yuklanmoqda…</div>
        ) : (
          // Monaco yuklanmasa ham dars to'xtab qolmasin: oddiy matn maydoni
          // bilan kod yozish va simulyatsiya qilish mumkin.
          <textarea
            value={code}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            aria-label="Arduino kod"
            className="vlab-editor-fallback"
            style={{ fontSize }}
          />
        )}
      </div>
    </div>
  );
}
