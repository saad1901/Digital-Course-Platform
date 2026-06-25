import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const VIDEO_DIR = path.join(process.cwd(), "storage", "videos")
const MAX_SIZE = 2 * 1024 * 1024 * 1024 // 2 GB
const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]

/** POST /api/upload/video
 *  Body: FormData { lessonId: string, file: File }
 *  Admin only. Saves to /storage/videos/<lessonId>.mp4
 *  and updates the lesson's video_url to "local:<lessonId>"
 */
export async function POST(req: NextRequest) {
  // Auth — admin only
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const lessonId = formData.get("lessonId") as string | null
    const file = formData.get("file") as File | null

    if (!lessonId || !file) {
      return NextResponse.json({ error: "lessonId and file are required." }, { status: 400 })
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 415 }
      )
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 2 GB limit." }, { status: 413 })
    }

    // Verify lesson exists
    const lesson = db.select().from(lessons).where(eq(lessons.id, lessonId)).get()
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 })
    }

    // Write file
    fs.mkdirSync(VIDEO_DIR, { recursive: true })
    const dest = path.join(VIDEO_DIR, `${lessonId}.mp4`)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(dest, buffer)

    // Update lesson record
    db.update(lessons)
      .set({ videoUrl: `local:${lessonId}` })
      .where(eq(lessons.id, lessonId))
      .run()

    return NextResponse.json({ ok: true, videoUrl: `local:${lessonId}` })
  } catch (err) {
    console.error("[POST /api/upload/video]", err)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}

// Increase body size limit for video uploads
export const config = {
  api: { bodyParser: false },
}
