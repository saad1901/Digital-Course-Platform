import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { db } from "@/lib/db"
import { lessons, purchases, chapters } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

const VIDEO_DIR = path.join(process.cwd(), "storage", "videos")

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params

  // 1. Fetch lesson
  const lessonRows = await db.select().from(lessons).where(eq(lessons.id, lessonId))
  const lesson = lessonRows[0]
  if (!lesson) return new NextResponse("Not found.", { status: 404 })

  // 2. Access check — free preview OR authenticated + purchased
  if (!lesson.preview) {
    const user = await getCurrentUser()
    if (!user) return new NextResponse("Unauthorized.", { status: 401 })

    const chapterRows = await db.select().from(chapters).where(eq(chapters.id, lesson.chapterId))
    const chapter = chapterRows[0]
    if (!chapter) return new NextResponse("Not found.", { status: 404 })

    const userPurchases = await db.select().from(purchases).where(eq(purchases.userId, user.id))
    const purchased = userPurchases.some((p: { courseId: string }) => p.courseId === chapter.courseId)
    if (!purchased) return new NextResponse("Forbidden.", { status: 403 })
  }

  // 3. Resolve file
  const filePath = path.join(VIDEO_DIR, `${lessonId}.mp4`)
  if (!fs.existsSync(filePath)) return new NextResponse("Video file not found.", { status: 404 })

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const rangeHeader = req.headers.get("range")

  const securityHeaders = {
    "Content-Type": "video/mp4",
    "Content-Disposition": "inline",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Frame-Options": "SAMEORIGIN",
  }

  // 4. Range request (seeking)
  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-")
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)
    const chunkSize = end - start + 1
    const stream = fs.createReadStream(filePath, { start, end }) as unknown as ReadableStream
    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...securityHeaders,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
      },
    })
  }

  // 5. Full response
  const stream = fs.createReadStream(filePath) as unknown as ReadableStream
  return new NextResponse(stream, {
    status: 200,
    headers: { ...securityHeaders, "Accept-Ranges": "bytes", "Content-Length": String(fileSize) },
  })
}
