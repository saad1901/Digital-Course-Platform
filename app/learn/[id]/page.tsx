"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, CheckCircle2, Circle, PlayCircle, Clock, ListVideo, GraduationCap,
} from "lucide-react"
import { useSession } from "@/lib/session"
import { coursesApi, progressApi, purchasesApi } from "@/lib/api"
import type { Course, Lesson, Chapter } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { resolveVideoUrl } from "@/lib/video"

interface FlatLesson { chapterTitle: string; lesson: Lesson }

function VideoArea({ lesson, lessonId }: { lesson: Lesson | null; lessonId: string | null }) {
  if (!lesson || !lessonId) return null

  const source = resolveVideoUrl(lesson.videoUrl ?? "", lessonId)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-foreground">
      {source.type === "iframe" && (
        <iframe
          key={source.src}
          src={source.src}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="size-full"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        />
      )}

      {(source.type === "video" || source.type === "local") && (
        <video
          key={source.src}
          src={source.src}
          controls
          className="size-full"
          onContextMenu={(e) => e.preventDefault()}
          controlsList="nodownload"
        />
      )}

      {source.type === "open" && (
        <div className="flex size-full flex-col items-center justify-center gap-4 bg-foreground text-background px-6 text-center">
          <PlayCircle className="size-14 opacity-70" />
          <p className="text-sm opacity-80">This video can&apos;t be embedded directly.</p>
          <a
            href={source.src}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {source.label}
          </a>
        </div>
      )}

      {source.type === "empty" && (
        <div className="flex size-full flex-col items-center justify-center gap-3 bg-foreground text-background">
          <PlayCircle className="size-16 opacity-80" />
          <p className="px-4 text-center text-sm opacity-80">Video placeholder — {lesson.title}</p>
        </div>
      )}
    </div>
  )
}

function LessonList({ chapters, activeId, completed, onSelect }: {
  chapters: Chapter[]; activeId: string | null; completed: Set<string>; onSelect: (l: Lesson) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {chapters.map((ch, idx) => (
        <div key={ch.id} className="flex flex-col gap-1">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {String(idx + 1).padStart(2, "0")} · {ch.title}
          </p>
          {ch.lessons.map((l) => {
            const isActive = l.id === activeId
            const isDone = completed.has(l.id)
            return (
              <button key={l.id} onClick={() => onSelect(l)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted",
                )}>
                {isDone
                  ? <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  : <Circle className="size-4 shrink-0 text-muted-foreground" />}
                <span className="flex-1 leading-snug">{l.title}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />{l.duration}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function PlayerPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, ready } = useSession()

  const [course, setCourse]           = useState<Course | null>(null)
  const [completedIds, setCompleted]  = useState<Set<string>>(new Set())
  const [activeId, setActiveId]       = useState<string | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [marking, setMarking]         = useState(false)

  // Load course
  useEffect(() => {
    coursesApi.get(params.id).then(setCourse).catch(() => setCourse(null)).finally(() => setLoadingCourse(false))
  }, [params.id])

  // Load progress
  useEffect(() => {
    if (user && params.id) {
      progressApi.get(params.id).then((ids) => setCompleted(new Set(ids))).catch(() => {})
    }
  }, [user, params.id])

  // Access control — check purchase
  useEffect(() => {
    if (!ready) return
    if (!user) { router.push(`/auth?redirect=/learn/${params.id}`); return }
    if (!course) return
    purchasesApi.list().then((ps) => {
      if (!ps.some((p) => p.courseId === params.id)) {
        router.push(`/courses/${params.id}`)
      }
    }).catch(() => {})
  }, [ready, user, course, params.id, router])

  const flat: FlatLesson[] = useMemo(() => {
    if (!course) return []
    return course.chapters.flatMap((ch) => ch.lessons.map((lesson) => ({ chapterTitle: ch.title, lesson })))
  }, [course])

  useEffect(() => {
    if (flat.length && !activeId) setActiveId(flat[0].lesson.id)
  }, [flat, activeId])

  const activeLesson = flat.find((f) => f.lesson.id === activeId)?.lesson ?? null
  const progress = flat.length ? Math.round((completedIds.size / flat.length) * 100) : 0

  async function markComplete() {
    if (!activeLesson || marking) return
    setMarking(true)
    try {
      await progressApi.mark(activeLesson.id)
      setCompleted((prev) => new Set(prev).add(activeLesson.id))
      const idx = flat.findIndex((f) => f.lesson.id === activeLesson.id)
      if (idx >= 0 && idx < flat.length - 1) setActiveId(flat[idx + 1].lesson.id)
    } catch { /* ignore */ } finally {
      setMarking(false)
    }
  }

  if (loadingCourse || !ready) {
    return <div className="flex min-h-svh items-center justify-center"><Spinner className="size-8" /></div>
  }
  if (!course) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">Course not found</p>
        <Button render={<Link href="/" />}>Back home</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon-sm" render={<Link href={`/courses/${course.id}`} />}>
              <ArrowLeft />
            </Button>
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </span>
            <p className="truncate text-sm font-semibold">{course.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Progress value={progress} className="w-28" />
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground sm:hidden">{progress}%</span>
            <Sheet>
              <SheetTrigger render={
                <Button variant="outline" size="sm" className="lg:hidden">
                  <ListVideo data-icon="inline-start" />Lessons
                </Button>
              } />
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="border-b px-4 py-3">
                  <SheetTitle>Course content</SheetTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={progress} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>
                </SheetHeader>
                <ScrollArea className="h-[calc(100svh-6rem)] px-3 pb-6 pt-2">
                  <LessonList chapters={course.chapters} activeId={activeId}
                    completed={completedIds} onSelect={(l) => setActiveId(l.id)} />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        {/* Player */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <VideoArea lesson={activeLesson} lessonId={activeId} />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {flat.find((f) => f.lesson.id === activeId)?.chapterTitle}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-balance text-xl font-semibold">{activeLesson?.title}</h1>
              <Button onClick={markComplete} size="sm"
                disabled={!activeLesson || completedIds.has(activeLesson.id) || marking}>
                {marking ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                {activeLesson && completedIds.has(activeLesson.id) ? "Completed" : "Mark complete"}
              </Button>
            </div>
            <Separator className="my-2" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              In this lesson you&apos;ll work through <strong>{activeLesson?.title}</strong>. Use the
              course content panel to move between lessons and track your progress.
            </p>
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-20 rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Course content</p>
              <span className="text-xs text-muted-foreground">{progress}% done</span>
            </div>
            <Progress value={progress} className="mb-4" />
            <ScrollArea className="h-[60svh] pr-2">
              <LessonList chapters={course.chapters} activeId={activeId}
                completed={completedIds} onSelect={(l) => setActiveId(l.id)} />
            </ScrollArea>
          </div>
        </aside>
      </div>
    </div>
  )
}
