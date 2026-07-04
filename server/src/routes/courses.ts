import { Hono } from 'hono'
import { and, asc, eq, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.js'
import { courses, categories, enrollments, users } from '../db/schema.js'
import { authMiddleware, optionalAuth } from '../middleware/auth.js'
import { jsonValidator } from '../lib/validate.js'
import { progressSchema } from '../validations/schemas.js'
import { toUserDTO } from '../lib/dto.js'
import type { AppEnv } from '../types.js'

const app = new Hono<AppEnv>()

// Kurs qatorining frontend-mos shakli (mockData bilan bir xil maydonlar)
const courseColumns = {
  id: courses.id,
  title: courses.title,
  slug: courses.slug,
  description: courses.description,
  category: categories.name,
  difficulty: courses.difficulty,
  duration: courses.duration,
  lessons: courses.totalLessons,
  thumbnail: courses.thumbnail,
  isPremium: courses.isPremium,
}

// GET /api/courses  (ixtiyoriy auth — kirgan bo'lsa progress qo'shiladi)
app.get('/', optionalAuth, async (c) => {
  const category = c.req.query('category')
  const userId = c.get('userId') as number | undefined

  const rows = await db
    .select(courseColumns)
    .from(courses)
    .innerJoin(categories, eq(courses.categoryId, categories.id))
    .orderBy(asc(courses.id))

  const filtered =
    category && category !== 'Barchasi'
      ? rows.filter((r) => r.category === category)
      : rows

  let progressMap = new Map<number, number>()
  if (userId) {
    const enr = await db
      .select({ courseId: enrollments.courseId, progress: enrollments.progressPercent })
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
    progressMap = new Map(enr.map((e) => [e.courseId, e.progress]))
  }

  return c.json({
    courses: filtered.map((r) => ({ ...r, progress: progressMap.get(r.id) ?? 0 })),
  })
})

// GET /api/courses/:slug
app.get('/:slug', optionalAuth, async (c) => {
  const slug = c.req.param('slug')
  const userId = c.get('userId') as number | undefined

  const found = await db
    .select(courseColumns)
    .from(courses)
    .innerJoin(categories, eq(courses.categoryId, categories.id))
    .where(eq(courses.slug, slug))
  const course = found[0]
  if (!course) throw new HTTPException(404, { message: 'Kurs topilmadi' })

  let progress = 0
  if (userId) {
    const enr = await db
      .select({ progress: enrollments.progressPercent })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id)))
    progress = enr[0]?.progress ?? 0
  }

  return c.json({ course: { ...course, progress } })
})

// Kurs id'sini param'dan xavfsiz o'qish
function parseCourseId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: 'Kurs id noto\'g\'ri' })
  }
  return id
}

// POST /api/courses/:id/enroll  🔒
app.post('/:id/enroll', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const courseId = parseCourseId(c.req.param('id'))

  const courseExists = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId))
  if (courseExists.length === 0) throw new HTTPException(404, { message: 'Kurs topilmadi' })

  const existing = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
  if (existing[0]) {
    return c.json({ message: 'Siz allaqachon bu kursga yozilgansiz', enrollment: existing[0] })
  }

  const inserted = await db
    .insert(enrollments)
    .values({ userId, courseId, progressPercent: 0 })
    .returning()
  return c.json({ enrollment: inserted[0] }, 201)
})

// PATCH /api/courses/:id/progress  🔒  — progress yangilaydi, XP qo'shadi
app.patch('/:id/progress', authMiddleware, jsonValidator(progressSchema), async (c) => {
  const userId = c.get('userId')
  const courseId = parseCourseId(c.req.param('id'))
  const { progress } = c.req.valid('json')

  const foundCourse = await db.select().from(courses).where(eq(courses.id, courseId))
  const course = foundCourse[0]
  if (!course) throw new HTTPException(404, { message: 'Kurs topilmadi' })

  const foundEnr = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
  const existing = foundEnr[0]

  const oldProgress = existing?.progressPercent ?? 0
  // Progress faqat oldinga siljiydi
  const newProgress = Math.max(oldProgress, progress)
  const delta = newProgress - oldProgress
  // XP: har kurs uchun to'liq bitirish = totalLessons * 10 XP, progressga proporsional
  const xpGain = Math.round((delta / 100) * course.totalLessons * 10)
  const completedAt = newProgress >= 100 ? new Date() : existing?.completedAt ?? null

  if (existing) {
    await db
      .update(enrollments)
      .set({ progressPercent: newProgress, completedAt })
      .where(eq(enrollments.id, existing.id))
  } else {
    await db
      .insert(enrollments)
      .values({ userId, courseId, progressPercent: newProgress, completedAt })
  }

  let userRow
  if (xpGain > 0) {
    const updated = await db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${xpGain}`,
        weeklyXp: sql`${users.weeklyXp} + ${xpGain}`,
      })
      .where(eq(users.id, userId))
      .returning()
    userRow = updated[0]
  } else {
    const found = await db.select().from(users).where(eq(users.id, userId))
    userRow = found[0]
  }

  return c.json({
    progress: newProgress,
    xpGained: xpGain,
    user: userRow ? await toUserDTO(userRow) : null,
  })
})

export default app
