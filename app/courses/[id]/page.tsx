"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Star, Users, PlayCircle, BarChart3, Clock, CheckCircle2,
  ArrowLeft, BookOpen, Award, Smartphone,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/app-shell"
import { CheckoutDialog } from "@/components/checkout-dialog"
import { useSession } from "@/lib/session"
import { coursesApi, purchasesApi, type Purchase } from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { formatPrice, totalLessons } from "@/lib/format"

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()

  const [course, setCourse]         = useState<Course | null>(null)
  const [purchases, setPurchases]   = useState<Purchase[]>([])
  const [loading, setLoading]       = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    coursesApi.get(params.id).then(setCourse).catch(() => setCourse(null)).finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (user) purchasesApi.list().then(setPurchases).catch(() => {})
  }, [user])

  if (loading) return <AppShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AppShell>
  if (!course) return (
    <AppShell>
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Course not found</h1>
        <Button nativeButton={false} render={<Link href="/" />}>Back to courses</Button>
      </div>
    </AppShell>
  )

  const owned = purchases.some((p) => p.courseId === course.id)

  function handleBuy() {
    if (!user) { toast.info("Please sign in to purchase this course."); router.push(`/auth?redirect=/courses/${course!.id}`); return }
    setCheckoutOpen(true)
  }

  async function handleSuccess(paymentId: string) {
    // Purchase was already recorded server-side during payment verification.
    // Nothing extra to do here — just redirect.
    toast.success("Course unlocked! Happy learning.")
    setCheckoutOpen(false)
    router.push("/my-courses")
  }

  const purchaseCard = (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        {owned ? (
          <>
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="size-5" />
              <span className="font-semibold">You own this course</span>
            </div>
            <Button className="w-full" nativeButton={false} render={<Link href={`/learn/${course.id}`} />}>Go to course</Button>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold">{formatPrice(course.price)}</div>
            <Button size="lg" className="w-full" onClick={handleBuy}>Buy Now</Button>
            <p className="text-center text-xs text-muted-foreground">30-day money-back guarantee</p>
          </>
        )}
        <Separator />
        <ul className="flex flex-col gap-3 text-sm">
          {course.duration && (
            <li className="flex items-center gap-2.5"><Clock className="size-4 text-muted-foreground" />{course.duration} of content</li>
          )}
          <li className="flex items-center gap-2.5"><BookOpen className="size-4 text-muted-foreground" />{totalLessons(course.chapters)} on-demand lessons</li>
          <li className="flex items-center gap-2.5"><Smartphone className="size-4 text-muted-foreground" />Access on mobile and desktop</li>
          <li className="flex items-center gap-2.5"><Award className="size-4 text-muted-foreground" />Certificate of completion</li>
        </ul>
      </CardContent>
    </Card>
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" />Back
        </Button>

        {/* Mobile purchase card */}
        <div className="lg:hidden">{purchaseCard}</div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div>
              <Badge variant="secondary" className="mb-3">{course.category}</Badge>
              <h1 className="text-balance text-2xl font-bold tracking-tight md:text-3xl">{course.title}</h1>
              <p className="mt-3 text-pretty text-muted-foreground">{course.shortDescription}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Star className="size-4 fill-chart-4 text-chart-4" />{course.rating || "New"}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="size-4" />{course.students.toLocaleString()} students
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <BarChart3 className="size-4" />{course.level}
                </span>
                <span className="text-muted-foreground">by {course.instructor}</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <img src={course.thumbnail || "/placeholder.svg"} alt={course.title}
                className="aspect-video w-full object-cover" />
            </div>

            <Card>
              <CardHeader><CardTitle>About this course</CardTitle></CardHeader>
              <CardContent>
                <p className="text-pretty leading-relaxed text-muted-foreground">{course.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Curriculum</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {course.chapters.length} chapters • {totalLessons(course.chapters)} lessons
                </p>
              </CardHeader>
              <CardContent>
                <Accordion defaultValue={course.chapters[0] ? [course.chapters[0].id] : []}>
                  {course.chapters.map((ch, idx) => (
                    <AccordionItem key={ch.id} value={ch.id}>
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 text-left">
                          <span className="text-muted-foreground">{String(idx + 1).padStart(2, "0")}</span>
                          {ch.title}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="flex flex-col gap-1">
                          {ch.lessons.map((l) => (
                            <li key={l.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <PlayCircle className="size-4 shrink-0" />
                                <span className="min-w-0 flex-1 break-words">{l.title}</span>
                                {l.preview && <Badge variant="outline" className="ml-1 shrink-0 text-xs">Free</Badge>}
                              </span>
                              <span className="ml-3 inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3" />{l.duration}
                              </span>
                            </li>
                          ))}
                          {ch.lessons.length === 0 && (
                            <li className="px-2 py-1.5 text-sm text-muted-foreground">No lessons yet.</li>
                          )}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:col-span-1 lg:block">
            <div className="lg:sticky lg:top-20">{purchaseCard}</div>
          </div>
        </div>
      </div>

      <CheckoutDialog course={course} open={checkoutOpen} onOpenChange={setCheckoutOpen} onSuccess={handleSuccess} />
    </AppShell>
  )
}
