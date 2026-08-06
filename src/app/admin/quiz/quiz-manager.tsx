"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Tag,
  Textarea,
} from "@/components/admin/ui";
import { createQuestion, deleteQuestion, updateQuestion } from "@/lib/admin/actions";

export interface AdminQuestionRow {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  sortOrder: number;
  courseId: string | null;
  courseTitle: string | null;
}

export interface CourseOption {
  id: string;
  title: string;
}

type Draft = {
  courseId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  sortOrder: number;
};

const emptyDraft: Draft = {
  courseId: "",
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
  sortOrder: 0,
};

export function QuizManager({
  questions,
  courses,
}: {
  questions: AdminQuestionRow[];
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminQuestionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmDelete, setConfirmDelete] = useState<AdminQuestionRow | null>(null);

  function openCreate() {
    setDraft({ ...emptyDraft, sortOrder: questions.length });
    setError(null);
    setCreating(true);
  }

  function openEdit(q: AdminQuestionRow) {
    setDraft({
      courseId: q.courseId ?? "",
      prompt: q.prompt,
      options: [...q.options],
      correctIndex: q.correctIndex,
      sortOrder: q.sortOrder,
    });
    setError(null);
    setEditing(q);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function setOption(i: number, value: string) {
    setDraft((d) => {
      const options = [...d.options];
      options[i] = value;
      return { ...d, options };
    });
  }

  function addOption() {
    setDraft((d) => (d.options.length >= 6 ? d : { ...d, options: [...d.options, ""] }));
  }

  function removeOption(i: number) {
    setDraft((d) => {
      if (d.options.length <= 2) return d;
      const options = d.options.filter((_, idx) => idx !== i);
      // To'g'ri javob o'chirilgan variantdan keyin bo'lsa, indeks siljiydi.
      const correctIndex =
        d.correctIndex === i ? 0 : d.correctIndex > i ? d.correctIndex - 1 : d.correctIndex;
      return { ...d, options, correctIndex };
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      ...draft,
      courseId: draft.courseId || null,
      sortOrder: Number(draft.sortOrder) || 0,
    };

    startTransition(async () => {
      const res = editing
        ? await updateQuestion(editing.id, payload)
        : await createQuestion(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  function remove(q: AdminQuestionRow) {
    setError(null);
    startTransition(async () => {
      const res = await deleteQuestion(q.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmDelete(null);
      router.refresh();
    });
  }

  const courseOptions = [
    { value: "", label: "Kursga bog'lanmagan" },
    ...courses.map((c) => ({ value: c.id, label: c.title })),
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(24px,3vw,30px)",
              letterSpacing: "-.02em",
              margin: "0 0 6px",
              color: "var(--text)",
            }}
          >
            Test savollari
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 15.5, margin: 0 }}>
            {questions.length} ta savol · to&apos;g&apos;ri javob hech qachon brauzerga yuborilmaydi
          </p>
        </div>
        <Button icon="add" onClick={openCreate}>
          Yangi savol
        </Button>
      </div>

      {error && !creating && !editing && (
        <div style={{ marginBottom: 16 }}>
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {questions.length === 0 ? (
        <Card>
          <EmptyState
            icon="quiz"
            title="Savollar yo'q"
            hint="Birinchi savolni qo'shing — o'quvchilar bilimini shu bilan tekshiramiz."
            action={
              <Button icon="add" onClick={openCreate}>
                Yangi savol
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {questions.map((q, i) => (
            <article
              key={q.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 20,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="font-display"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "var(--surface-3)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--text-2)",
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--text)",
                      margin: "0 0 8px",
                      lineHeight: 1.5,
                    }}
                  >
                    {q.prompt}
                  </p>
                  <Tag>{q.courseTitle ?? "Kursga bog'lanmagan"}</Tag>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(q)}
                    aria-label="Savolni tahrirlash"
                  >
                    <Icon name="edit" size={17} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirmDelete(q)}
                    aria-label="Savolni o'chirish"
                  >
                    <Icon name="delete" size={17} />
                  </Button>
                </div>
              </div>

              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                }}
              >
                {q.options.map((o, idx) => {
                  const correct = idx === q.correctIndex;
                  return (
                    <li
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "10px 13px",
                        borderRadius: 11,
                        background: correct ? "var(--success-soft)" : "var(--surface-2)",
                        border: `1px solid ${correct ? "var(--success)" : "var(--border)"}`,
                        color: correct ? "var(--success)" : "var(--text-2)",
                        fontSize: 14.5,
                        fontWeight: correct ? 700 : 600,
                      }}
                    >
                      <Icon
                        name={correct ? "check_circle" : "radio_button_unchecked"}
                        size={18}
                        color={correct ? "var(--success)" : "var(--text-3)"}
                      />
                      {o}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        title={editing ? "Savolni tahrirlash" : "Yangi savol"}
        onClose={close}
        width={620}
      >
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {error && <Alert kind="error">{error}</Alert>}

          <Textarea
            label="Savol matni"
            required
            rows={3}
            value={draft.prompt}
            onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
            placeholder="Robotning qaysi qismi atrofni sezadi?"
          />

          <div className="grid-2" style={{ gap: 12 }}>
            <Select
              label="Kurs"
              value={draft.courseId}
              onChange={(e) => setDraft((d) => ({ ...d, courseId: e.target.value }))}
              options={courseOptions}
            />
            <Input
              label="Tartib raqami"
              type="number"
              min={0}
              value={draft.sortOrder}
              onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) }))}
            />
          </div>

          <div>
            <span
              style={{
                display: "block",
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--text-2)",
                marginBottom: 8,
              }}
            >
              Javob variantlari — to&apos;g&apos;risini belgilang
            </span>

            <div
              role="radiogroup"
              aria-label="To'g'ri javob"
              style={{ display: "flex", flexDirection: "column", gap: 9 }}
            >
              {draft.options.map((o, i) => {
                const selected = draft.correctIndex === i;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${i + 1}-variant to'g'ri javob`}
                      onClick={() => setDraft((d) => ({ ...d, correctIndex: i }))}
                      className="tap"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        cursor: "pointer",
                        background: selected ? "var(--success-soft)" : "var(--surface-2)",
                        border: `1px solid ${selected ? "var(--success)" : "var(--border)"}`,
                      }}
                    >
                      <Icon
                        name={selected ? "check_circle" : "radio_button_unchecked"}
                        size={20}
                        color={selected ? "var(--success)" : "var(--text-3)"}
                      />
                    </button>

                    <input
                      className="field"
                      required
                      value={o}
                      onChange={(e) => setOption(i, e.target.value)}
                      aria-label={`${i + 1}-javob varianti`}
                      placeholder={`${i + 1}-variant`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "11px 13px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--surface-2)",
                        color: "var(--text)",
                        fontSize: 15,
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={draft.options.length <= 2}
                      onClick={() => removeOption(i)}
                      aria-label={`${i + 1}-variantni o'chirish`}
                    >
                      <Icon name="close" size={17} />
                    </Button>
                  </div>
                );
              })}
            </div>

            {draft.options.length < 6 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                icon="add"
                onClick={addOption}
                style={{ marginTop: 10 }}
              >
                Variant qo&apos;shish
              </Button>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Button type="button" variant="ghost" onClick={close}>
              Bekor qilish
            </Button>
            <Button type="submit" icon="check" disabled={isPending}>
              {isPending ? "Saqlanmoqda…" : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        title="Savolni o'chirish"
        onClose={() => setConfirmDelete(null)}
        width={430}
      >
        <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 20px" }}>
          Savol va unga berilgan barcha javoblar o&apos;chadi. Bu amalni qaytarib bo&apos;lmaydi.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Bekor qilish
          </Button>
          <Button
            variant="danger"
            icon="delete"
            disabled={isPending}
            onClick={() => confirmDelete && remove(confirmDelete)}
          >
            O&apos;chirish
          </Button>
        </div>
      </Modal>
    </>
  );
}
