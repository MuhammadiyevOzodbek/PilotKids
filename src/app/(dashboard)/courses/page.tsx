import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db, categories } from "@/lib/db";
import { getAllCourses, getEnrolledCourseIds } from "@/lib/db/queries";
import { CourseCatalog } from "@/components/courses/course-catalog";
import type { CourseWithMeta } from "@/components/courses/course-card";

export const metadata: Metadata = { title: "Kurslar" };

export default async function CoursesPage() {
  const user = await requireUser();
  const [allCourses, cats, enrolledIds] = await Promise.all([
    getAllCourses(),
    db.select().from(categories),
    getEnrolledCourseIds(user.id),
  ]);

  const catById = new Map(cats.map((c) => [c.id, c.name]));
  const coursesWithMeta: CourseWithMeta[] = allCourses.map((c) => ({
    ...c,
    categoryName: c.categoryId ? (catById.get(c.categoryId) ?? null) : null,
  }));

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Kurslar katalogi</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          O'zingizga mos kursni tanlang va o'rganishni boshlang.
        </p>
      </header>

      <CourseCatalog
        courses={coursesWithMeta}
        categories={cats.map((c) => ({ id: c.id, name: c.name }))}
        enrolledIds={enrolledIds}
      />
    </div>
  );
}
