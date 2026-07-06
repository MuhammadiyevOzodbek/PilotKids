import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* ───────────────────────────── Enumlar ───────────────────────────── */
export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced"]);
export const planEnum = pgEnum("plan", ["free", "premium"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "expired",
]);

/* ───────────────────── Darajalar (ranks) ───────────────────── */
export const ranks = pgTable("ranks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  minXp: integer("min_xp").notNull().default(0),
  badge: text("badge").notNull(),
  order: integer("order").notNull(),
});

/* ─────────────── Better Auth: user (+ ilova maydonlari) ─────────────── */
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Ilova maydonlari
  avatarUrl: text("avatar_url"),
  age: integer("age"),
  xp: integer("xp").notNull().default(0),
  rankId: uuid("rank_id").references(() => ranks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ─────────────── Better Auth: session ─────────────── */
export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

/* ─────────────── Better Auth: account (parol + OAuth) ─────────────── */
export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ─────────────── Better Auth: verification ─────────────── */
export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ───────────────────── Kategoriyalar ───────────────────── */
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

/* ───────────────────── Kurslar ───────────────────── */
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  difficulty: difficultyEnum("difficulty").notNull().default("beginner"),
  durationHours: integer("duration_hours").notNull().default(0),
  totalLessons: integer("total_lessons").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  isPremium: boolean("is_premium").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ───────────────────── Darslar (lessons) ───────────────────── */
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    order: integer("order").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(0),
  },
  (t) => [unique("lessons_course_order_unique").on(t.courseId, t.order)],
);

/* ─────────────── Test savollari (quiz_questions) ─────────────── */
export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    // Variantlar ro'yxati (2–5 ta). To'g'ri javob indeksi correctIndex.
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull().default(0),
    order: integer("order").notNull(),
  },
  (t) => [unique("quiz_questions_lesson_order_unique").on(t.lessonId, t.order)],
);

/* ─────────── Dars yakunlashlari (lesson_completions) ─────────── */
export const lessonCompletions = pgTable(
  "lesson_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (t) => [unique("lesson_completions_user_lesson_unique").on(t.userId, t.lessonId)],
);

/* ───────────────────── Ro'yxatga olishlar (enrollments) ───────────────────── */
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    progressPercent: integer("progress_percent").notNull().default(0),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("enrollments_user_course_unique").on(t.userId, t.courseId)],
);

/* ───────────────────── Bildirishnomalar ───────────────────── */
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ───────────────────── Obunalar ───────────────────── */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
});

/* ───────────────────── Relations ───────────────────── */
export const usersRelations = relations(users, ({ one, many }) => ({
  rank: one(ranks, { fields: [users.rankId], references: [ranks.id] }),
  enrollments: many(enrollments),
  notifications: many(notifications),
  subscriptions: many(subscriptions),
}));

export const ranksRelations = relations(ranks, ({ many }) => ({
  users: many(users),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  enrollments: many(enrollments),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, { fields: [lessons.courseId], references: [courses.id] }),
  completions: many(lessonCompletions),
  questions: many(quizQuestions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  lesson: one(lessons, { fields: [quizQuestions.lessonId], references: [lessons.id] }),
}));

export const lessonCompletionsRelations = relations(lessonCompletions, ({ one }) => ({
  user: one(users, { fields: [lessonCompletions.userId], references: [users.id] }),
  lesson: one(lessons, { fields: [lessonCompletions.lessonId], references: [lessons.id] }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

/* ───────────────────── Tip aliaslari ───────────────────── */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Rank = typeof ranks.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;
export type LessonCompletion = typeof lessonCompletions.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
