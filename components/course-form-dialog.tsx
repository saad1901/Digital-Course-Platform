"use client"

import { useState } from "react"
import { adminApi } from "@/lib/api"
import type { Course } from "@/lib/types"
import { CATEGORIES } from "@/lib/seed-data"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: Course | null
  onSaved: () => void
}

const LEVELS: Course["level"][] = ["Beginner", "Intermediate", "Advanced"]

const THUMBNAILS = [
  { value: "/courses/web-development.png",  label: "Web Development"   },
  { value: "/courses/data-science.png",     label: "Data Science"      },
  { value: "/courses/ui-ux-design.png",     label: "UI/UX Design"      },
  { value: "/courses/digital-marketing.png",label: "Digital Marketing" },
  { value: "/courses/python.png",           label: "Python"            },
  { value: "/courses/photography.png",      label: "Photography"       },
]

export function CourseFormDialog({ open, onOpenChange, course, onSaved }: Props) {
  const editing = Boolean(course)
  const [saving, setSaving] = useState(false)

  const [title,            setTitle]            = useState(course?.title ?? "")
  const [instructor,       setInstructor]       = useState(course?.instructor ?? "")
  const [shortDescription, setShortDescription] = useState(course?.shortDescription ?? "")
  const [description,      setDescription]      = useState(course?.description ?? "")
  const [price,            setPrice]            = useState(course ? String(course.price) : "")
  const [category,         setCategory]         = useState(course?.category ?? CATEGORIES[0])
  const [level,            setLevel]            = useState<Course["level"]>(course?.level ?? "Beginner")
  const [duration,         setDuration]         = useState(course?.duration ?? "")
  const [thumbnail,        setThumbnail]        = useState(course?.thumbnail ?? THUMBNAILS[0].value)

  function resetForm() {
    setTitle(""); setInstructor(""); setShortDescription(""); setDescription("")
    setPrice(""); setCategory(CATEGORIES[0]); setLevel("Beginner")
    setDuration(""); setThumbnail(THUMBNAILS[0].value)
  }

  async function handleSave() {
    if (!title.trim() || !instructor.trim() || !price) {
      toast.error("Please fill in the title, instructor and price.")
      return
    }
    const payload = {
      title: title.trim(), instructor: instructor.trim(),
      shortDescription: shortDescription.trim(), description: description.trim(),
      price: Number(price), category, level,
      duration: duration.trim() || "Self-paced", thumbnail,
    }
    setSaving(true)
    try {
      if (editing && course) {
        await adminApi.updateCourse(course.id, payload)
        toast.success("Course updated.")
      } else {
        await adminApi.createCourse(payload)
        toast.success("Course created.")
        resetForm()
      }
      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save course.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit course" : "Create course"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update the details of this course." : "Add a new course to your catalog."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="c-title">Title</FieldLabel>
            <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="The Complete Web Developer Course" />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-instructor">Instructor</FieldLabel>
            <Input id="c-instructor" value={instructor} onChange={(e) => setInstructor(e.target.value)}
              placeholder="Jane Doe" />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-short">Short description</FieldLabel>
            <Input id="c-short" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)}
              placeholder="One-line summary shown on course cards" />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-desc">Full description</FieldLabel>
            <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="What students will learn..." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="c-price">Price (₹)</FieldLabel>
              <Input id="c-price" type="number" min={0} value={price}
                onChange={(e) => setPrice(e.target.value)} placeholder="499" />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-duration">Duration</FieldLabel>
              <Input id="c-duration" value={duration} onChange={(e) => setDuration(e.target.value)}
                placeholder="12h 30m" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Level</FieldLabel>
              <Select value={level} onValueChange={(v) => v && setLevel(v as Course["level"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel>Thumbnail</FieldLabel>
            <Select value={thumbnail} onValueChange={(v) => v && setThumbnail(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {THUMBNAILS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            {editing ? "Save changes" : "Create course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
