import Link from "next/link"
import { GraduationCap, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <GraduationCap className="size-8" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-xl font-semibold">Page not found</p>
        <p className="max-w-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/" />}>
        <Home data-icon="inline-start" />
        Back to home
      </Button>
    </div>
  )
}
