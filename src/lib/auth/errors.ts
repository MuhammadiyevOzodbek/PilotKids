/** Better Auth xato kodlarini o'zbekcha xabarlarga xaritalaydi. */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email yoki parol noto'g'ri",
  USER_ALREADY_EXISTS: "Bu email allaqachon ro'yxatdan o'tgan",
  EMAIL_NOT_VERIFIED: "Email tasdiqlanmagan",
  INVALID_PASSWORD: "Parol noto'g'ri",
  USER_NOT_FOUND: "Foydalanuvchi topilmadi",
  PASSWORD_TOO_SHORT: "Parol juda qisqa",
  FAILED_TO_CREATE_USER: "Foydalanuvchi yaratib bo'lmadi",
};

export function mapAuthError(error?: { code?: string; message?: string } | null): string {
  if (!error) return "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  return error.message ?? "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
}
