// Hono context uchun umumiy Variables tipi — auth middleware o'rnatadigan
// foydalanuvchi ma'lumotlari barcha route'larda tip-xavfsiz o'qiladi.
export type AppEnv = {
  Variables: {
    userId: number
    userEmail: string
  }
}
