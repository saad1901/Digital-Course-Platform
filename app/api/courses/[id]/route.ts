import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons, purchases } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/** GET /api/courses/[id] — single course with chapters & lessons.
 *  Authenticated + purchased users get real videoUrls. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const course = db.select().from(courses).where(eq(courses.id, id)).get()
    if (!course) return NextResponse.json({ error: "Not found." }, { status: 404 })

    const chs = db.select().from(chapters)
      .where(eq(chapters.courseId, id))
      .orderBy(asc(chapters.position))
      .all()

    const user = await getCurrentUser()
    const owned = user
      ? db.select().from(purchases)
          .where(eq(purchases.userId, user.id))
          .all()
          .some((p) => p.courseId === id)
      : false

    const result = {
      ...course,
      chapters: chs.map((ch) => ({
        ...ch,
        lessons: db.select().from(lessons)
          .where(eq(lessons.chapterId, ch.id))
          .orderBy(asc(lessons.position))
          .all()
          .map((l) => ({
            ...l,
            // Only expose the real video URL if user has purchased (or lesson is free preview)
            videoUrl: (owned || l.preview)
              ? l.videoUrl
              : l.videoUrl.startsWith("local:") ? "" : l.videoUrl,
          })),
      })),
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/courses/[id]]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
