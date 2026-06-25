import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chapters, lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import fs from "fs"
import path from "path"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/** PATCH /api/admin/chapters/[id] — rename chapter */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "title required." }, { status: 400 })
  db.update(chapters).set({ title: title.trim() }).where(eq(chapters.id, id)).run()
  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/chapters/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params

  // Remove video files first
  const lsns = db.select().from(lessons).where(eq(lessons.chapterId, id)).all()
  for (const l of lsns) {
    if (l.videoUrl.startsWith("local:")) {
      const fp = path.join(process.cwd(), "storage", "videos", `${l.id}.mp4`)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
  }

  db.delete(chapters).where(eq(chapters.id, id)).run()
  return NextResponse.json({ ok: true })
}
