import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chapters } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/** POST /api/admin/chapters — add chapter to a course */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { courseId, title } = await req.json()
    if (!courseId || !title?.trim()) {
      return NextResponse.json({ error: "courseId and title required." }, { status: 400 })
    }

    // position = count of existing chapters
    const existing = db.select().from(chapters).where(eq(chapters.courseId, courseId)).all()
    const chapter = {
      id: uid("ch"),
      courseId,
      title: title.trim(),
      position: existing.length,
    }
    db.insert(chapters).values(chapter).run()
    return NextResponse.json({ ...chapter, lessons: [] }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/chapters]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
