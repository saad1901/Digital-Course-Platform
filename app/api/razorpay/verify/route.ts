import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { courses, purchases } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined.")
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

/**
 * POST /api/razorpay/verify
 * Body: { razorpay_order_id, razorpay_payment_id?, razorpay_signature?, courseId }
 *
 * Verifies a successful Razorpay payment and records the purchase.
 * If the client was unable to deliver the payment signature, the server
 * can still recover the payment using the Razorpay order ID.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = await req.json()

    if (!razorpay_order_id || !courseId)
      return NextResponse.json({ error: "Missing required payment fields." }, { status: 400 })

    const razorpay = getRazorpayClient()
    let paymentId = razorpay_payment_id

    if (razorpay_payment_id && razorpay_signature) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex")

      if (expected !== razorpay_signature)
        return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 })
    }

    if (!paymentId) {
      // Fallback: fetch Razorpay order and payment details directly.
      const order = await razorpay.orders.fetch(razorpay_order_id)
      if (!order || order.status !== "paid")
        return NextResponse.json({ error: "Payment not completed yet." }, { status: 400 })

      const payments = await razorpay.orders.fetchPayments(razorpay_order_id)
      const capturedPayment = Array.isArray(payments.items)
        ? payments.items.find((item: any) => item.status === "captured")
        : null

      if (!capturedPayment)
        return NextResponse.json({ error: "No captured payment found for this order." }, { status: 400 })

      paymentId = capturedPayment.id
    }

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
      paymentId: paymentId!,
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
