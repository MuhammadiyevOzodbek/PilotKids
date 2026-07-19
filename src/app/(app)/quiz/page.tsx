import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth/session";
import { getMainCourse, getQuizQuestions, getQuizAttempts } from "@/lib/queries";
import { QuizClient } from "./quiz-client";

export default async function QuizPage() {
  const user = await requireUser();
  const course = await getMainCourse();

  // `correctIndex` bu yerda umuman olinmaydi — javob faqat serverda tekshiriladi.
  const [questions, attempts] = await Promise.all([
    getQuizQuestions(course?.id),
    getQuizAttempts(user.id),
  ]);

  if (!questions.length) {
    return (
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          textAlign: "center",
          padding: "60px 24px",
          animation: "fadeUp .5s ease both",
        }}
      >
        <span
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "var(--primary-soft)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
          }}
        >
          <Icon name="quiz" size={36} color="var(--primary)" />
        </span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 24,
            margin: "0 0 10px",
            color: "var(--text)",
          }}
        >
          Hozircha test yo&apos;q
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" }}>
          Bu kurs uchun testlar tayyorlanmoqda. Darslarni davom ettiring — test tez orada
          qo&apos;shiladi.
        </p>
        <Link
          href="/courses"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "14px 26px",
            borderRadius: 14,
            background: "var(--primary)",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Kurslarga qaytish
          <Icon name="arrow_forward" size={20} />
        </Link>
      </div>
    );
  }

  const answeredMap = Object.fromEntries(
    attempts.map((a) => [a.questionId, { selectedIndex: a.selectedIndex, correct: a.correct }]),
  );

  return (
    <QuizClient
      questions={questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options }))}
      answered={answeredMap}
      courseTitle={course?.title ?? "Test"}
    />
  );
}
