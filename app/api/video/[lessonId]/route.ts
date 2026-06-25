import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { db } from "@/lib/db"
import { lessons, purchases, chapters } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

const VIDEO_DIR = path.join(process.cwd(), "storage", "videos")

/** GET /api/video/[lessonId]
 *  - Verifies the user has purchased the course (or lesson is free preview)
 *  - Streams the video with range support
 *  - Sets headers that prevent download / direct save
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params

  // 1. Fetch lesson
  const lesson = db.select().from(lessons).where(eq(lessons.id, lessonId)).get()
  if (!lesson) return new NextResponse("Not found.", { status: 404 })

  // 2. Access check — free preview OR authenticated + purchased
  if (!lesson.preview) {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized.", { status: 401 })
    }

    // Get courseId via chapter
    const chapter = db.select().from(chapters).where(eq(chapters.id, lesson.chapterId)).get()
    if (!chapter) return new NextResponse("Not found.", { status: 404 })

    const purchased = db.select().from(purchases)
      .where(eq(purchases.userId, user.id))
      .all()
      .some((p) => p.courseId === chapter.courseId)

    if (!purchased) {
      return new NextResponse("Forbidden.", { status: 403 })
    }
  }

  // 3. Resolve file path
  // videoUrl is either "local:<lessonId>" or we use the lessonId directly
  const filename = `${lessonId}.mp4`
  const filePath = path.join(VIDEO_DIR, filename)

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Video file not found.", { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const rangeHeader = req.headers.get("range")

  // 4. Common anti-download headers
  const securityHeaders = {
    "Content-Type": "video/mp4",
    // inline = play in browser, do NOT suggest saving
    "Content-Disposition": "inline",
    // Prevent caching of the raw file URL
    "Cache-Control": "no-store, no-cache, must-revalidate",
    // Disallow embedding in external iframes (hotlinking)
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "default-src 'self'",
  }

  // 5. Range request (seeking support)
  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-")
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)
    const chunkSize = end - start + 1

    const stream = fs.createReadStream(filePath, { start, end })
    const nodeReadable = stream as unknown as ReadableStream

    return new NextResponse(nodeReadable, {
      status: 206,
      headers: {
        ...securityHeaders,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
      },
    })
  }

  // 6. Full file response
  const stream = fs.createReadStream(filePath)
  const nodeReadable = stream as unknown as ReadableStream

  return new NextResponse(nodeReadable, {
    status: 200,
    headers: {
      ...securityHeaders,
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
    },
  })
}
