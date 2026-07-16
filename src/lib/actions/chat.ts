"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { chatMessage } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";

/** Robo (AI Tutor) uchun oddiy, kontekstga mos javob — tashqi LLM'siz. */
function roboReply(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("motor"))
    return "Motor bilan ishlaganda avval: 1) simlar to'g'ri portga ulanganini, 2) batareya quvvatini tekshiring. Tezlik uchun analogWrite() ishlating.";
  if (t.includes("sensor") || t.includes("masofa"))
    return "Ultratovush sensori (HC-SR04) masofani o'lchaydi. Trig va Echo pinlarini to'g'ri ulang, so'ng pulseIn() bilan vaqtni o'qing.";
  if (t.includes("kod") || t.includes("xato") || t.includes("error"))
    return "Kodni bosqichma-bosqich tekshiraylik — qaysi qatorda xato chiqyapti? Ko'pincha muammo o'zgaruvchi turi yoki pin raqamida bo'ladi.";
  if (t.includes("led") || t.includes("chiroq"))
    return "LED uchun rezistor (220Ω) ishlatishni unutmang, aks holda LED kuyib qolishi mumkin. digitalWrite(pin, HIGH) bilan yoqasiz.";
  return "Zo'r savol! Buni birga hal qilamiz. Muammoni biroz batafsilroq yozsangiz — qaysi qism ishlamayapti yoki qanday natija kutgansiz?";
}

export async function sendChatMessage(text: string) {
  const user = await requireUser();
  const clean = text.trim().slice(0, 1000);
  if (!clean) return;

  const now = Date.now();
  await db.insert(chatMessage).values([
    { userId: user.id, role: "me", text: clean, createdAt: new Date(now) },
    { userId: user.id, role: "bot", text: roboReply(clean), createdAt: new Date(now + 500) },
  ]);
  revalidatePath("/tutor");
}
