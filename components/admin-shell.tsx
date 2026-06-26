"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { LayoutDashboard, BookOpen, ArrowLeft, LogOut, GraduationCap, Users } from "lucide-react"
import { useSession } from "@/lib/session"
import { authApi } from "@/lib/api"
import { cn, initials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

const NAV = [
  { href: "/admin",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses",  label: "Courses",   icon: BookOpen        },
  { href: "/admin/students", label: "Students",  icon: Users           },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, ready, refresh } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  // Client-side guard (middleware handles server-side)
  useEffect(() => {
    if (ready && (!user || user.role !== "admin")) {
      router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [ready, user, router, pathname])

  if (!ready || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  async function handleLogout() {
    await authApi.logout()
    await refresh()
    router.push("/")
    toast.success("Signed out.")
  }

  return (
    <div className="flex min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="font-semibold">LearnHub Admin</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}>
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Button variant="ghost" className="justify-start" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" />Back to site
          </Button>
          <Button variant="ghost" className="justify-start" onClick={handleLogout}>
            <LogOut data-icon="inline-start" />Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top header */}
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </span>
            <span className="font-semibold">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Button key={href} variant={pathname === href ? "secondary" : "ghost"} size="icon"
                nativeButton={false} render={<Link href={href} />} aria-label={label}>
                <Icon />
              </Button>
            ))}
            <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/" />} aria-label="Back to site">
              <ArrowLeft />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                  </Avatar>
                </button>
              } />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut data-icon="inline-start" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
          aria-label="Admin navigation">
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                  pathname === href ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}>
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  )
}
