import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { progress } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  const rows = await db.select().from(progress).where(eq(progress.userId, user.id))
  return NextResponse.json(rows.map((r: { lessonId: string }) => r.lessonId))
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  try {
    const { lessonId } = await req.json()
    if (!lessonId) return NextResponse.json({ error: "lessonId required." }, { status: 400 })

    const existing = await db.select().from(progress)
      .where(and(eq(progress.userId, user.id), eq(progress.lessonId, lessonId)))
    if (existing.length === 0)
      await db.insert(progress).values({ id: uid("prog"), userId: user.id, lessonId })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/progress]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
