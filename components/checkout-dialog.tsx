"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, ShieldCheck, Lock, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { Course } from "@/lib/types"
import { formatPrice } from "@/lib/format"

// ─── Razorpay SDK types ───────────────────────────────────────────────────────

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  image?: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  modal?: {
    ondismiss?: () => void
    escape?: boolean
    backdropclose?: boolean
  }
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open(): void
  close(): void
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "summary" | "processing" | "success" | "error"

// ─── Hook: load Razorpay script once ─────────────────────────────────────────

function useRazorpayScript() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Already loaded
    if (window.Razorpay) { setReady(true); return }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => setReady(true)
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK")
      setError("Failed to load Razorpay SDK.")
    }
    document.body.appendChild(script)

    return () => {
      // Don't remove the script on cleanup — it's a singleton resource.
    }
  }, [])

  return { ready, error }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Real Razorpay checkout dialog.
 *
 * Flow:
 *  1. User clicks "Pay" → we POST /api/razorpay/order to create a server-side order
 *  2. Razorpay SDK modal opens with the order details
 *  3. On payment success, SDK returns { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 *  4. We POST /api/razorpay/verify to verify the signature + record the purchase
 *  5. onSuccess(paymentId) is called → parent redirects to /my-courses
 */
export function CheckoutDialog({
  course,
  open,
  onOpenChange,
  onSuccess,
}: {
  course: Course | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (paymentId: string) => void
}) {
  const [phase, setPhase]     = useState<Phase>("summary")
  const [errorMsg, setErrorMsg] = useState("")
  const rzpRef = useRef<RazorpayInstance | null>(null)
  const { ready: sdkReady, error: sdkError } = useRazorpayScript()
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const initError = sdkError ?? (!razorpayKey ? "Razorpay public key is not configured." : "")

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPhase("summary")
      setErrorMsg("")
    }
  }, [open])

  if (!course) return null

  function handleClose(o: boolean) {
    // Don't allow closing while payment is in progress
    if (phase === "processing") return
    onOpenChange(o)
  }

  async function pay() {
    if (!sdkReady) {
      setErrorMsg("Razorpay SDK is still loading. Please try again in a moment.")
      return
    }
    if (sdkError) {
      setErrorMsg(sdkError)
      setPhase("error")
      return
    }
    if (!razorpayKey) {
      setErrorMsg("Razorpay public key is not configured.")
      setPhase("error")
      return
    }
    if (!course) return

    setPhase("processing")
    setErrorMsg("")

    // Capture course in a local const so TypeScript knows it's non-null in the closure
    const activeCourse = course

    try {
      // Step 1: Create order on server
      const orderRes = await fetch("/api/razorpay/order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: activeCourse.id }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        setErrorMsg(orderData.error ?? "Failed to initiate payment.")
        setPhase("error")
        return
      }

      if (!window.Razorpay) {
        setErrorMsg("Razorpay checkout SDK failed to initialize.")
        setPhase("error")
        return
      }

      // Step 2: Open Razorpay checkout modal
      const options: RazorpayOptions = {
        key:         razorpayKey,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        "LearnHub",
        description: activeCourse.title,
        image:       activeCourse.thumbnail || undefined,
        order_id:    orderData.orderId,
        prefill: {
          name:  orderData.userName,
          email: orderData.userEmail,
        },
        theme: { color: "#6366f1" },
        modal: {
          escape:       false,
          backdropclose: false,
          ondismiss: () => {
            // User closed the Razorpay modal without paying
            setPhase("summary")
          },
        },
        handler: async (response: RazorpayResponse) => {
          // Step 3: Verify payment signature server-side
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                courseId:            activeCourse.id,
              }),
            })
            const verifyData = await verifyRes.json()

            if (!verifyRes.ok) {
              setErrorMsg(verifyData.error ?? "Payment verification failed.")
              setPhase("error")
              return
            }

            // Step 4: Success
            setPhase("success")
            setTimeout(() => onSuccess(response.razorpay_payment_id), 900)
          } catch {
            setErrorMsg("Payment verification failed. Please contact support.")
            setPhase("error")
          }
        },
      }

      rzpRef.current = new window.Razorpay(options)
      rzpRef.current.open()
    } catch (err) {
      console.error("[CheckoutDialog] pay error:", err)
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setPhase("error")
    }
  }

  const isProcessing = phase === "processing"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              R
            </span>
            <DialogTitle>Razorpay Secure Checkout</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-1.5">
            <Lock className="size-3" />
            Payments processed securely by Razorpay.
          </DialogDescription>
        </DialogHeader>

        {/* Summary / Processing / Error */}
        {(phase === "summary" || phase === "processing" || phase === "error") && (
          <div className="flex flex-col gap-4">
            {/* Course preview */}
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <img
                src={course.thumbnail || "/placeholder.svg"}
                alt=""
                className="size-14 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{course.title}</p>
                <p className="text-xs text-muted-foreground">by {course.instructor}</p>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Course price</span>
                <span>{formatPrice(course.price)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Platform fee</span>
                <span>{formatPrice(0)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(course.price)}</span>
              </div>
            </div>

            {/* Error message */}
            {(phase === "error" && errorMsg) || initError ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMsg || initError}</span>
              </div>
            ) : null}

            {/* Pay button */}
            <Button
              className="w-full"
              onClick={phase === "error" ? () => setPhase("summary") : pay}
              disabled={isProcessing || !sdkReady || !!sdkError || !razorpayKey}
            >
              {isProcessing ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Processing…
                </>
              ) : phase === "error" ? (
                "Try Again"
              ) : (
                <>Pay {formatPrice(course.price)}</>
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Secured by Razorpay
            </p>
          </div>
        )}

        {/* Success */}
        {phase === "success" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-14 text-primary" />
            <p className="text-lg font-semibold">Payment Successful</p>
            <p className="text-sm text-muted-foreground">
              Your course has been unlocked. Redirecting to My Courses…
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
