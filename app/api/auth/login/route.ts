import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get()

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    const token = await signToken({ sub: user.id, role: user.role })
    await setAuthCookie(token)

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error("[login]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
