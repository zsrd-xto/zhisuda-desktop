import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { PlatformLoginStatus } from '../../shared/types/platform'
import { getDb } from '../db/database'
import { getOrCreateProfile } from './user.service'

interface PlatformAccountRow {
  id: string
  user_id: string
  platform: string
  status: string
  last_login_at: string | null
  created_at: string
}

export function getPlatformAccount(
  platform: string,
  db: Database.Database = getDb()
): PlatformAccountRow | undefined {
  const user = getOrCreateProfile(db)
  return db
    .prepare(
      `SELECT id, user_id, platform, status, last_login_at, created_at
       FROM platform_accounts
       WHERE user_id = ? AND platform = ?`
    )
    .get(user.id, platform) as PlatformAccountRow | undefined
}

export function upsertPlatformLogin(
  platform: string,
  loggedIn: boolean,
  db: Database.Database = getDb()
): PlatformLoginStatus {
  const user = getOrCreateProfile(db)
  const existing = getPlatformAccount(platform, db)
  const status = loggedIn ? 'active' : 'inactive'

  if (existing) {
    db.prepare(
      `UPDATE platform_accounts
       SET status = ?, last_login_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE last_login_at END
       WHERE id = ?`
    ).run(status, loggedIn ? 1 : 0, existing.id)
  } else {
    db.prepare(
      `INSERT INTO platform_accounts (id, user_id, platform, status, last_login_at)
       VALUES (?, ?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)`
    ).run(randomUUID(), user.id, platform, status, loggedIn ? 1 : 0)
  }

  const updated = getPlatformAccount(platform, db)
  return {
    platform: platform as PlatformLoginStatus['platform'],
    loggedIn,
    lastLoginAt: updated?.last_login_at ?? null
  }
}

export function getPlatformLoginStatus(
  platform: string,
  db: Database.Database = getDb()
): PlatformLoginStatus {
  const row = getPlatformAccount(platform, db)
  return {
    platform: platform as PlatformLoginStatus['platform'],
    loggedIn: row?.status === 'active',
    lastLoginAt: row?.last_login_at ?? null
  }
}
