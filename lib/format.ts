export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function totalLessons(chapters: { lessons: unknown[] }[]) {
  return chapters.reduce((sum, c) => sum + c.lessons.length, 0)
}
