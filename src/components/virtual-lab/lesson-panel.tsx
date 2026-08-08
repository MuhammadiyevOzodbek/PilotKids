"use client";

import { useState } from "react";
import { BookOpen, Check, ChevronDown, GraduationCap, Play, X } from "lucide-react";
import { LESSONS } from "@/lib/virtual-lab/lessons";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import type { Lesson, LessonResult } from "@/lib/virtual-lab/types";

/**
 * Dars paneli.
 *
 * Ilgari darsdan ekranda faqat sarlavha va "tekshirish" tugmasi ko'rinardi:
 * nazariya, qadamlar va kerakli komponentlar ma'lumot modelida bor edi,
 * lekin hech qayerda chizilmasdi — ya'ni bola topshiriqni umuman o'qiy
 * olmasdi. Endi butun dars shu panelda.
 *
 * Panel pastda tor tasma bo'lib turadi va bosilganda ochiladi, shunda
 * sxema uchun joy qolaveradi.
 *
 * DARS OCHILMAGAN paytda panel umuman chizilmaydi. Ilgari u bo'sh holatda
 * ham «Darslar — tayyor topshiriq bilan boshlang» tasmasi bo'lib turardi va
 * ish stolining pastidan joy olardi. Erkin rejimda sxema yig'ayotgan bolaga
 * bu tasma kerak emas.
 */

const DIFFICULTY_LABEL: Record<Lesson["difficulty"], string> = {
  oson: "Oson",
  orta: "O'rta",
  qiyin: "Qiyin",
};

export interface LessonPanelProps {
  lesson: Lesson | null;
  result: LessonResult | null;
  onCheck: () => void;
  /** Darsni tanlash — sxema va kod almashtiriladi. */
  onOpenLesson: (slug: string) => void;
  /** Darsdan chiqish (erkin rejimga qaytish). */
  onExitLesson: () => void;
}

export function LessonPanel({
  lesson,
  result,
  onCheck,
  onOpenLesson,
  onExitLesson,
}: LessonPanelProps) {
  // Dars ochilganda mazmun ko'rinib tursin: bola nima qilishini bilishi kerak.
  const [open, setOpen] = useState(true);
  const [picker, setPicker] = useState(false);

  // Erkin rejim — panel butunlay yo'q.
  if (!lesson) return null;

  const failed = new Set(result?.failed.map((f) => f.id) ?? []);
  const passed = new Set(result?.passed.map((p) => p.id) ?? []);

  return (
    <div className="vlab-lesson" data-open={lesson && open ? "true" : "false"}>
      <div className="vlab-lesson-bar">
        <GraduationCap size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />

        {lesson ? (
          <>
            <button
              type="button"
              className="vlab-lesson-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <span className="vlab-lesson-title">{lesson.title}</span>
              <span className="vlab-lesson-meta">
                {DIFFICULTY_LABEL[lesson.difficulty]} · {lesson.minutes} daq
              </span>
              <ChevronDown
                size={15}
                style={{
                  transform: open ? "rotate(180deg)" : "none",
                  transition: "transform .15s",
                }}
              />
            </button>

            {result && (
              <>
                <span className="vlab-progress" aria-hidden>
                  <i style={{ width: `${result.percent}%` }} />
                </span>
                <span className="vlab-result">
                  <strong>{result.percent}%</strong> — {result.passed.length}/{lesson.rules.length}
                </span>
              </>
            )}

            <span className="vlab-spacer" />
            <button type="button" onClick={onCheck} className="vlab-lesson-check">
              Topshiriqni tekshirish
            </button>
            <button
              type="button"
              onClick={onExitLesson}
              className="vlab-tool"
              aria-label="Darsdan chiqish"
              title="Darsdan chiqish"
            >
              <X size={15} />
            </button>
          </>
        ) : null}

        <div className="vlab-lesson-picker-wrap">
          <button
            type="button"
            className="vlab-lesson-pick"
            onClick={() => setPicker((v) => !v)}
            aria-expanded={picker}
          >
            <BookOpen size={14} />
            {lesson ? "Boshqa dars" : "Darsni tanlash"}
            <span className="vlab-count">{LESSONS.length}</span>
          </button>

          {picker && (
            <div className="vlab-lesson-menu" role="menu">
              {LESSONS.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  role="menuitem"
                  className="vlab-lesson-menu-item"
                  data-current={item.slug === lesson?.slug}
                  onClick={() => {
                    setPicker(false);
                    setOpen(true);
                    onOpenLesson(item.slug);
                  }}
                >
                  <span className="vlab-lesson-menu-title">
                    <Play size={12} />
                    {item.title}
                  </span>
                  <span className="vlab-lesson-menu-sub">
                    {DIFFICULTY_LABEL[item.difficulty]} · {item.minutes} daq · {item.summary}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {lesson && open && (
        <div className="vlab-lesson-body">
          <section>
            <h3 className="vlab-sub">Vazifa</h3>
            <p className="vlab-lesson-summary">{lesson.summary}</p>

            <h3 className="vlab-sub" style={{ marginTop: 14 }}>
              Nazariya
            </h3>
            <p className="vlab-lesson-theory">{lesson.theory}</p>

            <h3 className="vlab-sub" style={{ marginTop: 14 }}>
              Kerakli komponentlar
            </h3>
            <div className="vlab-pins">
              {lesson.requiredComponents.map((type) => (
                <span key={type} className="vlab-pin">
                  {getDefinition(type)?.name ?? type}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="vlab-sub">Qadamlar</h3>
            <ol className="vlab-steps">
              {lesson.steps.map((step, i) => (
                <li key={step.id}>
                  <span className="vlab-step-num">{i + 1}</span>
                  <span>
                    <strong>{step.title}</strong>
                    <span className="vlab-step-detail">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="vlab-sub">Tekshiruv</h3>
            {/*
              Har bir qoida alohida ko'rsatiladi: bola qaysi shart
              bajarilmaganini va nima qilish kerakligini aniq ko'radi.
              Tekshiruvdan oldin ular shunchaki ro'yxat bo'lib turadi.
            */}
            <ul className="vlab-rules">
              {lesson.rules.map((rule) => {
                const state = passed.has(rule.id) ? "ok" : failed.has(rule.id) ? "fail" : "idle";
                return (
                  <li key={rule.id} data-state={state}>
                    <span className="vlab-rule-mark" aria-hidden>
                      {state === "ok" ? (
                        <Check size={12} />
                      ) : state === "fail" ? (
                        <X size={12} />
                      ) : null}
                    </span>
                    <span>
                      {rule.label}
                      {state === "fail" && <span className="vlab-step-detail">{rule.hint}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
