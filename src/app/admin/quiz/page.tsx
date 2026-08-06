import { getAdminCourses, getAdminQuestions } from "@/lib/admin/queries";
import { QuizManager } from "./quiz-manager";

export const metadata = { title: "Test savollari" };

export default async function AdminQuizPage() {
  const [questions, courses] = await Promise.all([getAdminQuestions(), getAdminCourses()]);

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <QuizManager
        questions={questions.map((q) => ({ ...q, options: q.options ?? [] }))}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
      />
    </div>
  );
}
