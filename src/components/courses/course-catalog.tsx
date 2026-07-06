"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { CourseCard, type CourseWithMeta } from "@/components/courses/course-card";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/course-utils";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
}

export function CourseCatalog({
  courses,
  categories,
  enrolledIds,
}: {
  courses: CourseWithMeta[];
  categories: CategoryOption[];
  enrolledIds: string[];
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (categoryId !== "all" && c.categoryId !== categoryId) return false;
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      if (q && !c.title.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [courses, search, categoryId, difficulty]);

  return (
    <div className="space-y-6">
      {/* Filtrlar */}
      <div className="glass space-y-4 rounded-2xl p-4">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kurs qidirish..."
            aria-label="Kurs qidirish"
            className="border-input bg-card/50 focus:border-primary focus:ring-primary/40 h-11 w-full rounded-xl border pr-3 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
            <SlidersHorizontal className="size-4" /> Kategoriya:
          </span>
          <FilterPill active={categoryId === "all"} onClick={() => setCategoryId("all")}>
            Barchasi
          </FilterPill>
          {categories.map((cat) => (
            <FilterPill
              key={cat.id}
              active={categoryId === cat.id}
              onClick={() => setCategoryId(cat.id)}
            >
              {cat.name}
            </FilterPill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">Daraja:</span>
          <FilterPill active={difficulty === "all"} onClick={() => setDifficulty("all")}>
            Barchasi
          </FilterPill>
          {DIFFICULTY_ORDER.map((d) => (
            <FilterPill key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_LABELS[d]}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Natijalar */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <p className="text-muted-foreground">Bu filtrlarga mos kurs topilmadi.</p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{filtered.length} ta kurs topildi</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} enrolled={enrolledSet.has(course.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-gradient-signature text-white"
          : "glass text-foreground/75 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
