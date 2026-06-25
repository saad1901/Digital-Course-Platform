import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"

/** GET /api/courses — full catalog with chapters & lessons */
export async function GET() {
  try {
    const allCourses = db.select().from(courses).orderBy(asc(courses.createdAt)).all()
    const allChapters = db.select().from(chapters).orderBy(asc(chapters.position)).all()
    const allLessons = db.select().from(lessons).orderBy(asc(lessons.position)).all()

    const result = allCourses.map((c) => {
      const chs = allChapters
        .filter((ch) => ch.courseId === c.id)
        .map((ch) => ({
          ...ch,
          lessons: allLessons
            .filter((l) => l.chapterId === ch.id)
            .map((l) => ({
              ...l,
              // Never expose internal video path to unauthenticated listing
              videoUrl: l.videoUrl.startsWith("local:") ? "" : l.videoUrl,
            })),
        }))
      return { ...c, chapters: chs }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/courses]", err)
    return NextResponse.json({ error: "Failed to fetch courses." }, { status: 500 })
  }
}
