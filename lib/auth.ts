import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { db } from "./db"
import { users } from "./db/schema"
import { eq } from "drizzle-orm"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "learnhub-dev-secret-change-in-production"
)
const COOKIE_NAME = "learnhub_token"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ─── Crypto helpers ──────────────────────────────────────────────────────────

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface TokenPayload {
  sub: string   // userId
  role: string
}

export async function signToken(payload: TokenPayload) {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return { sub: payload.sub as string, role: payload.role as string }
  } catch {
    return null
  }
}

// ─── Cookie helpers (server-side only) ───────────────────────────────────────

export async function setAuthCookie(token: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function clearAuthCookie() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function getTokenFromCookie(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value ?? null
}

// ─── Get current user from cookie ────────────────────────────────────────────

export async function getCurrentUser() {
  const token = await getTokenFromCookie()
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null
  const rows = await db.select().from(users).where(eq(users.id, payload.sub))
  return rows[0] ?? null
}
