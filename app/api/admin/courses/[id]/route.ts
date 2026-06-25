import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons, purchases, progress } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import fs from "fs"
import path from "path"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/** GET /api/admin/courses/[id] — course with chapters + lessons (full data for admin) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  const course = db.select().from(courses).where(eq(courses.id, id)).get()
  if (!course) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const chs = db.select().from(chapters)
    .where(eq(chapters.courseId, id))
    .orderBy(asc(chapters.position))
    .all()

  return NextResponse.json({
    ...course,
    chapters: chs.map((ch) => ({
      ...ch,
      lessons: db.select().from(lessons)
        .where(eq(lessons.chapterId, ch.id))
        .orderBy(asc(lessons.position))
        .all(),
    })),
  })
}

/** PATCH /api/admin/courses/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  try {
    const body = await req.json()
    const allowed = ["title","instructor","category","description","shortDescription","duration","price","thumbnail","level"]
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key === "shortDescription" ? "shortDescription" : key] = body[key]
    }

    db.update(courses).set(update).where(eq(courses.id, id)).run()
    const updated = db.select().from(courses).where(eq(courses.id, id)).get()
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/admin/courses/[id]]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/** DELETE /api/admin/courses/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params

  // Delete associated video files
  const chs = db.select().from(chapters).where(eq(chapters.courseId, id)).all()
  for (const ch of chs) {
    const lsns = db.select().from(lessons).where(eq(lessons.chapterId, ch.id)).all()
    for (const l of lsns) {
      if (l.videoUrl.startsWith("local:")) {
        const fp = path.join(process.cwd(), "storage", "videos", `${l.id}.mp4`)
        if (fs.existsSync(fp)) fs.unlinkSync(fp)
      }
    }
  }

  db.delete(courses).where(eq(courses.id, id)).run()
  return NextResponse.json({ ok: true })
}
