"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  Select,
  Tag,
  Textarea,
} from "@/components/admin/ui";
import { createCourse, deleteCourse, updateCourse } from "@/lib/admin/actions";

export interface AdminCourseRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  soft: string;
  level: string;
  hours: string;
  featured: boolean;
  sortOrder: number;
  categoryId: string | null;
  categoryTitle: string | null;
  lessonCount: number;
}

export interface CategoryOption {
  id: string;
  title: string;
}

const LEVELS = ["BOSHLANG'ICH", "O'RTA", "YUQORI"];

/** Ranglar tanlovi — inline hex o'rniga tayyor palitradan. */
const COLORS = [
  { label: "Ko'k", color: "#2F6BF3", soft: "var(--primary-soft)" },
  { label: "Yashil", color: "#0FA46E", soft: "var(--success-soft)" },
  { label: "Binafsha", color: "#8B5CF6", soft: "var(--fun-violet-soft)" },
  { label: "Sariq", color: "#F5A524", soft: "var(--fun-amber-soft)" },
  { label: "Pushti", color: "#EC4899", soft: "var(--fun-pink-soft)" },
  { label: "Moviy", color: "#06B6D4", soft: "var(--fun-cyan-soft)" },
];

type Draft = {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  icon: string;
  color: string;
  soft: string;
  level: string;
  hours: string;
  featured: boolean;
  sortOrder: number;
};

const emptyDraft: Draft = {
  slug: "",
  title: "",
  description: "",
  categoryId: "",
  icon: "smart_toy",
  color: COLORS[0]!.color,
  soft: COLORS[0]!.soft,
  level: LEVELS[0]!,
  hours: "4 soat",
  featured: false,
  sortOrder: 0,
};

