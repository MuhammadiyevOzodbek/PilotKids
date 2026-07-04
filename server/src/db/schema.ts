import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// --- Ranks (darajalar) — mockData RANKS'dan seed qilinadi ---
export const ranks = pgTable('ranks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  emoji: text('emoji').notNull(),
  minXp: integer('min_xp').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// --- Categories (kurs toifalari) ---
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
})

// --- Courses (kurslar) ---
// duration/difficulty — matn (frontend aynan shu ko'rinishda ko'rsatadi,
// masalan "8 hafta", "Boshlang'ich").
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  difficulty: text('difficulty').notNull(),
  duration: text('duration').notNull(),
  totalLessons: integer('total_lessons').notNull(),
  thumbnail: text('thumbnail').notNull(),
  isPremium: boolean('is_premium').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// --- Users ---
// weeklyXp/badges — Ranking sahifasi ko'rsatadigan denormalizatsiyalangan
// maydonlar. rank `xp`dan hisoblanadi (ranks jadvalidan), alohida saqlanmaydi.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  age: integer('age'),
  xp: integer('xp').notNull().default(0),
  weeklyXp: integer('weekly_xp').notNull().default(0),
  badges: integer('badges').notNull().default(0),
  isPremium: boolean('is_premium').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// --- Enrollments (foydalanuvchi ↔ kurs, progress) ---
export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    progressPercent: integer('progress_percent').notNull().default(0),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    // Bir user bitta kursga faqat bir marta yozila oladi
    userCourseUnq: uniqueIndex('enrollments_user_course_unq').on(t.userId, t.courseId),
  })
)

// --- Notifications ---
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// --- Subscriptions (Premium obuna) ---
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull(),
  status: text('status').notNull(),
  startDate: timestamp('start_date').notNull().defaultNow(),
  endDate: timestamp('end_date'),
})
