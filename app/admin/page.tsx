"use client"

import { useEffect, useState } from "react"
import { Users, BookOpen, ShoppingCart, IndianRupee } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { adminApi, type AdminStats } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"

const chartConfig = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    adminApi.stats().then(setStats).catch(console.error)
  }, [])

  if (!stats) return <AdminShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AdminShell>

  const statCards = [
    { label: "Total Revenue",    value: formatPrice(stats.totalRevenue), icon: IndianRupee },
    { label: "Courses Sold",     value: String(stats.totalSold),         icon: ShoppingCart },
    { label: "Total Courses",    value: String(stats.totalCourses),      icon: BookOpen },
    { label: "Registered Users", value: String(stats.totalUsers),        icon: Users },
  ]

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform&apos;s performance.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs">{label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold sm:text-2xl">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Revenue by course</CardTitle>
              <CardDescription>Top courses by total revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.revenueByCourse.some((d) => d.revenue > 0) ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={stats.revenueByCourse} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No sales yet. Revenue will appear here as students enroll.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent enrollments</CardTitle>
              <CardDescription>Latest course purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrollments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentPurchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.userName}</TableCell>
                        <TableCell className="max-w-32 truncate text-muted-foreground">{p.courseTitle}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{formatPrice(p.amount)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}
