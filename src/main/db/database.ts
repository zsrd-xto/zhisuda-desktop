import Database from 'better-sqlite3'
import { runMigrations } from './migrate'

let db: Database.Database | null = null

export function openDatabase(dbPath: string): Database.Database {
  const database = new Database(dbPath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  runMigrations(database)
  return database
}

export function setDatabase(database: Database.Database): void {
  db = database
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call setDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function resetDatabase(): void {
  db = null
}
