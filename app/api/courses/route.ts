import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

type Course  = InferSelectModel<typeof courses>
type Chapter = InferSelectModel<typeof chapters>
type Lesson  = InferSelectModel<typeof lessons>

export async function GET() {
  try {
    const [allCourses, allChapters, allLessons] = await Promise.all([
      db.select().from(courses).orderBy(asc(courses.createdAt)),
      db.select().from(chapters).orderBy(asc(chapters.position)),
      db.select().from(lessons).orderBy(asc(lessons.position)),
    ]) as [Course[], Chapter[], Lesson[]]

    const result = allCourses.map((c) => ({
      ...c,
      chapters: allChapters
        .filter((ch) => ch.courseId === c.id)
        .map((ch) => ({
          ...ch,
          lessons: allLessons
            .filter((l) => l.chapterId === ch.id)
            .map((l) => ({ ...l, videoUrl: l.videoUrl.startsWith("local:") ? "" : l.videoUrl })),
        })),
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/courses]", err)
    return NextResponse.json({ error: "Failed to fetch courses." }, { status: 500 })
  }
}
