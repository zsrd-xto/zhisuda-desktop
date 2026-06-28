import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database'
import { getOrCreateProfile } from './user.service'
import { getPlatformLoginStatus, upsertPlatformLogin } from './platform-account.service'

function createTestDb(): Database.Database {
  return openDatabase(':memory:')
}

describe('platform-account.service', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('tracks boss login status', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    const inactive = getPlatformLoginStatus('boss', db)
    expect(inactive.loggedIn).toBe(false)

    const active = upsertPlatformLogin('boss', true, db)
    expect(active.loggedIn).toBe(true)
    expect(active.lastLoginAt).toBeTruthy()

    const loaded = getPlatformLoginStatus('boss', db)
    expect(loaded.loggedIn).toBe(true)
  })
})
