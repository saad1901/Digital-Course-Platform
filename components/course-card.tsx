"use client"

import Link from "next/link"
import { Star, Users, PlayCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Course } from "@/lib/types"
import { formatPrice, totalLessons } from "@/lib/format"

interface Props {
  course: Course
  /** Pass true when this course is already purchased */
  owned?: boolean
}

export function CourseCard({ course, owned = false }: Props) {
  const href = owned ? `/learn/${course.id}` : `/courses/${course.id}`

  return (
    <Card className="group overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img src={course.thumbnail || "/placeholder.svg"} alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <Badge variant="secondary" className="absolute left-3 top-3 backdrop-blur">
            {course.category}
          </Badge>
          {owned && (
            <Badge className="absolute right-3 top-3 gap-1">
              <CheckCircle2 className="size-3" />Enrolled
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <PlayCircle className="size-3.5" />
            {totalLessons(course.chapters)} lessons
          </span>
          <span aria-hidden>•</span>
          <span>{course.level}</span>
        </div>
        <Link href={href}>
          <h3 className="line-clamp-2 text-balance font-semibold leading-snug hover:text-primary">
            {course.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground">by {course.instructor}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="size-3.5 fill-chart-4 text-chart-4" />
            {course.rating || "New"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {course.students.toLocaleString()}
          </span>
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4">
        {owned
          ? <span className="font-semibold text-primary">Continue learning</span>
          : <span className="text-lg font-bold">{formatPrice(course.price)}</span>
        }
      </CardFooter>
    </Card>
  )
}
