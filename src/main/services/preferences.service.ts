import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { JobPreferences, JobPreferencesInput } from '../../shared/types/preferences'
import { createDefaultPreferencesInput } from '../../shared/types/preferences'
import { getDb } from '../db/database'
import { getOrCreateProfile } from './user.service'

interface PreferencesRow {
  id: string
  user_id: string
  target_positions: string
  target_cities: string
  salary_min: number | null
  salary_max: number | null
  industries: string
  company_sizes: string
  require_insurance: number
  require_weekend_off: number
  exclude_outsource: number
  blacklist_companies: string
  exclude_keywords: string
  updated_at: string
}

function parseJsonArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.filter((item): item is string => typeof item === 'string')
}

function mapRowToPreferences(row: PreferencesRow): JobPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    targetPositions: parseJsonArray(row.target_positions),
    targetCities: parseJsonArray(row.target_cities),
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    industries: parseJsonArray(row.industries),
    companySizes: parseJsonArray(row.company_sizes),
    requireInsurance: row.require_insurance === 1,
    requireWeekendOff: row.require_weekend_off === 1,
    excludeOutsource: row.exclude_outsource === 1,
    blacklistCompanies: parseJsonArray(row.blacklist_companies),
    excludeKeywords: parseJsonArray(row.exclude_keywords),
    updatedAt: row.updated_at
  }
}

function getPreferencesRow(userId: string, db: Database.Database): PreferencesRow | undefined {
  return db
    .prepare(
      `SELECT id, user_id, target_positions, target_cities, salary_min, salary_max,
              industries, company_sizes, require_insurance, require_weekend_off,
              exclude_outsource, blacklist_companies, exclude_keywords, updated_at
       FROM job_preferences
       WHERE user_id = ?`
    )
    .get(userId) as PreferencesRow | undefined
}

export function getPreferences(db: Database.Database = getDb()): JobPreferences | null {
  const user = getOrCreateProfile(db)
  const row = getPreferencesRow(user.id, db)
  return row ? mapRowToPreferences(row) : null
}

export function getPreferencesOrDefault(db: Database.Database = getDb()): JobPreferences {
  const existing = getPreferences(db)
  if (existing) {
    return existing
  }

  const user = getOrCreateProfile(db)
  const defaults = createDefaultPreferencesInput()
  return {
    id: '',
    userId: user.id,
    ...defaults,
    updatedAt: ''
  }
}

function validatePreferencesInput(input: JobPreferencesInput): void {
  if (input.targetPositions.length === 0) {
    throw new Error('请至少填写一个目标岗位')
  }
  if (input.targetCities.length === 0) {
    throw new Error('请至少填写一个目标城市')
  }
  if (input.salaryMin === null || input.salaryMax === null) {
    throw new Error('请填写薪资范围')
  }
  if (input.salaryMin > input.salaryMax) {
    throw new Error('薪资下限不能高于上限')
  }
}

export function savePreferences(
  input: JobPreferencesInput,
  db: Database.Database = getDb()
): JobPreferences {
  validatePreferencesInput(input)
  const user = getOrCreateProfile(db)
  const existing = getPreferencesRow(user.id, db)

  const payload = [
    JSON.stringify(input.targetPositions),
    JSON.stringify(input.targetCities),
    input.salaryMin,
    input.salaryMax,
    JSON.stringify(input.industries),
    JSON.stringify(input.companySizes),
    input.requireInsurance ? 1 : 0,
    input.requireWeekendOff ? 1 : 0,
    input.excludeOutsource ? 1 : 0,
    JSON.stringify(input.blacklistCompanies),
    JSON.stringify(input.excludeKeywords)
  ]

  if (existing) {
    db.prepare(
      `UPDATE job_preferences
       SET target_positions = ?, target_cities = ?, salary_min = ?, salary_max = ?,
           industries = ?, company_sizes = ?, require_insurance = ?, require_weekend_off = ?,
           exclude_outsource = ?, blacklist_companies = ?, exclude_keywords = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(...payload, existing.id)

    const updated = getPreferencesRow(user.id, db)
    if (!updated) {
      throw new Error('保存求职偏好失败')
    }
    return mapRowToPreferences(updated)
  }

  const id = randomUUID()
  db.prepare(
    `INSERT INTO job_preferences (
      id, user_id, target_positions, target_cities, salary_min, salary_max,
      industries, company_sizes, require_insurance, require_weekend_off,
      exclude_outsource, blacklist_companies, exclude_keywords
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, user.id, ...payload)

  const created = getPreferencesRow(user.id, db)
  if (!created) {
    throw new Error('保存求职偏好失败')
  }
  return mapRowToPreferences(created)
}

export function parseTagInput(value: string): string[] {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
