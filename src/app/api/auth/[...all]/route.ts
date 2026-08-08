import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * better-auth HTTP endpointlari.
 *
 * Kutubxonaning o'z xato matnlari ingliz tilida yozilgan va ularni
 * sozlamalar orqali o'zgartirib bo'lmaydi (masalan cheklovga tushganda
 * `Too many requests. Please try again later.` — matn `rate-limiter` ichida
 * qattiq yozilgan). Bunday javob to'g'ridan-to'g'ri formada ko'rsatilardi,
 * ya'ni butunlay o'zbekcha saytda birdan inglizcha jumla paydo bo'lardi.
 *
 * Shuning uchun javob ustidan bir marta o'tamiz va tanish matnlarni
 * o'zbekchasiga almashtiramiz. Ro'yxatda YO'Q matn tegilmasdan o'tadi —
 * kutubxona yangilanib matn o'zgarsa ham hech narsa buzilmaydi.
 */

const TRANSLATIONS: Record<string, string> = {
  "Too many requests. Please try again later.":
    "Juda ko'p urinish bo'ldi. Biroz kutib, qayta urinib ko'ring.",
  "Invalid email or password": "Email yoki parol noto'g'ri",
  "User already exists": "Bu manzilda hisob allaqachon mavjud",
  "User already exists. Use another email.": "Bu manzilda hisob allaqachon mavjud",
  "Password is too short": "Parol juda qisqa",
  "Password is too long": "Parol juda uzun",
  "User not found": "Bunday foydalanuvchi topilmadi",
  "Session expired": "Sessiya muddati tugadi — qayta kiring",
  "Invalid token": "Havola eskirgan yoki noto'g'ri",
  "Email not verified": "Email hali tasdiqlanmagan",
  "Invalid OTP": "Kod noto'g'ri",
  "OTP expired": "Kod muddati tugadi — yangisini so'rang",
  "Too many attempts": "Juda ko'p urinish — yangi kod so'rang",
  "Banned user": "Hisobingiz bloklangan",
  "You are not allowed to perform this action": "Bu amalni bajarishga ruxsatingiz yo'q",
  // Admin plagini ruxsat bermaganda qaytaradigan matnlar.
  "You are not allowed to change users role":
    "Foydalanuvchi rolini o'zgartirishga ruxsatingiz yo'q",
  "You are not allowed to set users password":
    "Foydalanuvchi parolini o'zgartirishga ruxsatingiz yo'q",
  "You are not allowed to impersonate users": "Boshqa hisob nomidan kirishga ruxsatingiz yo'q",
  "You are not allowed to delete users": "Foydalanuvchini o'chirishga ruxsatingiz yo'q",
  "You are not allowed to ban users": "Foydalanuvchini bloklashga ruxsatingiz yo'q",
  "You are not allowed to list users": "Foydalanuvchilar ro'yxatini ko'rishga ruxsatingiz yo'q",
  "You are not allowed to list users sessions": "Sessiyalarni ko'rishga ruxsatingiz yo'q",
  "You are not allowed to revoke users sessions": "Sessiyalarni tugatishga ruxsatingiz yo'q",
  "You are not allowed to create users": "Foydalanuvchi yaratishga ruxsatingiz yo'q",
  "You are not allowed to update users": "Foydalanuvchini tahrirlashga ruxsatingiz yo'q",
};

/** Javob tanasidagi `message`/`error` matnlarini o'zbekchaga almashtiradi. */
async function localize(response: Response): Promise<Response> {
  if (response.ok) return response;

  /*
   * `content-type` bo'yicha filtrlamaymiz.
   *
   * Cheklov javobi (`Too many requests…`) better-auth ichida oddiy
   * `new Response(JSON.stringify(...))` bilan tuziladi — brauzer uni
   * `text/plain` deb belgilaydi. Ya'ni "faqat application/json" sharti
   * aynan eng ko'p ko'rinadigan xatoni chetlab o'tardi. Buning o'rniga
   * tanani parse qilib ko'ramiz: JSON bo'lmasa javob o'zgarishsiz ketadi.
   */
  const body = await response.clone().text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return response;
  }
  if (typeof parsed !== "object" || parsed === null) return response;

  const data = parsed as Record<string, unknown>;
  let changed = false;
  for (const key of ["message", "error"]) {
    const value = data[key];
    if (typeof value !== "string") continue;
    if (TRANSLATIONS[value]) {
      data[key] = TRANSLATIONS[value];
      changed = true;
      continue;
    }
    // `xp is not allowed to be set` — maydon nomi o'zgaruvchi, shuning uchun naqsh.
    const notAllowed = value.match(/^(\w+) is not allowed to be set$/);
    if (notAllowed) {
      data[key] = `«${notAllowed[1]}» maydonini o'zgartirib bo'lmaydi`;
      changed = true;
    }
  }
  if (!changed) return response;

  // Sarlavhalar (jumladan `set-cookie`) o'zgarishsiz ko'chiriladi.
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(data), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  return localize(await handler.GET(request));
}

export async function POST(request: Request) {
  return localize(await handler.POST(request));
}
