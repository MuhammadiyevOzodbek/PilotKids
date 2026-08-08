import { z } from "zod";

/**
 * Zod xato matnlarini o'zbekchaga o'giradi.
 *
 * Zod'da o'zbek tili yo'q, shuning uchun sxemada o'z matnimiz ko'rsatilmagan
 * har qanday holatda ingliz tilidagi matn chiqib qolardi. Masalan formani
 * chetlab o'tib `age`siz so'rov yuborilsa, foydalanuvchi
 * «Invalid input: expected number, received undefined» degan xabar olardi —
 * butunlay o'zbekcha saytda.
 *
 * Shu bois global zaxira matn o'rnatiladi. Ustuvorlik tartibi Zod'da shunday:
 * sxemadagi matn → shu yerdagi `customError` → Zod'ning ingliz standarti.
 * Ya'ni `.min(5, "Yosh kamida 5 bo'lsin")` kabi aniq matnlar o'zgarmaydi,
 * bu yer faqat qolgan barcha holatlarni yopadi.
 *
 * Modul import qilinishining o'ziyoq sozlashni bajaradi (`validation.ts` uni
 * birinchi bo'lib import qiladi), shuning uchun alohida chaqirish shart emas.
 */

const TYPE_NAMES: Record<string, string> = {
  string: "matn",
  number: "son",
  boolean: "ha/yo'q qiymati",
  object: "ma'lumot",
  array: "ro'yxat",
  date: "sana",
};

function uzbekMessage(issue: z.core.$ZodRawIssue): string | undefined {
  switch (issue.code) {
    case "invalid_type": {
      // Qiymat umuman kelmagan bo'lsa — «to'ldiring» degani aniqroq.
      if (issue.input === undefined || issue.input === null) return "Bu maydonni to'ldiring";
      const expected = TYPE_NAMES[String(issue.expected)] ?? String(issue.expected);
      return `Bu yerga ${expected} kiritilishi kerak`;
    }
    case "too_small":
      return issue.origin === "string" || issue.origin === "array"
        ? `Juda qisqa (kamida ${issue.minimum})`
        : `Qiymat juda kichik (kamida ${issue.minimum})`;
    case "too_big":
      return issue.origin === "string" || issue.origin === "array"
        ? `Juda uzun (ko'pi bilan ${issue.maximum})`
        : `Qiymat juda katta (ko'pi bilan ${issue.maximum})`;
    case "invalid_format":
      return "Format noto'g'ri";
    case "invalid_value":
      return "Ruxsat etilmagan qiymat";
    case "not_multiple_of":
      return "Qiymat mos kelmadi";
    case "unrecognized_keys":
      return "Ortiqcha maydon yuborildi";
    case "invalid_union":
      return "Qiymat mos kelmadi";
    case "invalid_key":
    case "invalid_element":
      return "Ma'lumot noto'g'ri";
    default:
      return "Ma'lumot noto'g'ri";
  }
}

z.config({ customError: uzbekMessage });

export {};
