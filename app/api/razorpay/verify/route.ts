import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { courses, purchases } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

/**
 * POST /api/razorpay/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId }
 *
 * Verifies the Razorpay payment signature server-side (HMAC-SHA256).
 * Only if the signature is valid does it record the purchase in the DB.
 * This prevents clients from recording fake purchases.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } =
      await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId)
      return NextResponse.json({ error: "Missing required payment fields." }, { status: 400 })

    // ── Signature verification ────────────────────────────────────────────────
    // Razorpay signs the payload as: HMAC_SHA256(orderId + "|" + paymentId, keySecret)
    const body       = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected   = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex")

    if (expected !== razorpay_signature)
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 })

    // ── Fetch course ─────────────────────────────────────────────────────────
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // ── Idempotency: already purchased? ──────────────────────────────────────
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, courseId)))
    if (existing.length > 0) return NextResponse.json(existing[0])

    // ── Record purchase ───────────────────────────────────────────────────────
    const purchase = {
      id:        uid("pur"),
      userId:    user.id,
      courseId,
      amount:    course.price,
      paymentId: razorpay_payment_id,
    }
    await db.insert(purchases).values(purchase)
    await db.update(courses)
      .set({ students: course.students + 1 })
      .where(eq(courses.id, courseId))

    return NextResponse.json(purchase, { status: 201 })
  } catch (err) {
    console.error("[POST /api/razorpay/verify]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
