import { sql } from "drizzle-orm"
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull(),
  email:     text("email").notNull().unique(),
  password:  text("password").notNull(),          // bcrypt hash
  role:      text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
})

// ─── Courses ─────────────────────────────────────────────────────────────────

export const courses = sqliteTable("courses", {
  id:               text("id").primaryKey(),
  title:            text("title").notNull(),
  instructor:       text("instructor").notNull(),
  category:         text("category").notNull(),
  description:      text("description").notNull().default(""),
  shortDescription: text("short_description").notNull().default(""),
  duration:         text("duration").notNull().default("Self-paced"),
  price:            real("price").notNull().default(0),
  thumbnail:        text("thumbnail").notNull().default(""),
  rating:           real("rating").notNull().default(0),
  students:         integer("students").notNull().default(0),
  level:            text("level", { enum: ["Beginner", "Intermediate", "Advanced"] })
                      .notNull()
                      .default("Beginner"),
  createdAt:        text("created_at").notNull().default(sql`(datetime('now'))`),
})

// ─── Chapters ────────────────────────────────────────────────────────────────

export const chapters = sqliteTable("chapters", {
  id:       text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title:    text("title").notNull(),
  position: integer("position").notNull().default(0),
})

// ─── Lessons ─────────────────────────────────────────────────────────────────

export const lessons = sqliteTable("lessons", {
  id:         text("id").primaryKey(),
  chapterId:  text("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  title:      text("title").notNull(),
  /**
   * "local:<lessonId>"  → stored in /storage/videos/<lessonId>.mp4 (served via protected route)
   * "https://..."       → external YouTube/Vimeo embed URL
   * ""                  → placeholder
   */
  videoUrl:   text("video_url").notNull().default(""),
  duration:   text("duration").notNull().default(""),
  preview:    integer("preview", { mode: "boolean" }).notNull().default(false),
  position:   integer("position").notNull().default(0),
})

// ─── Purchases ───────────────────────────────────────────────────────────────

export const purchases = sqliteTable("purchases", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId:    text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  amount:      real("amount").notNull(),
  paymentId:   text("payment_id").notNull(),
  purchasedAt: text("purchased_at").notNull().default(sql`(datetime('now'))`),
})

// ─── Progress ────────────────────────────────────────────────────────────────

export const progress = sqliteTable("progress", {
  id:       text("id").primaryKey(),
  userId:   text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
})
