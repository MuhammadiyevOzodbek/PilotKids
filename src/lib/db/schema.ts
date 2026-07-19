import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ─────────────────────────── Better Auth jadvallari ─────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // PilotKids profil maydonlari
  age: integer("age"),
  role: text("role").default("student").notNull(), // student | parent
  xp: integer("xp").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  /** Ota-ona roziligi (serverda tasdiqlanadi, klient checkbox'iga ishonilmaydi). */
  parentConsent: boolean("parent_consent").default(false).notNull(),
  /** Oxirgi faollik sanasi — streak hisoblash uchun. */
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ─────────────────────────── Kontent jadvallari (seed) ─────────────────────────── */

export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  soft: text("soft").notNull(),
  courseCount: text("course_count").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const course = pgTable("course", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  soft: text("soft").notNull(),
  level: text("level").notNull(), // BOSHLANG'ICH | O'RTA | ...
  totalLessons: integer("total_lessons").default(0).notNull(),
  hours: text("hours").notNull(),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lesson = pgTable(
  "lesson",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    title: text("title").notNull(),
    meta: text("meta").notNull(),
    type: text("type").default("video").notNull(), // video | code | quiz | lab
    durationMin: integer("duration_min").default(0).notNull(),
    /** Dars matni (video ostidagi tavsif). */
    content: text("content").default("").notNull(),
    /** Video manbasi (bo'sh bo'lsa placeholder ko'rsatiladi). */
    videoUrl: text("video_url"),
    /** Darsni tugatganda beriladigan XP. */
    xpReward: integer("xp_reward").default(40).notNull(),
  },
  (t) => [unique("lesson_course_order_uq").on(t.courseId, t.sortOrder)],
);

export const badge = pgTable("badge", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  soft: text("soft").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const labProject = pgTable("lab_project", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  soft: text("soft").notNull(),
  diff: text("diff").notNull(),
  diffCol: text("diff_col").notNull(),
  diffBg: text("diff_bg").notNull(),
  parts: text("parts").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const quizQuestion = pgTable("quiz_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => course.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lesson.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctIndex: integer("correct_index").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

/* ─────────────────────────── Foydalanuvchi ma'lumotlari ─────────────────────────── */

export const enrollment = pgTable(
  "enrollment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    progressPercent: integer("progress_percent").default(0).notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("enrollment_user_course_uq").on(t.userId, t.courseId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    status: text("status").default("locked").notNull(), // done | current | locked
    completedAt: timestamp("completed_at"),
  },
  (t) => [unique("lesson_progress_user_lesson_uq").on(t.userId, t.lessonId)],
);

export const userBadge = pgTable(
  "user_badge",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badge.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

export const certificate = pgTable("certificate", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").references(() => course.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  color: text("color").notNull(),
  soft: text("soft").notNull(),
  state: text("state").default("locked").notNull(), // done | progress | locked
  issuedLabel: text("issued_label").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Haftalik faollik (ota-ona paneli grafigi uchun). */
export const dailyActivity = pgTable(
  "daily_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(), // 0=Du ... 6=Ya
    minutes: integer("minutes").default(0).notNull(),
  },
  (t) => [unique("daily_activity_user_day_uq").on(t.userId, t.weekday)],
);

/** AI Tutor (Robo) suhbat xabarlari. */
export const chatMessage = pgTable("chat_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // bot | me
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Quiz javob urinishlari — natija va XP serverda hisoblanadi. */
export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => quizQuestion.id, { onDelete: "cascade" }),
    selectedIndex: integer("selected_index").notNull(),
    correct: boolean("correct").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("quiz_attempt_user_question_uq").on(t.userId, t.questionId)],
);

/** Dars ichidagi shaxsiy eslatmalar. */
export const lessonNote = pgTable(
  "lesson_note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("lesson_note_user_lesson_uq").on(t.userId, t.lessonId)],
);

/** Lab loyihasini boshlash/tugatish holati. */
export const labProgress = pgTable(
  "lab_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => labProject.id, { onDelete: "cascade" }),
    status: text("status").default("started").notNull(), // started | done
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [unique("lab_progress_user_project_uq").on(t.userId, t.projectId)],
);

/** Foydalanuvchi sozlamalari. */
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  theme: text("theme").default("light").notNull(),
  /** Interfeys tili. */
  language: text("language").default("uz").notNull(),
  /** Kunlik ekran vaqti chegarasi (daqiqa) — ota-ona panelidan sozlanadi. */
  dailyLimitMin: integer("daily_limit_min").default(90).notNull(),
});

/* ─────────────────────────── Relations ─────────────────────────── */

export const courseRelations = relations(course, ({ one, many }) => ({
  category: one(category, { fields: [course.categoryId], references: [category.id] }),
  lessons: many(lesson),
}));

export const lessonRelations = relations(lesson, ({ one }) => ({
  course: one(course, { fields: [lesson.courseId], references: [course.id] }),
}));

export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  course: one(course, { fields: [enrollment.courseId], references: [course.id] }),
  user: one(user, { fields: [enrollment.userId], references: [user.id] }),
}));

export type User = typeof user.$inferSelect;
export type Course = typeof course.$inferSelect;
export type Lesson = typeof lesson.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Badge = typeof badge.$inferSelect;
export type LabProject = typeof labProject.$inferSelect;
export type Certificate = typeof certificate.$inferSelect;
export type Notification = typeof notification.$inferSelect;
export type Enrollment = typeof enrollment.$inferSelect;
export type QuizQuestion = typeof quizQuestion.$inferSelect;
export type QuizAttempt = typeof quizAttempt.$inferSelect;
export type LessonNote = typeof lessonNote.$inferSelect;
export type LabProgress = typeof labProgress.$inferSelect;
