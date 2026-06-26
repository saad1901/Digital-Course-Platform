"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Plus, PlayCircle, Trash2, Upload, Pencil,
  Users, Gift, Calendar, IndianRupee,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { GiveawayDialog } from "@/components/giveaway-dialog"
import { adminApi, type CourseStudent } from "@/lib/api"
import type { Course, Chapter, Lesson } from "@/lib/types"
import { toast } from "sonner"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function CurriculumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"curriculum" | "students">("curriculum")
  const [students, setStudents] = useState<CourseStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [giveawayOpen, setGiveawayOpen] = useState(false)

  async function load() {
    try { setCourse(await adminApi.getCourse(id)) }
    catch { toast.error("Failed to load course.") }
    finally { setLoading(false) }
  }

  async function loadStudents() {
    setStudentsLoading(true)
    try { setStudents(await adminApi.listCourseStudents(id)) }
    catch { toast.error("Failed to load students.") }
    finally { setStudentsLoading(false) }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (tab === "students") loadStudents()
  }, [tab])

  if (loading) return <AdminShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AdminShell>
  if (!course) return (
    <AdminShell>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Course not found</EmptyTitle>
          <EmptyDescription>This course may have been deleted.</EmptyDescription>
        </EmptyHeader>
        <Button nativeButton={false} render={<Link href="/admin/courses" />}>Back to courses</Button>
      </Empty>
    </AdminShell>
  )

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" nativeButton={false} render={<Link href="/admin/courses" />}>
            <ArrowLeft data-icon="inline-start" />Back to courses
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
              <p className="text-muted-foreground">
                {course.students} student{course.students !== 1 ? "s" : ""} enrolled
              </p>
            </div>
            {tab === "curriculum" && <AddChapterDialog courseId={id} onAdded={load} />}
            {tab === "students" && (
              <Button onClick={() => setGiveawayOpen(true)} variant="outline">
                <Gift data-icon="inline-start" />Grant free access
              </Button>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
          {(["curriculum", "students"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "students" ? (
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />Students
                  {students.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{students.length}</Badge>
                  )}
                </span>
              ) : t}
            </button>
          ))}
        </div>

        {/* Curriculum tab */}
        {tab === "curriculum" && (
          course.chapters.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No chapters yet</EmptyTitle>
                <EmptyDescription>Add your first chapter to start building the curriculum.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {course.chapters.map((chapter, i) => (
                <ChapterCard key={chapter.id} chapter={chapter} index={i} courseId={id} onChanged={load} />
              ))}
            </div>
          )
        )}

        {/* Students tab */}
        {tab === "students" && (
          studentsLoading ? (
            <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
              <Users className="size-10 opacity-40" />
              <p className="font-medium">No students enrolled yet.</p>
              <Button variant="outline" onClick={() => setGiveawayOpen(true)}>
                <Gift data-icon="inline-start" />Grant free access to someone
              </Button>
            </div>
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Payment</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Amount</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.purchaseId}>
                      <TableCell className="font-medium">
                        {s.name}
                        <p className="text-xs text-muted-foreground md:hidden">{s.email}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {s.email}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {s.paymentId === "giveaway" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Gift className="size-3" />Giveaway
                          </Badge>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-32 block" title={s.paymentId}>
                            {s.paymentId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right font-medium">
                        {s.amount > 0 ? formatPrice(s.amount) : (
                          <span className="text-muted-foreground text-sm">Free</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {new Date(s.purchasedAt).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        )}
      </div>

      {/* Giveaway dialog — pre-selected course */}
      <GiveawayDialog
        courseId={course.id}
        courseName={course.title}
        open={giveawayOpen}
        onOpenChange={setGiveawayOpen}
        onGranted={() => { loadStudents(); load() }}
      />
    </AdminShell>
  )
}

// ─── Add Chapter ─────────────────────────────────────────────────────────────

function AddChapterDialog({ courseId, onAdded }: { courseId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) { toast.error("Enter a chapter title."); return }
    setSaving(true)
    try {
      await adminApi.addChapter(courseId, title.trim())
      toast.success("Chapter added.")
      setTitle("")
      setOpen(false)
      onAdded()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus data-icon="inline-start" />Add chapter</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add chapter</DialogTitle></DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ch-title">Chapter title</FieldLabel>
            <Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Getting started" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}Add chapter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Chapter Card ─────────────────────────────────────────────────────────────

function ChapterCard({ chapter, index, courseId, onChanged }: {
  chapter: Chapter; index: number; courseId: string; onChanged: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete chapter "${chapter.title}" and all its lessons?`)) return
    setDeleting(true)
    try {
      await adminApi.deleteChapter(chapter.id)
      toast.success("Chapter deleted.")
      onChanged()
    } catch (e: any) { toast.error(e.message) }
    finally { setDeleting(false) }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Chapter {index + 1}: {chapter.title}</CardTitle>
        <div className="flex shrink-0 gap-1">
          <AddLessonDialog chapterId={chapter.id} onAdded={onChanged} />
          <Button variant="ghost" size="icon" aria-label="Delete chapter" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Spinner className="size-4" /> : <Trash2 className="size-4 text-destructive" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {chapter.lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {chapter.lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} onChanged={onChanged} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Lesson Row ──────────────────────────────────────────────────────────────

function LessonRow({ lesson, onChanged }: { lesson: Lesson; onChanged: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasVideo = Boolean(lesson.videoUrl)
  const isLocal = lesson.videoUrl?.startsWith("local:")

  async function handleDelete() {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return
    setDeleting(true)
    try {
      await adminApi.deleteLesson(lesson.id)
      toast.success("Lesson deleted.")
      onChanged()
    } catch (e: any) { toast.error(e.message) }
    finally { setDeleting(false) }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadProgress(0)
    try {
      await adminApi.uploadVideo(lesson.id, file, setUploadProgress)
      toast.success("Video uploaded.")
      setUploadProgress(null)
      onChanged()
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed.")
      setUploadProgress(null)
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
      <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 leading-snug">{lesson.title}</span>

      {lesson.preview && <Badge variant="secondary" className="shrink-0">Preview</Badge>}

      {hasVideo ? (
        <Badge variant="outline" className="shrink-0 gap-1 text-xs">
          {isLocal ? "📁 Local video" : "🔗 External"}
        </Badge>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">No video</span>
      )}

      <span className="shrink-0 text-xs text-muted-foreground">{lesson.duration}</span>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="flex w-full items-center gap-2 pl-7">
          <Progress value={uploadProgress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
        </div>
      )}

      <div className="flex shrink-0 gap-1">
        {/* Upload video button */}
        <Button variant="ghost" size="icon" aria-label="Upload video"
          onClick={() => fileRef.current?.click()} disabled={uploadProgress !== null}>
          <Upload className="size-4" />
        </Button>
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />

        <Button variant="ghost" size="icon" aria-label="Delete lesson" onClick={handleDelete} disabled={deleting}>
          {deleting ? <Spinner className="size-4" /> : <Trash2 className="size-4 text-destructive" />}
        </Button>
      </div>
    </li>
  )
}

// ─── Add Lesson ──────────────────────────────────────────────────────────────

function AddLessonDialog({ chapterId, onAdded }: { chapterId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) { toast.error("Enter a lesson title."); return }
    setSaving(true)
    try {
      await adminApi.addLesson(chapterId, {
        title: title.trim(),
        duration: duration.trim() || "5:00",
        preview,
        videoUrl: videoUrl.trim(),
      })
      toast.success("Lesson added.")
      setTitle(""); setDuration(""); setVideoUrl(""); setPreview(false)
      setOpen(false)
      onAdded()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Plus data-icon="inline-start" />Add lesson</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add lesson</DialogTitle></DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="l-title">Lesson title</FieldLabel>
            <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Introduction" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="l-duration">Duration</FieldLabel>
              <Input id="l-duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="8:30" />
            </Field>
            <Field>
              <FieldLabel htmlFor="l-video">Video URL (optional)</FieldLabel>
              <Input id="l-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="YouTube, Vimeo, Google Drive, Loom, Dropbox, or direct .mp4 link" />
            </Field>
          </div>
          <Field orientation="horizontal" className="flex items-center gap-2">
            <input id="l-preview" type="checkbox" checked={preview}
              onChange={(e) => setPreview(e.target.checked)} className="size-4 accent-primary" />
            <FieldLabel htmlFor="l-preview" className="font-normal">Free preview lesson</FieldLabel>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}Add lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
