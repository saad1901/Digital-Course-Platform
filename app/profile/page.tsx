"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, LibraryBig, ShieldCheck, Mail, BadgeCheck } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import { authApi, purchasesApi, coursesApi, type Purchase } from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { formatPrice } from "@/lib/format"
import { initials } from "@/lib/utils"
import { toast } from "sonner"

export default function ProfilePage() {
  const router = useRouter()
  const { user, ready, refresh } = useSession()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [courses, setCourses]     = useState<Course[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!ready || !user) return
    Promise.all([purchasesApi.list(), coursesApi.list()])
      .then(([ps, cs]) => { setPurchases(ps); setCourses(cs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ready, user])

  async function handleLogout() {
    await authApi.logout()
    await refresh()
    toast.success("Signed out.")
    router.push("/")
  }

  if (!ready || loading) return <AppShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AppShell>
  if (!user) return null

  const owned = courses.filter((c) => purchases.some((p) => p.courseId === c.id))
  const spent = purchases.reduce((s, p) => s + p.amount, 0)

  return (
    <AppShell>
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center sm:flex-row sm:text-left">
            <Avatar className="size-20 text-xl">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                {user.role === "admin" && (
                  <Badge className="gap-1"><ShieldCheck className="size-3" />Admin</Badge>
                )}
              </div>
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                <Mail className="size-3.5" />{user.email}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Enrolled courses</CardDescription>
              <CardTitle className="text-3xl">{owned.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total invested</CardDescription>
              <CardTitle className="text-3xl">{formatPrice(spent)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <CardTitle>Transaction history</CardTitle>
            <div className="text-sm text-muted-foreground">
              {purchases.length} transaction{purchases.length !== 1 ? "s" : ""}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {purchases.length === 0 && <p className="text-sm text-muted-foreground">No purchases yet.</p>}
            {purchases.map((p) => {
              const course = courses.find((c) => c.id === p.courseId)
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{course?.title ?? "Course purchase"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.purchasedAt).toLocaleDateString()} · {p.paymentId}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatPrice(p.amount)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Transaction ID:</span>
                    <span className="font-mono truncate max-w-[14rem]" title={p.id}>{p.id}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Separator />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" nativeButton={false} render={<Link href="/my-courses" />}>
            <LibraryBig data-icon="inline-start" />My Courses
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut data-icon="inline-start" />Log out
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
