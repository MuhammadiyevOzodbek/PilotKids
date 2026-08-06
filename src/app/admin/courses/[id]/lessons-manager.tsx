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
import { createLesson, deleteLesson, moveLesson, updateLesson } from "@/lib/admin/actions";

export interface AdminLessonRow {
  id: string;
  title: string;
  meta: string;
  type: string;
  durationMin: number;
  content: string;
  videoUrl: string | null;
  xpReward: number;
  sortOrder: number;
}

const TYPES = [
  { value: "video", label: "Video dars" },
  { value: "code", label: "Kod mashqi" },
  { value: "quiz", label: "Test" },
  { value: "lab", label: "Laboratoriya" },
];

const TYPE_ICON: Record<string, string> = {
  video: "play_circle",
  code: "code",
  quiz: "quiz",
  lab: "science",
};

type Draft = {
  title: string;
  meta: string;
  type: string;
  durationMin: number;
  content: string;
  videoUrl: string;
  xpReward: number;
};

const emptyDraft: Draft = {
  title: "",
  meta: "",
  type: "video",
  durationMin: 10,
  content: "",
  videoUrl: "",
  xpReward: 40,
};

export function LessonsManager({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: AdminLessonRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminLessonRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmDelete, setConfirmDelete] = useState<AdminLessonRow | null>(null);

  function openCreate() {
    setDraft(emptyDraft);
    setError(null);
    setCreating(true);
  }

  function openEdit(l: AdminLessonRow) {
    setDraft({
      title: l.title,
      meta: l.meta,
      type: l.type,
      durationMin: l.durationMin,
      content: l.content,
      videoUrl: l.videoUrl ?? "",
      xpReward: l.xpReward,
    });
    setError(null);
    setEditing(l);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      ...draft,
      durationMin: Number(draft.durationMin) || 0,
      xpReward: Number(draft.xpReward) || 0,
    };

    startTransition(async () => {
      const res = editing
        ? await updateLesson(editing.id, payload)
        : await createLesson(courseId, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Amal bajarilmadi");
        return;
      }
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <>
      <Card
        title={`Darslar (${lessons.length})`}
        padding={lessons.length === 0 ? 0 : 16}
        action={
          <Button size="sm" icon="add" onClick={openCreate}>
            Dars qo&apos;shish
          </Button>
        }
      >
        {error && !creating && !editing && (
          <div style={{ marginBottom: 14 }}>
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        {lessons.length === 0 ? (
          <EmptyState
            icon="playlist_add"
            title="Darslar hali qo'shilmagan"
            hint="Birinchi darsni qo'shing — o'quvchilar shundan boshlaydi."
            action={
              <Button icon="add" onClick={openCreate}>
                Dars qo&apos;shish
              </Button>
            }
          />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lessons.map((l, i) => (
              <li
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 8px",
                  borderBottom: i < lessons.length - 1 ? "1px solid var(--border)" : "none",
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="font-display"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "var(--surface-3)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--text-2)",
                    fontWeight: 800,
                    fontSize: 14.5,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {l.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <Tag>
                      <Icon
                        name={TYPE_ICON[l.type] ?? "article"}
                        size={14}
                        style={{ verticalAlign: "-2px", marginRight: 4 }}
                      />
                      {TYPES.find((t) => t.value === l.type)?.label ?? l.type}
                    </Tag>
                    <Tag>{l.durationMin} daq</Tag>
                    <Tag color="var(--primary)" bg="var(--primary-soft)">
                      +{l.xpReward} XP
                    </Tag>
                    {!l.videoUrl && l.type === "video" && (
                      <Tag color="var(--fun-amber)" bg="var(--fun-amber-soft)">
                        Video yo&apos;q
                      </Tag>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending || i === 0}
                    onClick={() => run(() => moveLesson(l.id, courseId, "up"))}
                    title="Yuqoriga"
                    aria-label={`${l.title} — yuqoriga`}
                  >
                    <Icon name="keyboard_arrow_up" size={17} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending || i === lessons.length - 1}
                    onClick={() => run(() => moveLesson(l.id, courseId, "down"))}
                    title="Pastga"
                    aria-label={`${l.title} — pastga`}
                  >
                    <Icon name="keyboard_arrow_down" size={17} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(l)}
                    title="Tahrirlash"
                    aria-label={`${l.title} — tahrirlash`}
                  >
                    <Icon name="edit" size={17} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirmDelete(l)}
                    title="O'chirish"
                    aria-label={`${l.title} — o'chirish`}
                  >
                    <Icon name="delete" size={17} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={creating || editing !== null}
        title={editing ? "Darsni tahrirlash" : "Yangi dars"}
        onClose={close}
        width={620}
      >
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {error && <Alert kind="error">{error}</Alert>}

          <Input
            label="Dars sarlavhasi"
            required
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Birinchi robotingizni yig'amiz"
          />

          <Input
            label="Qisqa izoh"
            value={draft.meta}
            onChange={(e) => setDraft((d) => ({ ...d, meta: e.target.value }))}
            placeholder="Video · 12 daqiqa"
            hint="Dars ro'yxatida sarlavha ostida ko'rinadi"
          />

          <div className="grid-3" style={{ gap: 12 }}>
            <Select
              label="Dars turi"
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              options={TYPES}
            />
            <Input
              label="Davomiyligi (daq)"
              type="number"
              min={0}
              max={600}
              value={draft.durationMin}
              onChange={(e) => setDraft((d) => ({ ...d, durationMin: Number(e.target.value) }))}
            />
            <Input
              label="XP mukofoti"
              type="number"
              min={0}
              max={500}
              value={draft.xpReward}
              onChange={(e) => setDraft((d) => ({ ...d, xpReward: Number(e.target.value) }))}
            />
          </div>

          <Input
            label="Video havolasi"
            type="url"
            value={draft.videoUrl}
            onChange={(e) => setDraft((d) => ({ ...d, videoUrl: e.target.value }))}
            placeholder="https://www.youtube.com/embed/…"
            hint="Bo'sh qoldirsangiz dars sahifasida o'rin egallovchi ko'rinadi"
          />

          <Textarea
            label="Dars matni"
            rows={7}
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="Bolaga tushunarli tilda yozing — qisqa jumlalar, aniq qadamlar."
          />

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
        title="Darsni o'chirish"
        onClose={() => setConfirmDelete(null)}
        width={430}
      >
        <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 20px" }}>
          <strong style={{ color: "var(--text)" }}>{confirmDelete?.title}</strong> darsi va
          o&apos;quvchilarning shu darsdagi progressi o&apos;chadi. Bu amalni qaytarib
          bo&apos;lmaydi.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Bekor qilish
          </Button>
          <Button
            variant="danger"
            icon="delete"
            disabled={isPending}
            onClick={() => confirmDelete && run(() => deleteLesson(confirmDelete.id, courseId))}
          >
            O&apos;chirish
          </Button>
        </div>
      </Modal>
    </>
  );
}
