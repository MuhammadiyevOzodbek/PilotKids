import { getAdminCourses } from "@/lib/admin/queries";
import { CoursesManager } from "./courses-manager";

export const metadata = { title: "Kurslar" };

export default async function AdminCoursesPage() {
  const courses = await getAdminCourses();

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <CoursesManager courses={courses} />
    </div>
  );
}
