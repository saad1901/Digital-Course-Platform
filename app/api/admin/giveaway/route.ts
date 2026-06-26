import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

/**
 * POST /api/admin/giveaway
 * Body: { userId: string; courseId: string }
 *
 * Grants a student free access to a course — records a £0 purchase
 * with paymentId = "giveaway" so the student can access the course
 * immediately without going through checkout.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { userId, courseId } = await req.json()
    if (!userId || !courseId)
      return NextResponse.json({ error: "userId and courseId are required." }, { status: 400 })

    // Verify user exists and is not an admin
    const userRows = await db.select().from(users).where(eq(users.id, userId))
    const targetUser = userRows[0]
    if (!targetUser)
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    if (targetUser.role === "admin")
      return NextResponse.json({ error: "Cannot grant access to admin accounts." }, { status: 400 })

    // Verify course exists
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // Already enrolled?
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    if (existing.length > 0)
      return NextResponse.json({ error: "Student is already enrolled in this course." }, { status: 409 })

    // Insert free purchase
    const purchase = {
      id:        uid("pur"),
      userId,
      courseId,
      amount:    0,
      paymentId: "giveaway",
    }
    await db.insert(purchases).values(purchase)
    await db.update(courses)
      .set({ students: course.students + 1 })
      .where(eq(courses.id, courseId))

    return NextResponse.json({ ok: true, purchase }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/giveaway]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
