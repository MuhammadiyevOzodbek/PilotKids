import { getAdminCategories, getAdminCourses } from "@/lib/admin/queries";
import { CoursesManager } from "./courses-manager";

export const metadata = { title: "Kurslar" };

export default async function AdminCoursesPage() {
  const [courses, categories] = await Promise.all([getAdminCourses(), getAdminCategories()]);

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <CoursesManager
        courses={courses}
        categories={categories.map((c) => ({ id: c.id, title: c.title }))}
      />
    </div>
  );
}
