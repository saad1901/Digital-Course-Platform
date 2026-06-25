/**
 * Run on server startup (imported in instrumentation.ts).
 * Creates all tables if they don't exist and seeds admin + demo data.
 */
import Database from "better-sqlite3"
import path from "path"
import { db } from "./index"
import { users, courses, chapters, lessons } from "./schema"
import { hashPassword, uid } from "@/lib/auth"
import { eq } from "drizzle-orm"

const DB_PATH = path.join(process.cwd(), "storage", "learnhub.db")

function runMigrations() {
  // Raw SQLite for DDL (drizzle-kit push is the proper way, but for simplicity we use
  // CREATE TABLE IF NOT EXISTS so the app is self-bootstrapping without a separate migrate step)
  const sqlite = new Database(DB_PATH)

  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      instructor        TEXT NOT NULL,
      category          TEXT NOT NULL,
      description       TEXT NOT NULL DEFAULT '',
      short_description TEXT NOT NULL DEFAULT '',
      duration          TEXT NOT NULL DEFAULT 'Self-paced',
      price             REAL NOT NULL DEFAULT 0,
      thumbnail         TEXT NOT NULL DEFAULT '',
      rating            REAL NOT NULL DEFAULT 0,
      students          INTEGER NOT NULL DEFAULT 0,
      level             TEXT NOT NULL DEFAULT 'Beginner'
                          CHECK(level IN ('Beginner','Intermediate','Advanced')),
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id        TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title     TEXT NOT NULL,
      position  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id          TEXT PRIMARY KEY,
      chapter_id  TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      video_url   TEXT NOT NULL DEFAULT '',
      duration    TEXT NOT NULL DEFAULT '',
      preview     INTEGER NOT NULL DEFAULT 0,
      position    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      amount       REAL NOT NULL,
      payment_id   TEXT NOT NULL,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS progress (
      id        TEXT PRIMARY KEY,
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      UNIQUE(user_id, lesson_id)
    );
  `)

  sqlite.close()
}

async function seedIfEmpty() {
  const existing = db.select().from(users).all()
  if (existing.length > 0) return   // already seeded

  const adminHash = await hashPassword("admin123")
  const studentHash = await hashPassword("student123")

  // Seed users
  db.insert(users).values([
    { id: "admin-1", name: "Platform Admin", email: "admin@learnhub.com", password: adminHash, role: "admin" },
    { id: "user-1",  name: "Demo Student",   email: "student@learnhub.com", password: studentHash, role: "user" },
  ]).run()

  // Seed courses
  const seedCourses = [
    {
      id: "web-dev",
      title: "The Complete Web Development Bootcamp",
      instructor: "Sarah Mitchell",
      category: "Development",
      shortDescription: "Go from zero to full-stack developer with HTML, CSS, JavaScript, and React.",
      description: "Master modern web development from the ground up. This comprehensive bootcamp covers HTML5, CSS3, JavaScript ES6+, React, and backend fundamentals.",
      price: 1299,
      thumbnail: "/courses/web-development.png",
      rating: 4.8,
      students: 12840,
      level: "Beginner" as const,
      duration: "28h 15m",
      chaptersData: [
        { title: "Getting Started with the Web", lessons: [["Course Introduction","4:12"],["How the Web Works","10:30"],["Setting Up Your Editor","7:45"]] },
        { title: "HTML & CSS Foundations",       lessons: [["HTML Document Structure","12:20"],["Styling with CSS","15:05"],["Flexbox & Grid Layout","18:40"]] },
        { title: "JavaScript Essentials",        lessons: [["Variables & Data Types","11:10"],["Functions & Scope","14:25"],["DOM Manipulation","16:50"]] },
      ],
    },
    {
      id: "data-science",
      title: "Data Science & Machine Learning A-Z",
      instructor: "Dr. Raj Patel",
      category: "Data Science",
      shortDescription: "Learn Python, statistics, and ML models with real-world datasets.",
      description: "Dive into the world of data science. Learn data wrangling with Pandas, visualization, statistical analysis, and build machine learning models with scikit-learn.",
      price: 1799,
      thumbnail: "/courses/data-science.png",
      rating: 4.7,
      students: 9320,
      level: "Intermediate" as const,
      duration: "19h 45m",
      chaptersData: [
        { title: "Python for Data Science", lessons: [["NumPy Fundamentals","13:00"],["Pandas DataFrames","19:15"]] },
        { title: "Machine Learning Models", lessons: [["Linear Regression","20:30"],["Classification Models","22:10"],["Model Evaluation","17:45"]] },
      ],
    },
    {
      id: "ui-ux",
      title: "UI/UX Design Masterclass",
      instructor: "Elena Rodriguez",
      category: "Design",
      shortDescription: "Design beautiful, user-friendly interfaces with Figma.",
      description: "Become a confident product designer. This masterclass teaches design principles, user research, wireframing, prototyping in Figma, and building design systems.",
      price: 999,
      thumbnail: "/courses/ui-ux-design.png",
      rating: 4.9,
      students: 7610,
      level: "Beginner" as const,
      duration: "16h 05m",
      chaptersData: [
        { title: "Design Foundations",  lessons: [["Principles of Visual Design","12:40"],["Color & Typography","15:20"]] },
        { title: "Designing in Figma",  lessons: [["Figma Basics","14:00"],["Components & Auto Layout","18:30"],["Prototyping","16:15"]] },
      ],
    },
    {
      id: "marketing",
      title: "Digital Marketing Complete Guide",
      instructor: "Marcus Lee",
      category: "Marketing",
      shortDescription: "SEO, social media, email, and paid ads that drive growth.",
      description: "A complete digital marketing course covering SEO, content marketing, social media strategy, email campaigns, and paid advertising.",
      price: 899,
      thumbnail: "/courses/digital-marketing.png",
      rating: 4.6,
      students: 5430,
      level: "Beginner" as const,
      duration: "11h 45m",
      chaptersData: [
        { title: "Marketing Foundations", lessons: [["The Marketing Funnel","10:10"],["Building a Brand","12:55"]] },
        { title: "Channels & Growth",     lessons: [["SEO Fundamentals","16:40"],["Paid Advertising","19:00"]] },
      ],
    },
    {
      id: "python",
      title: "Python Programming for Everybody",
      instructor: "Aisha Khan",
      category: "Development",
      shortDescription: "Start coding with Python — the world's most popular language.",
      description: "Learn Python programming from scratch. Covers syntax, data structures, functions, file handling, and automation. Perfect for absolute beginners.",
      price: 799,
      thumbnail: "/courses/python.png",
      rating: 4.8,
      students: 18200,
      level: "Beginner" as const,
      duration: "14h 25m",
      chaptersData: [
        { title: "Python Basics",      lessons: [["Installing Python","6:30"],["Your First Program","9:15"],["Variables & Operators","13:40"]] },
        { title: "Working with Data",  lessons: [["Lists & Dictionaries","15:20"],["Loops & Conditionals","14:10"]] },
      ],
    },
    {
      id: "photography",
      title: "Photography Fundamentals",
      instructor: "James Carter",
      category: "Photography",
      shortDescription: "Master your camera and capture stunning photos.",
      description: "Take control of your camera and start shooting like a pro. Learn about exposure, composition, lighting, and post-processing.",
      price: 699,
      thumbnail: "/courses/photography.png",
      rating: 4.7,
      students: 4120,
      level: "Beginner" as const,
      duration: "9h 10m",
      chaptersData: [
        { title: "Camera Essentials",    lessons: [["Understanding Exposure","11:25"],["Aperture & Shutter Speed","14:50"]] },
        { title: "Composition & Light",  lessons: [["Rule of Thirds","9:40"],["Working with Natural Light","13:15"]] },
      ],
    },
  ]

  for (const c of seedCourses) {
    db.insert(courses).values({
      id: c.id, title: c.title, instructor: c.instructor, category: c.category,
      description: c.description, shortDescription: c.shortDescription,
      price: c.price, thumbnail: c.thumbnail, rating: c.rating, students: c.students,
      level: c.level, duration: c.duration,
    }).run()

    for (let ci = 0; ci < c.chaptersData.length; ci++) {
      const ch = c.chaptersData[ci]
      const chId = uid("ch")
      db.insert(chapters).values({ id: chId, courseId: c.id, title: ch.title, position: ci }).run()
      for (let li = 0; li < ch.lessons.length; li++) {
        const [lt, ld] = ch.lessons[li]
        db.insert(lessons).values({ id: uid("l"), chapterId: chId, title: lt, duration: ld, position: li }).run()
      }
    }
  }
}

export async function initDb() {
  runMigrations()
  await seedIfEmpty()
}
