"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessage } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getChatMessages } from "@/lib/queries";
import { askRobo } from "@/lib/ai/gemini";
import { buildRoboContext } from "@/lib/ai/context";
import { checkUserInput, INJECTION_REPLY } from "@/lib/ai/safety";
import { checkLimit } from "@/lib/rate-limit";
import { chatInputSchema, firstError } from "@/lib/validation";

/** Gemini ishlamasa ishlatiladigan zaxira javob — tashqi LLM'siz. */
function roboReply(q: string, name: string): string {
  const t = q.toLowerCase();
  if (t.includes("motor"))
    return `${name}, motor bilan ishlaganda avval: 1) simlar to'g'ri portga ulanganini, 2) batareya quvvatini tekshiring. Tezlik uchun analogWrite() ishlating.`;
  if (t.includes("sensor") || t.includes("masofa"))
    return "Ultratovush sensori (HC-SR04) masofani o'lchaydi. Trig va Echo pinlarini to'g'ri ulang, so'ng pulseIn() bilan vaqtni o'qing.";
  if (t.includes("kod") || t.includes("xato") || t.includes("error"))
    return "Kodni bosqichma-bosqich tekshiraylik — qaysi qatorda xato chiqyapti? Ko'pincha muammo o'zgaruvchi turi yoki pin raqamida bo'ladi.";
  if (t.includes("led") || t.includes("chiroq"))
    return "LED uchun rezistor (220Ω) ishlatishni unutmang, aks holda LED kuyib qolishi mumkin. digitalWrite(pin, HIGH) bilan yoqasiz.";
  return `Zo'r savol, ${name}! Buni birga hal qilamiz. Muammoni biroz batafsilroq yozsangiz — qaysi qism ishlamayapti yoki qanday natija kutgansiz?`;
}

/** Foydalanuvchi va Robo xabarlarini bitta tranzaksiyada yozadi. */
async function persist(userId: string, question: string, reply: string) {
  const now = Date.now();
  await db.insert(chatMessage).values([
    { userId, role: "me", text: question, createdAt: new Date(now) },
    { userId, role: "bot", text: reply, createdAt: new Date(now + 500) },
  ]);
  revalidatePath("/tutor");
}

export async function sendChatMessage(text: string) {
  const user = await requireUser();

  // 1. Kirishni validatsiya qilamiz.
  const parsed = chatInputSchema.safeParse(text);
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) };
  const question = parsed.data;

  // 2. Rate limit — Gemini kvotasi va DB'ni himoya qiladi.
  if (!(await checkLimit("ai", user.id))) {
    return {
      ok: false as const,
      error: "Robo biroz dam olsin 🙂 Bir necha daqiqadan so'ng qayta yozing.",
    };
  }

  // 3. Prompt injection tekshiruvi — shubhali xabar modelga umuman bormaydi.
  const check = checkUserInput(question);
  if (!check.safe) {
    if (check.reason === "injection") {
      await persist(user.id, question, INJECTION_REPLY);
      return { ok: true as const, filtered: true };
    }
    return { ok: false as const, error: "Xabar juda uzun yoki bo'sh" };
  }

  // 4. Foydalanuvchining O'Z konteksti + suhbat tarixi bilan javob olamiz.
  const [ctx, history] = await Promise.all([buildRoboContext(user.id), getChatMessages(user.id)]);

  const reply = (await askRobo(question, ctx, history)) ?? roboReply(question, ctx.name);
  await persist(user.id, question, reply);

  return { ok: true as const, filtered: false };
}

/** Suhbat tarixini tozalash. */
export async function clearChatHistory() {
  const user = await requireUser();
  await db.delete(chatMessage).where(eq(chatMessage.userId, user.id));
  revalidatePath("/tutor");
  return { ok: true as const };
}

/** Bitta xabarni o'chirish (faqat o'zinikini). */
export async function deleteChatMessage(id: string) {
  const user = await requireUser();
  await db.delete(chatMessage).where(and(eq(chatMessage.id, id), eq(chatMessage.userId, user.id)));
  revalidatePath("/tutor");
  return { ok: true as const };
}
