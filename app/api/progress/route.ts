import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { progress } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

/** GET /api/progress?courseId=xxx — completed lesson IDs for this course */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const courseId = req.nextUrl.searchParams.get("courseId")
  if (!courseId) return NextResponse.json({ error: "courseId required." }, { status: 400 })

  // We store per-lesson; join with lessons to filter by courseId
  const rows = db.select().from(progress).where(eq(progress.userId, user.id)).all()
  return NextResponse.json(rows.map((r) => r.lessonId))
}

/** POST /api/progress — mark a lesson complete */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { lessonId } = await req.json()
    if (!lessonId) return NextResponse.json({ error: "lessonId required." }, { status: 400 })

    // Idempotent insert
    const existing = db.select().from(progress)
      .where(and(eq(progress.userId, user.id), eq(progress.lessonId, lessonId)))
      .get()

    if (!existing) {
      db.insert(progress).values({ id: uid("prog"), userId: user.id, lessonId }).run()
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/progress]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
