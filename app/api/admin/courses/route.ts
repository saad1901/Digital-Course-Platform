import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/** GET /api/admin/courses — full list with chapters + lessons */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const allCourses  = db.select().from(courses).orderBy(asc(courses.createdAt)).all()
  const allChapters = db.select().from(chapters).orderBy(asc(chapters.position)).all()
  const allLessons  = db.select().from(lessons).orderBy(asc(lessons.position)).all()

  const result = allCourses.map((c) => ({
    ...c,
    chapters: allChapters
      .filter((ch) => ch.courseId === c.id)
      .map((ch) => ({
        ...ch,
        lessons: allLessons.filter((l) => l.chapterId === ch.id),
      })),
  }))

  return NextResponse.json(result)
}

/** POST /api/admin/courses */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const body = await req.json()
    const { title, instructor, category, description, shortDescription, duration, price, thumbnail, level } = body

    if (!title?.trim() || !instructor?.trim()) {
      return NextResponse.json({ error: "Title and instructor are required." }, { status: 400 })
    }

    const course = {
      id: uid("course"),
      title: title.trim(),
      instructor: instructor.trim(),
      category: category ?? "Development",
      description: description?.trim() ?? "",
      shortDescription: shortDescription?.trim() ?? "",
      duration: duration?.trim() || "Self-paced",
      price: Number(price) || 0,
      thumbnail: thumbnail ?? "",
      level: level ?? "Beginner",
      rating: 0,
      students: 0,
    }

    db.insert(courses).values(course).run()
    return NextResponse.json({ ...course, chapters: [] }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/courses]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
