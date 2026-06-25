import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import path from "path"
import fs from "fs"
import * as schema from "./schema"

const STORAGE_DIR = path.join(process.cwd(), "storage")
const VIDEO_DIR   = path.join(STORAGE_DIR, "videos")
const DB_PATH     = path.join(STORAGE_DIR, "learnhub.db")

// Ensure directories exist before opening the database
fs.mkdirSync(VIDEO_DIR, { recursive: true })

// Singleton — reuse the same connection across hot-reloads in dev
const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> }

export const db = globalForDb._db ?? drizzle(new Database(DB_PATH), { schema })

if (process.env.NODE_ENV !== "production") {
  globalForDb._db = db
}
