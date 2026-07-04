import { zValidator } from '@hono/zod-validator'
import type { ZodSchema } from 'zod'

// zValidator'ning ustidan yagona xato formati — birinchi Zod xabarini
// {error} sifatida 400 bilan qaytaradi (frontend FormError shu maydonni ko'rsatadi).
export function jsonValidator<T extends ZodSchema>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const first = result.error.issues[0]
      return c.json({ error: first?.message ?? 'Ma\'lumot noto\'g\'ri' }, 400)
    }
  })
}
