import { getQuizQuestion } from "@/lib/queries";
import { QuizClient } from "./quiz-client";

export default async function QuizPage() {
  const q = await getQuizQuestion();
  const prompt =
    q?.prompt ?? "Qaysi qism masofani sezib, robotning to'siqqa urilishiga yo'l qo'ymaydi?";
  const options = q?.options ?? ["Ultratovush sensori", "LED chiroq", "Rezistor", "Batareya bloki"];
  const correctIndex = q?.correctIndex ?? 0;
  return <QuizClient prompt={prompt} options={options} correctIndex={correctIndex} />;
}
