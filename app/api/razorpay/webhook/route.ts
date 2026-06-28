import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { courses, purchases } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { uid } from "@/lib/auth"

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined.")
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const expectedSignature = req.headers.get("x-razorpay-signature")
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[Razorpay Webhook] Missing RAZORPAY_WEBHOOK_SECRET")
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 })
  }

  if (!expectedSignature) {
    console.warn("[Razorpay Webhook] Missing x-razorpay-signature header")
    return NextResponse.json({ error: "Missing Razorpay signature." }, { status: 400 })
  }

  const generatedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex")

  console.info("[Razorpay Webhook] received", {
    event: undefined,
    signaturePresent: Boolean(expectedSignature),
    signatureLength: expectedSignature?.length ?? 0,
  })

  try {
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(generatedSignature),
    )
  } catch {
    console.error("[Razorpay Webhook] Signature comparison failed")
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    console.error("[Razorpay Webhook] Invalid JSON payload", rawBody)
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 })
  }

  console.info("[Razorpay Webhook] parsed event", {
    event: event?.event,
    paymentId: event?.payload?.payment?.entity?.id,
    orderId: event?.payload?.payment?.entity?.order_id ?? event?.payload?.order?.entity?.id,
  })

  const supportedEvents = ["payment.captured", "payment.authorized", "order.paid"]
  if (!supportedEvents.includes(event?.event)) {
    console.info("[Razorpay Webhook] ignored event", { event: event?.event })
    return NextResponse.json({ received: true })
  }

  const payment = event?.payload?.payment?.entity
  const orderId = payment?.order_id ?? event?.payload?.order?.entity?.id
  if (!orderId) {
    return NextResponse.json({ error: "Missing order id in webhook payload." }, { status: 400 })
  }

  try {
    const razorpay = getRazorpayClient()
    const order = await razorpay.orders.fetch(orderId)
    const courseId = String(order?.notes?.courseId ?? "")
    const userId = String(order?.notes?.userId ?? "")

    if (!courseId || !userId) {
      console.warn("[Razorpay Webhook] Missing course/user notes in order", { orderId, notes: order?.notes })
      return NextResponse.json({ error: "Missing course/user notes in Razorpay order." }, { status: 400 })
    }

    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 })
    }

    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    if (existing.length > 0) {
      return NextResponse.json({ received: true, alreadyRecorded: true })
    }

    const purchase = {
      id: uid("pur"),
      userId,
      courseId,
      amount: course.price,
      paymentId: payment?.id ?? "webhook",
    }

    await db.insert(purchases).values(purchase)
    await db.update(courses)
      .set({ students: course.students + 1 })
      .where(eq(courses.id, courseId))

    console.info("[Razorpay Webhook] recorded purchase", { userId, courseId, paymentId: purchase.paymentId })
    return NextResponse.json({ received: true, recorded: true })
  } catch (err) {
    console.error("[Razorpay Webhook] processing failed", err)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}
