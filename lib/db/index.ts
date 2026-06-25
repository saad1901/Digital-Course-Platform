/**
 * Database connection — adapter pattern.
 *
 * Priority (first match wins):
 *   1. DATABASE_URL starts with "postgres"
 *      → Neon serverless Postgres (Vercel production)
 *   2. TURSO_DATABASE_URL set
 *      → Turso / remote libSQL
 *   3. Fallback
 *      → Local SQLite file via libSQL  (local dev, zero config)
 */

import * as schema from "./schema"

type AnyClient = {
  /** Run one or more semicolon-separated SQL statements (DDL / raw) */
  execRaw: (sql: string) => Promise<void>
}

function createDb(): { db: any; client: AnyClient } {
  const dbUrl = process.env.DATABASE_URL ?? ""

  // ── Neon / Postgres ──────────────────────────────────────────────────────
  if (dbUrl.startsWith("postgres")) {
    const { neon, neonConfig } = require("@neondatabase/serverless")
    const ws = require("ws")
    const { drizzle } = require("drizzle-orm/neon-http")

    // Required for Node.js — neon's HTTP mode uses fetch which doesn't work
    // in Node without this. WebSocket mode works everywhere.
    neonConfig.webSocketConstructor = ws
    neonConfig.useSecureWebSocket = true

    const sql = neon(dbUrl)
    const db  = drizzle(sql, { schema })

    const client: AnyClient = {
      execRaw: async (rawSql: string) => {
        const stmts = rawSql.split(";").map((s) => s.trim()).filter(Boolean)
        for (const stmt of stmts) {
          await sql.query(stmt)
        }
      },
    }
    return { db, client }
  }

  // ── Turso remote libSQL ──────────────────────────────────────────────────
  const tursoUrl = process.env.TURSO_DATABASE_URL
  if (tursoUrl) {
    const { createClient } = require("@libsql/client")
    const { drizzle }      = require("drizzle-orm/libsql")
    const rawClient = createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN })
    const db = drizzle(rawClient, { schema })

    const client: AnyClient = {
      execRaw: async (rawSql: string) => {
        const stmts = rawSql.split(";").map((s) => s.trim()).filter(Boolean)
        for (const stmt of stmts) {
          await rawClient.execute(stmt)
        }
      },
    }
    return { db, client }
  }

  // ── Local SQLite (dev fallback) ──────────────────────────────────────────
  const path = require("path") as typeof import("path")
  const fs   = require("fs")   as typeof import("fs")
  const storageDir = path.join(process.cwd(), "storage")
  fs.mkdirSync(path.join(storageDir, "videos"), { recursive: true })

  const { createClient } = require("@libsql/client")
  const { drizzle }      = require("drizzle-orm/libsql")
  const rawClient = createClient({ url: `file:${path.join(storageDir, "learnhub.db")}` })
  const db = drizzle(rawClient, { schema })

  const client: AnyClient = {
    execRaw: async (rawSql: string) => {
      const stmts = rawSql.split(";").map((s) => s.trim()).filter(Boolean)
      for (const stmt of stmts) {
        await rawClient.execute(stmt)
      }
    },
  }
  return { db, client }
}

// Singleton — reuse across hot-reloads in dev
const g = globalThis as unknown as { _learnhub?: ReturnType<typeof createDb> }
const instance = g._learnhub ?? createDb()
if (process.env.NODE_ENV !== "production") g._learnhub = instance

export const db     = instance.db
export const client = instance.client
