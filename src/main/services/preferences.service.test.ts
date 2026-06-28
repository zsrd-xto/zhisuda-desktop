import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createDefaultPreferencesInput } from '../../shared/types/preferences'
import { openDatabase } from '../db/database'
import { getOrCreateProfile } from './user.service'
import { getPreferences, getPreferencesOrDefault, savePreferences } from './preferences.service'

function createTestDb(): Database.Database {
  return openDatabase(':memory:')
}

describe('preferences.service', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('returns defaults when preferences do not exist', () => {
    db = createTestDb()
    const user = getOrCreateProfile(db)
    const defaults = getPreferencesOrDefault(db)

    expect(defaults.userId).toBe(user.id)
    expect(defaults.targetPositions).toEqual([])
    expect(defaults.requireInsurance).toBe(true)
  })

  it('saves and loads preferences', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    const input = {
      ...createDefaultPreferencesInput(),
      targetPositions: ['前端开发'],
      targetCities: ['北京'],
      salaryMin: 20,
      salaryMax: 30,
      excludeOutsource: true,
      blacklistCompanies: ['某公司'],
      excludeKeywords: ['外包']
    }

    const saved = savePreferences(input, db)
    expect(saved.targetPositions).toEqual(['前端开发'])
    expect(saved.excludeOutsource).toBe(true)

    const loaded = getPreferences(db)
    expect(loaded?.salaryMax).toBe(30)
    expect(loaded?.blacklistCompanies).toEqual(['某公司'])
  })

  it('rejects invalid salary range', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    expect(() =>
      savePreferences(
        {
          ...createDefaultPreferencesInput(),
          targetPositions: ['前端开发'],
          targetCities: ['北京'],
          salaryMin: 30,
          salaryMax: 20
        },
        db!
      )
    ).toThrow('薪资下限不能高于上限')
  })
})
