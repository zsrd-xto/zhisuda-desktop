import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createEmptyResumeParsedData } from '../../shared/types/resume'
import { openDatabase } from '../db/database'
import { getOrCreateProfile } from './user.service'
import { getPrimaryResume, updatePrimaryResume } from './resume.service'

function createTestDb(): Database.Database {
  return openDatabase(':memory:')
}

describe('resume.service', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('returns null when no resume exists', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    expect(getPrimaryResume(db)).toBeNull()
  })

  it('creates and updates primary resume data', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    const initialData = createEmptyResumeParsedData()
    initialData.basicInfo.name = '李四'
    initialData.basicInfo.email = 'lisi@example.com'

    const created = updatePrimaryResume(initialData, db)
    expect(created.parsedData.basicInfo.name).toBe('李四')

    const loaded = getPrimaryResume(db)
    expect(loaded?.parsedData.basicInfo.email).toBe('lisi@example.com')

    initialData.basicInfo.phone = '13900139000'
    const updated = updatePrimaryResume(initialData, db)
    expect(updated.parsedData.basicInfo.phone).toBe('13900139000')
  })
})
