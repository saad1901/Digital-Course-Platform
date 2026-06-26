"use client"

import { useEffect, useState } from "react"
import {
  Users, ChevronDown, ChevronRight, Gift,
  Search, BookOpen, IndianRupee, Calendar,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { GiveawayDialog } from "@/components/giveaway-dialog"
import { adminApi, type AdminStudent } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export default function AdminStudentsPage() {
  const [students, setStudents]       = useState<AdminStudent[]>([])
  const [loading, setLoading]         = useState(true)
  const [query, setQuery]             = useState("")
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [giveawayUser, setGiveawayUser] = useState<AdminStudent | null>(null)

  async function load() {
    try { setStudents(await adminApi.listStudents()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase()),
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground">
              {students.length} registered student{students.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
            <Users className="size-10 opacity-40" />
            <p className="font-medium">{query ? "No students match your search." : "No students yet."}</p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Enrolled</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => {
                  const open = expanded.has(student.id)
                  const totalSpent = student.enrollments.reduce((s, e) => s + e.amount, 0)

                  return (
                    <>
                      <TableRow
                        key={student.id}
                        className={cn(
                          "cursor-pointer select-none",
                          open && "bg-muted/40",
                        )}
                        onClick={() => toggleExpand(student.id)}
                      >
                        <TableCell className="pr-0 text-muted-foreground">
                          {open
                            ? <ChevronDown className="size-4" />
                            : <ChevronRight className="size-4" />}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{student.email}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {student.email}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <Badge variant="secondary">
                            <BookOpen className="mr-1 size-3" />
                            {student.enrollments.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right text-sm font-medium">
                          {totalSpent > 0 ? formatPrice(totalSpent) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setGiveawayUser(student)}
                          >
                            <Gift className="size-3.5" />
                            <span className="hidden sm:inline">Grant access</span>
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded enrollment list */}
                      {open && (
                        <TableRow key={`${student.id}-expanded`} className="hover:bg-transparent">
                          <TableCell colSpan={6} className="bg-muted/20 pb-4 pt-0">
                            {student.enrollments.length === 0 ? (
                              <p className="pl-8 text-sm text-muted-foreground italic">
                                No courses enrolled yet.
                              </p>
                            ) : (
                              <div className="ml-8 mt-2 flex flex-col gap-1">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Enrolled courses
                                </p>
                                {student.enrollments.map((e) => (
                                  <div
                                    key={e.purchaseId}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                                      <span className="font-medium">{e.courseTitle}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                      {e.paymentId === "giveaway" ? (
                                        <Badge variant="secondary" className="gap-1">
                                          <Gift className="size-3" />Giveaway
                                        </Badge>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <IndianRupee className="size-3" />
                                          {formatPrice(e.amount)}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Calendar className="size-3" />
                                        {new Date(e.purchasedAt).toLocaleDateString(undefined, {
                                          year: "numeric", month: "short", day: "numeric",
                                        })}
                                      </span>
                                      <span className="font-mono opacity-60 truncate max-w-28" title={e.paymentId}>
                                        {e.paymentId}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Giveaway dialog */}
      {giveawayUser && (
        <GiveawayDialog
          student={giveawayUser}
          open={Boolean(giveawayUser)}
          onOpenChange={(o) => { if (!o) setGiveawayUser(null) }}
          onGranted={load}
        />
      )}
    </AdminShell>
  )
}
