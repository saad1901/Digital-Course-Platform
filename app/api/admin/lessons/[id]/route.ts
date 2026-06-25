import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
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
  const body = await req.json()
  const allowed = ["title", "duration", "preview", "videoUrl"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) update[key] = body[key]
  await db.update(lessons).set(update).where(eq(lessons.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const rows = await db.select().from(lessons).where(eq(lessons.id, id))
  if (rows[0]?.videoUrl.startsWith("local:")) {
    const fp = path.join(process.cwd(), "storage", "videos", `${id}.mp4`)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  }
  await db.delete(lessons).where(eq(lessons.id, id))
  return NextResponse.json({ ok: true })
}
