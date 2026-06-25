import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import path from "path"
import * as schema from "./schema"

const DB_PATH = path.join(process.cwd(), "storage", "learnhub.db")

// Singleton — reuse the same connection across hot-reloads in dev
const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> }

export const db = globalForDb._db ?? drizzle(new Database(DB_PATH), { schema })

if (process.env.NODE_ENV !== "production") {
  globalForDb._db = db
}
