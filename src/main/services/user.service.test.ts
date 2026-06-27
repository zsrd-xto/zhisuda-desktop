import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database'
import { clearAllData, getOrCreateProfile, updateNickname } from './user.service'

function createTestDb(): Database.Database {
  return openDatabase(':memory:')
}

describe('getOrCreateProfile', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('creates a user on first call', () => {
    db = createTestDb()
    const profile = getOrCreateProfile(db)

    expect(profile.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(profile.deviceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(profile.nickname).toBeNull()
    expect(profile.createdAt).toBeTruthy()
  })

  it('returns the same user on subsequent calls', () => {
    db = createTestDb()
    const first = getOrCreateProfile(db)
    const second = getOrCreateProfile(db)

    expect(second).toEqual(first)
  })
})

describe('updateNickname', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('persists nickname for the local user', () => {
    db = createTestDb()
    getOrCreateProfile(db)
    const updated = updateNickname('向涛', db)

    expect(updated.nickname).toBe('向涛')
    expect(getOrCreateProfile(db).nickname).toBe('向涛')
  })

  it('rejects empty nickname', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    expect(() => updateNickname('  ', db!)).toThrow('昵称不能为空')
  })
})

describe('clearAllData', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('recreates a fresh local user after clearing data', () => {
    db = createTestDb()
    const original = getOrCreateProfile(db)
    updateNickname('旧昵称', db)

    const recreated = clearAllData(db)

    expect(recreated.id).not.toBe(original.id)
    expect(recreated.nickname).toBeNull()
  })
})
