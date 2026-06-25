export type Role = "user" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt?: string
}

export interface Lesson {
  id: string
  chapterId?: string
  title: string
  /**
   * "local:<lessonId>" → streamed via /api/video/[lessonId]
   * "https://..."      → external embed URL
   * ""                 → placeholder
   */
  videoUrl: string
  duration: string
  preview: boolean
  position?: number
}

export interface Chapter {
  id: string
  courseId?: string
  title: string
  position?: number
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  instructor: string
  category: string
  description: string
  shortDescription: string
  duration: string
  price: number
  thumbnail: string
  rating: number
  students: number
  level: "Beginner" | "Intermediate" | "Advanced"
  chapters: Chapter[]
}

export interface Purchase {
  id: string
  userId: string
  courseId: string
  amount: number
  purchasedAt: string
  paymentId: string
}
