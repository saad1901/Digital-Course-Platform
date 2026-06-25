import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons, purchases } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Chapter = InferSelectModel<typeof chapters>
type Lesson  = InferSelectModel<typeof lessons>

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await db.select().from(courses).where(eq(courses.id, id))
    const course = rows[0]
    if (!course) return NextResponse.json({ error: "Not found." }, { status: 404 })

    const [chs, user] = await Promise.all([
      db.select().from(chapters).where(eq(chapters.courseId, id)).orderBy(asc(chapters.position)),
      getCurrentUser(),
    ])

    const owned = user
      ? (await db.select().from(purchases).where(eq(purchases.userId, user.id))).some((p: { courseId: string }) => p.courseId === id)
      : false

    const result = {
      ...course,
      chapters: await Promise.all((chs as Chapter[]).map(async (ch) => ({
        ...ch,
        lessons: (await db.select().from(lessons).where(eq(lessons.chapterId, ch.id)).orderBy(asc(lessons.position)))
          .map((l: Lesson) => ({
            ...l,
            videoUrl: (owned || l.preview) ? l.videoUrl : l.videoUrl.startsWith("local:") ? "" : l.videoUrl,
          })),
      }))),
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/courses/[id]]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