/** Sarlavhadan slug taklif qiladi (foydalanuvchi o'zgartira oladi). */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CoursesManager({
  courses,
  categories,
}: {
  courses: AdminCourseRow[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCourseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmDelete, setConfirmDelete] = useState<AdminCourseRow | null>(null);

  function openCreate() {
    setDraft({ ...emptyDraft, sortOrder: courses.length });
    setError(null);
    setCreating(true);
  }

  function openEdit(c: AdminCourseRow) {
    setDraft({
      slug: c.slug,
      title: c.title,
      description: c.description,
      categoryId: c.categoryId ?? "",
      icon: c.icon,
      color: c.color,
      soft: c.soft,
      level: c.level,
      hours: c.hours,
      featured: c.featured,
      sortOrder: c.sortOrder,
    });
    setError(null);
    setEditing(c);
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
      categoryId: draft.categoryId || null,
      sortOrder: Number(draft.sortOrder) || 0,
    };

    startTransition(async () => {
      const res = editing ? await updateCourse(editing.id, payload) : await createCourse(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  function remove(c: AdminCourseRow) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCourse(c.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmDelete(null);
      router.refresh();
    });
  }

  const categoryOptions = [
    { value: "", label: "Kategoriyasiz" },
    ...categories.map((c) => ({ value: c.id, label: c.title })),
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
            Kurslar
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 15.5, margin: 0 }}>
            {courses.length} ta kurs · darslarni kurs ichidan boshqarasiz
          </p>
        </div>
        <Button icon="add" onClick={openCreate}>
          Yangi kurs
        </Button>
      </div>

      {error && !creating && !editing && (
        <div style={{ marginBottom: 16 }}>
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {courses.length === 0 ? (
        <Card>
          <EmptyState
            icon="school"
            title="Hali kurs yo'q"
            hint="Birinchi kursni qo'shib, unga darslar joylang."
            action={
              <Button icon="add" onClick={openCreate}>
                Yangi kurs
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid-3" style={{ gap: 16 }}>
          {courses.map((c) => (
            <article
              key={c.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  height: 96,
                  background: c.soft,
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                }}
              >
                <Icon name={c.icon} size={42} color={c.color} />
                {c.featured && (
                  <span style={{ position: "absolute", top: 10, right: 10 }}>
                    <Tag color="var(--fun-amber)" bg="var(--fun-amber-soft)">
                      Tanlangan
                    </Tag>
                  </span>
                )}
              </div>

              <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                <h2
                  className="font-display"
                  style={{ fontWeight: 700, fontSize: 17, margin: "0 0 6px", color: "var(--text)" }}
                >
                  {c.title}
                </h2>
                <p
                  style={{
                    color: "var(--text-3)",
                    fontSize: 13.5,
                    margin: "0 0 12px",
                    fontWeight: 600,
                  }}
                >
                  {c.lessonCount} dars · {c.hours} · {c.level}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  <Tag>{c.categoryTitle ?? "Kategoriyasiz"}</Tag>
                  <Tag>/{c.slug}</Tag>
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/admin/courses/${c.id}`} style={{ flex: 1, minWidth: 120 }}>
                    <Button size="sm" icon="list" style={{ width: "100%" }}>
                      Darslar
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Tahrirlash">
                    <Icon name="edit" size={17} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirmDelete(c)}
                    title="O'chirish"
                  >
                    <Icon name="delete" size={17} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Yaratish / tahrirlash */}
      <Modal
        open={creating || editing !== null}
        title={editing ? "Kursni tahrirlash" : "Yangi kurs"}
        onClose={close}
      >
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {error && <Alert kind="error">{error}</Alert>}

          <Input
            label="Sarlavha"
            required
            value={draft.title}
            onChange={(e) => {
              const title = e.target.value;
              setDraft((d) => ({
                ...d,
                title,
                // Yangi kursda slug sarlavhaga ergashadi; mavjudini qo'lda
                // o'zgartirmasak, havolalar buzilmasin deb tegmaymiz.
                slug: editing ? d.slug : slugify(title),
              }));
            }}
            placeholder="Robototexnika asoslari"
          />

          <Input
            label="Slug (havola manzili)"
            required
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            hint={`Sayt manzili: /courses/${draft.slug || "…"}`}
            placeholder="robototexnika-asoslari"
          />

          <Textarea
            label="Tavsif"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Bu kursda nima o'rganiladi?"
          />

          <div className="grid-2" style={{ gap: 12 }}>
            <Select
              label="Kategoriya"
              value={draft.categoryId}
              onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
              options={categoryOptions}
            />
            <Select
              label="Daraja"
              value={draft.level}
              onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value }))}
              options={LEVELS.map((l) => ({ value: l, label: l }))}
            />
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            <Input
              label="Ikonka nomi"
              required
              value={draft.icon}
              onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))}
              hint="Material Symbols nomi, masalan: smart_toy"
            />
            <Input
              label="Davomiyligi"
              value={draft.hours}
              onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
              placeholder="4 soat"
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
              Rang
            </span>
            <div
              role="radiogroup"
              aria-label="Kurs rangi"
              style={{ display: "flex", gap: 9, flexWrap: "wrap" }}
            >
              {COLORS.map((c) => {
                const selected = draft.color === c.color;
                return (
                  <button
                    key={c.color}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={c.label}
                    onClick={() => setDraft((d) => ({ ...d, color: c.color, soft: c.soft }))}
                    className="tap"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: c.soft,
                      border: `2px solid ${selected ? c.color : "transparent"}`,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: c.color,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid-2" style={{ gap: 12, alignItems: "end" }}>
            <Input
              label="Tartib raqami"
              type="number"
              min={0}
              value={draft.sortOrder}
              onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) }))}
              hint="Kichik raqam yuqorida turadi"
            />
            <div style={{ paddingBottom: 12 }}>
              <Checkbox
                label="Bosh sahifada ko'rsatilsin"
                checked={draft.featured}
                onChange={(e) => setDraft((d) => ({ ...d, featured: e.target.checked }))}
              />
            </div>
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

      {/* O'chirishni tasdiqlash */}
      <Modal
        open={confirmDelete !== null}
        title="Kursni o'chirish"
        onClose={() => setConfirmDelete(null)}
        width={440}
      >
        <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}>
          <strong style={{ color: "var(--text)" }}>{confirmDelete?.title}</strong> kursi,{" "}
          {confirmDelete?.lessonCount} ta darsi va o&apos;quvchilarning shu kursdagi progressi
          o&apos;chadi.
        </p>
        <p style={{ color: "var(--danger)", fontSize: 14.5, fontWeight: 600, margin: "0 0 20px" }}>
          Bu amalni qaytarib bo&apos;lmaydi.
        </p>
        {error && (
          <div style={{ marginBottom: 14 }}>
            <Alert kind="error">{error}</Alert>
          </div>
        )}
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
