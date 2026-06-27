import { NextRequest, NextResponse } from "next/server"
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

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

/**
 * POST /api/razorpay/order
 * Body: { courseId: string }
 *
 * Creates a Razorpay order for the given course and returns the order details
 * needed by the client-side Razorpay checkout SDK.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { courseId } = await req.json()
    if (!courseId)
      return NextResponse.json({ error: "courseId is required." }, { status: 400 })

    // Fetch course
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // Already purchased?
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, courseId)))
    if (existing.length > 0)
      return NextResponse.json({ error: "Course already purchased." }, { status: 409 })

    // Razorpay amounts are in the smallest currency unit (paise for INR)
    const amountInPaise = Math.round(course.price * 100)
    const razorpay = getRazorpayClient()

    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: "INR",
      // Razorpay enforces a max length of 40 for receipt IDs. Use a short uid.
      receipt:  uid("rcpt"),
      notes: {
        courseId,
        userId: user.id,
      },
    })

    return NextResponse.json({
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      courseName: course.title,
      coursePrice: course.price,
      userName:  user.name,
      userEmail: user.email,
    })
  } catch (err) {
    console.error("[POST /api/razorpay/order]", err)
    return NextResponse.json({ error: "Failed to create payment order." }, { status: 500 })
  }
}
