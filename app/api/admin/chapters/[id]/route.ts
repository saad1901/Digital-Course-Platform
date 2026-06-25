import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chapters, lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import fs from "fs"
import path from "path"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "title required." }, { status: 400 })
  await db.update(chapters).set({ title: title.trim() }).where(eq(chapters.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const lsns = await db.select().from(lessons).where(eq(lessons.chapterId, id))
  for (const l of lsns) {
    if (l.videoUrl.startsWith("local:")) {
      const fp = path.join(process.cwd(), "storage", "videos", `${l.id}.mp4`)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
  }
  await db.delete(chapters).where(eq(chapters.id, id))
  return NextResponse.json({ ok: true })
}
