import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  try {
    const { chapterId, title, duration, preview, videoUrl } = await req.json()
    if (!chapterId || !title?.trim())
      return NextResponse.json({ error: "chapterId and title required." }, { status: 400 })

    const existing = await db.select().from(lessons).where(eq(lessons.chapterId, chapterId))
    const lesson = {
      id: uid("l"), chapterId, title: title.trim(),
      duration: duration?.trim() ?? "", preview: Boolean(preview),
      videoUrl: videoUrl?.trim() ?? "", position: existing.length,
    }
    await db.insert(lessons).values(lesson)
    return NextResponse.json(lesson, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/lessons]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
