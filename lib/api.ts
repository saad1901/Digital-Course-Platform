/**
 * Typed fetch wrappers for every API route.
 * All functions are plain async — call them from useEffect / event handlers.
 */

import type { Course } from "./types"

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`)
  return data as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser { id: string; name: string; email: string; role: string }

export const authApi = {
  me: () => apiFetch<{ user: AuthUser | null }>("/api/auth/me"),

  login: (email: string, password: string) =>
    apiFetch<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password: string) =>
    apiFetch<{ user: AuthUser }>("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () =>
    apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export const coursesApi = {
  list: () => apiFetch<Course[]>("/api/courses"),
  get: (id: string) => apiFetch<Course>(`/api/courses/${id}`),
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export interface Purchase {
  id: string; userId: string; courseId: string; amount: number
  paymentId: string; purchasedAt: string
}

export const purchasesApi = {
  list: () => apiFetch<Purchase[]>("/api/purchases"),
  create: (courseId: string, paymentId: string) =>
    apiFetch<Purchase>("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, paymentId }),
    }),
}

// ─── Progress ────────────────────────────────────────────────────────────────

export const progressApi = {
  get: (courseId: string) =>
    apiFetch<string[]>(`/api/progress?courseId=${encodeURIComponent(courseId)}`),
  mark: (lessonId: string) =>
    apiFetch<{ ok: boolean }>("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    }),
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number; totalSold: number; totalRevenue: number; totalCourses: number
  revenueByCourse: { id: string; name: string; revenue: number }[]
  recentPurchases: {
    id: string; userId: string; courseId: string; amount: number
    paymentId: string; purchasedAt: string; userName: string; courseTitle: string
  }[]
}

export interface StudentEnrollment {
  purchaseId: string
  courseId: string
  courseTitle: string
  amount: number
  paymentId: string
  purchasedAt: string
}

export interface AdminStudent {
  id: string
  name: string
  email: string
  createdAt: string
  enrollments: StudentEnrollment[]
}

export interface CourseStudent {
  purchaseId: string
  userId: string
  name: string
  email: string
  amount: number
  paymentId: string
  purchasedAt: string
}

export const adminApi = {
  stats: () => apiFetch<AdminStats>("/api/admin/stats"),

  // Students
  listStudents: () => apiFetch<AdminStudent[]>("/api/admin/students"),
  listCourseStudents: (courseId: string) =>
    apiFetch<CourseStudent[]>(`/api/admin/courses/${courseId}/students`),
  grantAccess: (userId: string, courseId: string) =>
    apiFetch<{ ok: boolean }>("/api/admin/giveaway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, courseId }),
    }),

  // Courses
  listCourses: () => apiFetch<Course[]>("/api/admin/courses"),
  getCourse: (id: string) => apiFetch<Course>(`/api/admin/courses/${id}`),
  createCourse: (data: Partial<Course>) =>
    apiFetch<Course>("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateCourse: (id: string, data: Partial<Course>) =>
    apiFetch<Course>(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteCourse: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${id}`, { method: "DELETE" }),

  // Chapters
  addChapter: (courseId: string, title: string) =>
    apiFetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title }),
    }),
  updateChapter: (id: string, title: string) =>
    apiFetch(`/api/admin/chapters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),
  deleteChapter: (id: string) =>
    apiFetch(`/api/admin/chapters/${id}`, { method: "DELETE" }),

  // Lessons
  addLesson: (chapterId: string, data: { title: string; duration?: string; preview?: boolean; videoUrl?: string }) =>
    apiFetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, ...data }),
    }),
  updateLesson: (id: string, data: Partial<{ title: string; duration: string; preview: boolean; videoUrl: string }>) =>
    apiFetch(`/api/admin/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteLesson: (id: string) =>
    apiFetch(`/api/admin/lessons/${id}`, { method: "DELETE" }),

  // Video upload
  uploadVideo: (lessonId: string, file: File, onProgress?: (pct: number) => void) => {
    return new Promise<{ ok: boolean; videoUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append("lessonId", lessonId)
      fd.append("file", file)

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
        })
      }

      xhr.addEventListener("load", () => {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new Error(data.error ?? xhr.statusText))
      })
      xhr.addEventListener("error", () => reject(new Error("Upload failed.")))

      xhr.open("POST", "/api/upload/video")
      xhr.send(fd)
    })
  },
}
