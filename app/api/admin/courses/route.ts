import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Course  = InferSelectModel<typeof courses>
type Chapter = InferSelectModel<typeof chapters>
type Lesson  = InferSelectModel<typeof lessons>

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [allCourses, allChapters, allLessons] = await Promise.all([
    db.select().from(courses).orderBy(asc(courses.createdAt)),
    db.select().from(chapters).orderBy(asc(chapters.position)),
    db.select().from(lessons).orderBy(asc(lessons.position)),
  ])

  return NextResponse.json(allCourses.map((c: Course) => ({
    ...c,
    chapters: allChapters
      .filter((ch: Chapter) => ch.courseId === c.id)
      .map((ch: Chapter) => ({ ...ch, lessons: allLessons.filter((l: Lesson) => l.chapterId === ch.id) })),
  })))
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  try {
    const body = await req.json()
    const { title, instructor, category, description, shortDescription, duration, price, thumbnail, level } = body
    if (!title?.trim() || !instructor?.trim())
      return NextResponse.json({ error: "Title and instructor are required." }, { status: 400 })

    const course = {
      id: uid("course"), title: title.trim(), instructor: instructor.trim(),
      category: category ?? "Development", description: description?.trim() ?? "",
      shortDescription: shortDescription?.trim() ?? "", duration: duration?.trim() || "Self-paced",
      price: Number(price) || 0, thumbnail: thumbnail ?? "", level: level ?? "Beginner",
      rating: 0, students: 0,
    }
    await db.insert(courses).values(course)
    return NextResponse.json({ ...course, chapters: [] }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/courses]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
