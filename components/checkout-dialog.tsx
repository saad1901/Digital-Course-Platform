"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ShieldCheck, Lock } from "lucide-react"
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

type Phase = "summary" | "processing" | "success"

/**
 * Razorpay-style checkout flow (mocked).
 *
 * In production, "Pay" would call `new window.Razorpay(options).open()` after
 * creating an order on the server. Here we simulate the modal + handler so the
 * flow is identical and easy to swap for the real SDK later.
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
  const [phase, setPhase] = useState<Phase>("summary")

  useEffect(() => {
    if (open) setPhase("summary")
  }, [open])

  if (!course) return null

  function pay() {
    setPhase("processing")
    // Simulate the Razorpay payment handler resolving successfully.
    setTimeout(() => {
      setPhase("success")
      const paymentId = `pay_${Math.random().toString(36).slice(2, 12)}`
      setTimeout(() => onSuccess(paymentId), 900)
    }, 1800)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (phase === "processing" ? null : onOpenChange(o))}>
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
            Test mode — payments are simulated, no real charge.
          </DialogDescription>
        </DialogHeader>

        {phase !== "success" && (
          <div className="flex flex-col gap-4">
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

            <Button className="w-full" onClick={pay} disabled={phase === "processing"}>
              {phase === "processing" ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Processing payment...
                </>
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

        {phase === "success" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-14 text-primary" />
            <p className="text-lg font-semibold">Payment Successful</p>
            <p className="text-sm text-muted-foreground">
              Your course has been unlocked. Redirecting to My Courses...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
