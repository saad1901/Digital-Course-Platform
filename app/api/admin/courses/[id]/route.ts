import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import fs from "fs"
import path from "path"
import type { InferSelectModel } from "drizzle-orm"

type Chapter = InferSelectModel<typeof chapters>

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const rows = await db.select().from(courses).where(eq(courses.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const chs = await db.select().from(chapters).where(eq(chapters.courseId, id)).orderBy(asc(chapters.position))
  return NextResponse.json({
    ...rows[0],
    chapters: await Promise.all(chs.map(async (ch: Chapter) => ({
      ...ch,
      lessons: await db.select().from(lessons).where(eq(lessons.chapterId, ch.id)).orderBy(asc(lessons.position)),
    }))),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const allowed = ["title","instructor","category","description","shortDescription","duration","price","thumbnail","level"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) update[key] = body[key]
  await db.update(courses).set(update).where(eq(courses.id, id))
  const updated = await db.select().from(courses).where(eq(courses.id, id))
  return NextResponse.json(updated[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  // Clean up local video files
  const chs = await db.select().from(chapters).where(eq(chapters.courseId, id))
  for (const ch of chs) {
    const lsns = await db.select().from(lessons).where(eq(lessons.chapterId, ch.id))
    for (const l of lsns) {
      if (l.videoUrl.startsWith("local:")) {
        const fp = path.join(process.cwd(), "storage", "videos", `${l.id}.mp4`)
        if (fs.existsSync(fp)) fs.unlinkSync(fp)
      }
    }
  }
  await db.delete(courses).where(eq(courses.id, id))
  return NextResponse.json({ ok: true })
}
