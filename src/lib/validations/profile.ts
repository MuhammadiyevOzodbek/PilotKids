import { z } from "zod";

/** Profil tahrirlash formasi validatsiyasi. */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak")
    .max(60, "Ism juda uzun"),
  // Bo'sh qiymat = yosh ko'rsatilmagan (null). Raqam bo'lsa 5..100 oralig'ida.
  age: z
    .preprocess(
      (v) => {
        if (v === "" || v === null || v === undefined) return undefined;
        const n = Number(v);
        return Number.isNaN(n) ? v : n;
      },
      z
        .number({ message: "Yosh raqam bo'lishi kerak" })
        .int("Yosh butun son bo'lishi kerak")
        .min(5, "Yosh 5 dan kam bo'lmasin")
        .max(100, "Yosh juda katta")
        .optional(),
    )
    .transform((v) => v ?? null),
  // Bo'sh qiymat = avatar yo'q (null). Aks holda to'g'ri URL bo'lishi kerak.
  avatarUrl: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.union([z.string().url("Havola noto'g'ri formatda"), z.literal("")]).optional(),
    )
    .transform((v) => (v ? v : null)),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileOutput = z.output<typeof profileSchema>;
