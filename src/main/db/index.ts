import { app } from 'electron'
import { join } from 'path'
import { openDatabase, setDatabase } from './database'

export function initDatabase(dbPath?: string): void {
  const resolvedPath = dbPath ?? join(app.getPath('userData'), 'zhisuda.db')
  setDatabase(openDatabase(resolvedPath))
}

export { closeDatabase, getDb, openDatabase, resetDatabase, setDatabase } from './database'
