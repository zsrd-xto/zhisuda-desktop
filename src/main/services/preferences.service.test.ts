import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createDefaultPreferenceInput } from '../../shared/types/preferences'
import { openDatabase } from '../db/database'
import { getOrCreateProfile } from './user.service'
import {
  deletePreference,
  getPreference,
  listPreferences,
  savePreference
} from './preferences.service'

function createTestDb(): Database.Database {
  return openDatabase(':memory:')
}

describe('preferences.service', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('creates multiple preferences with generated names', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    const first = savePreference(
      {
        ...createDefaultPreferenceInput(),
        targetPosition: 'AI应用开发',
        targetCity: '深圳',
        salaryMin: 20,
        salaryMax: 25
      },
      db
    )

    const second = savePreference(
      {
        ...createDefaultPreferenceInput(),
        targetPosition: '前端开发',
        targetCity: '北京',
        salaryMin: 15,
        salaryMax: 30
      },
      db
    )

    expect(first.name).toBe('AI应用开发·深圳·20-25K')
    expect(first.titleMatchThreshold).toBe(20)
    expect(second.name).toBe('前端开发·北京·15-30K')
    expect(listPreferences(db)).toHaveLength(2)
  })

  it('updates and deletes preference', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    const saved = savePreference(
      {
        ...createDefaultPreferenceInput(),
        targetPosition: '前端开发',
        targetCity: '北京',
        salaryMin: 20,
        salaryMax: 30,
        excludeKeywords: ['外包']
      },
      db
    )

    const updated = savePreference(
      {
        id: saved.id,
        ...createDefaultPreferenceInput(),
        targetPosition: '全栈工程师',
        targetCity: '上海',
        salaryMin: 25,
        salaryMax: 35,
        excludeKeywords: ['外包', '驻场']
      },
      db
    )

    expect(updated.name).toBe('全栈工程师·上海·25-35K')
    expect(getPreference(saved.id, db)?.targetCity).toBe('上海')
    expect(getPreference(saved.id, db)?.excludeOutsource).toBe(true)

    expect(deletePreference(saved.id, db)).toBe(true)
    expect(listPreferences(db)).toHaveLength(0)
  })

  it('rejects invalid salary range', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    expect(() =>
      savePreference(
        {
          ...createDefaultPreferenceInput(),
          targetPosition: '前端开发',
          targetCity: '北京',
          salaryMin: 30,
          salaryMax: 20
        },
        db!
      )
    ).toThrow('薪资下限不能高于上限')
  })
})
