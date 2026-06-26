"use client"

import { useEffect, useState } from "react"
import { Gift, BookOpen, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { adminApi, type AdminStudent } from "@/lib/api"
import type { Course } from "@/lib/types"

interface Props {
  /** Pre-selected student — when opened from the Students page */
  student?: AdminStudent | null
  /** Pre-selected course — when opened from the Course detail page */
  courseId?: string
  courseName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onGranted?: () => void
}

/**
 * Admin dialog for granting a student free access to a course.
 * Can be used from two directions:
 *   - Student list → pick a course for the student
 *   - Course detail → pick a student for the course
 */
export function GiveawayDialog({
  student,
  courseId: prefillCourseId,
  courseName: prefillCourseName,
  open,
  onOpenChange,
  onGranted,
}: Props) {
  const [courses, setCourses]     = useState<Course[]>([])
  const [students, setStudents]   = useState<AdminStudent[]>([])
  const [selectedCourse, setSelectedCourse] = useState(prefillCourseId ?? "")
  const [selectedUser, setSelectedUser]     = useState(student?.id ?? "")
  const [saving, setSaving]       = useState(false)
  const [done, setDone]           = useState(false)

  // Reset when dialog opens
  useEffect(() => {
    if (!open) return
    setDone(false)
    setSaving(false)
    setSelectedCourse(prefillCourseId ?? "")
    setSelectedUser(student?.id ?? "")
  }, [open, prefillCourseId, student?.id])

  // Load courses if we need to pick one
  useEffect(() => {
    if (!open) return
    if (!prefillCourseId) {
      adminApi.listCourses().then(setCourses).catch(console.error)
    }
  }, [open, prefillCourseId])

  // Load students if we need to pick one
  useEffect(() => {
    if (!open) return
    if (!student) {
      adminApi.listStudents().then(setStudents).catch(console.error)
    }
  }, [open, student])

  async function handleGrant() {
    if (!selectedUser || !selectedCourse) {
      toast.error("Select both a student and a course.")
      return
    }
    setSaving(true)
    try {
      await adminApi.grantAccess(selectedUser, selectedCourse)
      setDone(true)
      const studentName = student?.name ?? students.find((s) => s.id === selectedUser)?.name ?? "Student"
      const cName = prefillCourseName ?? courses.find((c) => c.id === selectedCourse)?.title ?? "course"
      toast.success(`Access granted — ${studentName} can now access "${cName}".`)
      onGranted?.()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to grant access.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gift className="size-4" />
            </span>
            <DialogTitle>Grant free access</DialogTitle>
          </div>
          <DialogDescription>
            Grant a student free access to a course — no payment required.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-12 text-primary" />
            <p className="font-semibold">Access granted!</p>
            <p className="text-sm text-muted-foreground">
              The student can now access the course from their dashboard.
            </p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {/* Student selector (shown when no student pre-selected) */}
              {!student ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Student</label>
                  <Select value={selectedUser} onValueChange={(v) => setSelectedUser(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student…" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-1.5 text-xs text-muted-foreground">{s.email}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{student.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                  </div>
                </div>
              )}

              {/* Course selector (shown when no course pre-selected) */}
              {!prefillCourseId ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Course</label>
                  <Select value={selectedCourse} onValueChange={(v) => setSelectedCourse(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course…" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-medium">{c.title}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <BookOpen className="size-5 shrink-0 text-muted-foreground" />
                  <p className="truncate font-medium">{prefillCourseName}</p>
                </div>
              )}

              {/* Already enrolled hint */}
              {student && student.enrollments.some((e) => e.courseId === selectedCourse) && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  This student is already enrolled in the selected course.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleGrant} disabled={saving || !selectedUser || !selectedCourse}>
                {saving ? <><Spinner data-icon="inline-start" />Granting…</> : <><Gift data-icon="inline-start" />Grant access</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
