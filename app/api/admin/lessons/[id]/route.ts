import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import fs from "fs"
import path from "path"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/** PATCH /api/admin/lessons/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const allowed = ["title", "duration", "preview", "videoUrl"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) update[key] = body[key]
  db.update(lessons).set(update).where(eq(lessons.id, id)).run()
  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/lessons/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params

  const lesson = db.select().from(lessons).where(eq(lessons.id, id)).get()
  if (lesson?.videoUrl.startsWith("local:")) {
    const fp = path.join(process.cwd(), "storage", "videos", `${id}.mp4`)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  }

  db.delete(lessons).where(eq(lessons.id, id)).run()
  return NextResponse.json({ ok: true })
}
