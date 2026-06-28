import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { UserProfile } from '../../shared/types/user'
import { getDb } from '../db/database'

interface UserRow {
  id: string
  device_id: string
  nickname: string | null
  created_at: string
}

function mapRowToProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    deviceId: row.device_id,
    nickname: row.nickname,
    createdAt: row.created_at
  }
}

export function getOrCreateProfile(db: Database.Database = getDb()): UserProfile {
  const existing = db
    .prepare('SELECT id, device_id, nickname, created_at FROM users LIMIT 1')
    .get() as UserRow | undefined

  if (existing) {
    return mapRowToProfile(existing)
  }

  const id = randomUUID()
  const deviceId = randomUUID()

  db.prepare('INSERT INTO users (id, device_id, nickname) VALUES (?, ?, ?)').run(id, deviceId, null)

  const created = db
    .prepare('SELECT id, device_id, nickname, created_at FROM users WHERE id = ?')
    .get(id) as UserRow

  return mapRowToProfile(created)
}

export function updateNickname(nickname: string, db: Database.Database = getDb()): UserProfile {
  const trimmed = nickname.trim()
  if (!trimmed) {
    throw new Error('昵称不能为空')
  }

  const profile = getOrCreateProfile(db)
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(trimmed, profile.id)

  const updated = db
    .prepare('SELECT id, device_id, nickname, created_at FROM users WHERE id = ?')
    .get(profile.id) as UserRow

  return mapRowToProfile(updated)
}

export function clearAllData(db: Database.Database = getDb()): UserProfile {
  const run = db.transaction(() => {
    db.prepare('DELETE FROM job_fetch_batches').run()
    db.prepare('DELETE FROM job_listings').run()
    db.prepare('DELETE FROM platform_extract_runs').run()
    db.prepare('DELETE FROM platform_page_profiles').run()
    db.prepare('DELETE FROM platform_accounts').run()
    db.prepare('DELETE FROM job_preferences').run()
    db.prepare('DELETE FROM resumes').run()
    db.prepare('DELETE FROM users').run()
  })

  run()

  return getOrCreateProfile(db)
}
