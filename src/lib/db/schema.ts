import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  date,
  timestamp,
  uuid,
  jsonb,
  index,
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
  /** Telefon raqami (phone-number plugin) — +998… formatida. */
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified").default(false).notNull(),
  /** Telegram Login Widget orqali tasdiqlangan identifikator. */
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  telegramFirstName: text("telegram_first_name"),
  telegramLastName: text("telegram_last_name"),
  telegramPhotoUrl: text("telegram_photo_url"),
  // PilotKids profil maydonlari
  age: integer("age"),
  role: text("role").default("student").notNull(), // student | parent | admin | superadmin
  xp: integer("xp").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  /** Ota-ona roziligi (serverda tasdiqlanadi, klient checkbox'iga ishonilmaydi). */
  parentConsent: boolean("parent_consent").default(false).notNull(),
  /**
   * Onboarding tugallanganmi. OAuth/telefon/Telegram orqali kelgan foydalanuvchida
   * yosh va ota-ona roziligi bo'lmaydi — ular `/welcome` sahifasida so'raladi.
   * `false` bo'lsa ilova sahifalariga kirish yopiq.
   */
  onboarded: boolean("onboarded").default(false).notNull(),
  /* admin plugin maydonlari */
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  /** Oxirgi faollik sanasi — streak hisoblash uchun. */
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable(
  "session",
  {
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
    /** admin plugin — qaysi admin nomidan kirilgan (impersonation). */
    impersonatedBy: text("impersonated_by"),
  },
  /*
   * Indekslar SXEMADA turishi SHART.
   *
   * Ilgari ular faqat qo'lda yozilgan SQL migratsiyalarida edi. Kimdir
   * `db:push` ishlatsa, drizzle-kit sxemada ko'rinmagan indekslarni
   * "ortiqcha" deb topib o'chirishni taklif qilardi — tasdiqlansa
   * barcha so'rovlar to'liq skanerlashga tushardi.
   *
   * Sessiya jadvali eng tez o'sadiganlardan biri: foydalanuvchi ×
   * qurilma. Superadmin paneli har bir admin uchun uchta
   * korrelyatsiyalangan pastki so'rov yuboradi.
   */
  (t) => [
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt),
  ],
);

export const account = pgTable(
  "account",
  {
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
  },
  (t) => [unique("account_provider_account_uq").on(t.providerId, t.accountId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Better Auth ning brute-force hisoblagichi.
 *
 * Hisoblagich BAZADA turishi shart. Standart holatda u jarayon
 * XOTIRASIDA saqlanadi, ya'ni har bir server nusxasi o'z hisobini
 * yuritadi — serverless yoki bir nechta instansiyali deploy'da parol
 * tanlash cheklovi (5 daqiqada 8 urinish) instansiyalar soniga
 * ko'paytirilgan holda ishlardi.
 *
 * Ustun nomlari better-auth kutgan ko'rinishda (`key`, `count`,
 * `lastRequest`) — ular o'zgartirilsa adapter jadvalni topa olmaydi.
 */
export const rateLimit = pgTable("rateLimit", {
  id: text("id").primaryKey(),
  /** Cheklov kaliti: `<yo'l>:<IP yoki foydalanuvchi>`. */
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  /** Oxirgi so'rov vaqti — millisekundda (Unix). */
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
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
  /**
   * Loyiha qayerda bajariladi:
   *   online  — brauzerda (simulyator, kod), qurilma kerak emas
   *   offline — haqiqiy qurilma bilan (Arduino, sensor, LED)
   * Bazada `lab_project_kind_check` cheklovi bilan qo'riqlanadi.
   */
  kind: text("kind").default("offline").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const quizQuestion = pgTable(
  "quiz_question",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").references(() => course.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").references(() => lesson.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("quiz_question_course_idx").on(t.courseId)],
);

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
  (t) => [
    unique("enrollment_user_course_uq").on(t.userId, t.courseId),
    index("enrollment_user_idx").on(t.userId),
  ],
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
    /**
     * Shu dars uchun XP berilganmi.
     *
     * Faqat `status` ga qarab bo'lmaydi: dars "done" bo'lib, XP beruvchi
     * so'rov uzilib qolishi mumkin edi — keyingi urinishda tizim
     * "allaqachon bajarilgan" deb XP ni ABADIY bermay qo'yardi. Bayroq
     * XP bilan BITTA tranzaksiyada qo'yiladi, shuning uchun ikki marta
     * ham berilmaydi.
     */
    xpAwarded: boolean("xp_awarded").default(false).notNull(),
  },
  (t) => [
    unique("lesson_progress_user_lesson_uq").on(t.userId, t.lessonId),
    index("lesson_progress_user_idx").on(t.userId),
  ],
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

export const certificate = pgTable(
  "certificate",
  {
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
  },
  (t) => [
    unique("certificate_user_course_uq").on(t.userId, t.courseId),
    index("certificate_course_idx").on(t.courseId),
  ],
);

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Kunlik faollik (ota-ona paneli grafigi va ekran vaqti nazorati uchun).
 *
 * ── Nega SANA kerak ─────────────────────────────────────────────────────
 * Ilgari bu yerda faqat `weekday` (0..6) bor edi va daqiqalar
 * `minutes + minutes` bilan ustiga qo'shilardi. Ya'ni qiymat HECH QACHON
 * nolga qaytmasdi: har dushanba 20 daqiqa o'qigan bola o'n hafta o'tib
 * "bugun 200 daqiqa" ko'rsatardi va kunlik chegara doimiy oshgan bo'lib
 * turardi. Sana bilan har kun o'z qatorini oladi.
 */
export const dailyActivity = pgTable(
  "daily_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Kun — `YYYY-MM-DD`. Vaqt mintaqasi Toshkent bo'yicha hisoblanadi. */
    day: date("day").notNull(),
    minutes: integer("minutes").default(0).notNull(),
  },
  (t) => [
    unique("daily_activity_user_date_uq").on(t.userId, t.day),
    index("daily_activity_user_day_idx").on(t.userId, t.day),
  ],
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

/** Bosh admin audit jurnali — platformadagi xavfli/amaldor mutatsiyalar. */
export const superadminAuditLog = pgTable("superadmin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  ipAddress: text("ip_address"),
  impact: text("impact").default("low").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export type SuperadminAuditLog = typeof superadminAuditLog.$inferSelect;
