import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword, signToken, setAuthCookie, uid } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
    }

    const existing = db.select().from(users).where(eq(users.email, email.toLowerCase())).get()
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
    }

    const hash = await hashPassword(password)
    const newUser = {
      id: uid("user"),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      role: "user" as const,
    }

    db.insert(users).values(newUser).run()

    const token = await signToken({ sub: newUser.id, role: newUser.role })
    await setAuthCookie(token)

    return NextResponse.json({
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    }, { status: 201 })
  } catch (err) {
    console.error("[signup]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
