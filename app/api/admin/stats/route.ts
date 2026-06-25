import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const allUsers = db.select().from(users).all()
  const allCourses = db.select().from(courses).all()
  const allPurchases = db.select().from(purchases).all()

  const totalRevenue = allPurchases.reduce((sum, p) => sum + p.amount, 0)

  // Revenue per course
  const revenueByCourse = allCourses.map((c) => ({
    id: c.id,
    name: c.title.length > 14 ? c.title.slice(0, 14) + "…" : c.title,
    revenue: allPurchases
      .filter((p) => p.courseId === c.id)
      .reduce((sum, p) => sum + p.amount, 0),
  }))

  // Recent purchases with user + course info
  const recent = [...allPurchases]
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
    .slice(0, 10)
    .map((p) => ({
      ...p,
      userName: allUsers.find((u) => u.id === p.userId)?.name ?? "Unknown",
      courseTitle: allCourses.find((c) => c.id === p.courseId)?.title ?? "Deleted course",
    }))

  return NextResponse.json({
    totalUsers: allUsers.filter((u) => u.role === "user").length,
    totalSold: allPurchases.length,
    totalRevenue,
    totalCourses: allCourses.length,
    revenueByCourse,
    recentPurchases: recent,
  })
}
