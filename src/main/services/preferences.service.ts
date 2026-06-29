import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { JobPreference, JobPreferenceInput } from '../../shared/types/preferences'
import {
  buildPreferenceName,
  createDefaultPreferenceInput,
  DEFAULT_TITLE_MATCH_THRESHOLD,
  deriveExcludeOutsource
} from '../../shared/types/preferences'
import { getDb } from '../db/database'
import { getOrCreateProfile } from './user.service'

interface PreferenceRow {
  id: string
  user_id: string
  name: string
  target_position: string
  title_match_threshold: number
  target_city: string
  salary_min: number
  salary_max: number
  industries: string
  company_sizes: string
  require_insurance: number
  require_weekend_off: number
  exclude_outsource: number
  blacklist_companies: string
  exclude_keywords: string
  responsibility_keywords: string
  created_at: string
  updated_at: string
}

function parseJsonArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed.filter((item): item is string => typeof item === 'string')
}

function mapRow(row: PreferenceRow): JobPreference {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetPosition: row.target_position,
    titleMatchThreshold: row.title_match_threshold ?? DEFAULT_TITLE_MATCH_THRESHOLD,
    targetCity: row.target_city,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    industries: parseJsonArray(row.industries),
    companySizes: parseJsonArray(row.company_sizes),
    requireInsurance: row.require_insurance === 1,
    requireWeekendOff: row.require_weekend_off === 1,
    excludeOutsource: row.exclude_outsource === 1,
    blacklistCompanies: parseJsonArray(row.blacklist_companies),
    excludeKeywords: parseJsonArray(row.exclude_keywords),
    responsibilityKeywords: parseJsonArray(row.responsibility_keywords ?? '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SELECT_FIELDS = `SELECT id, user_id, name, target_position, title_match_threshold, target_city, salary_min, salary_max,
  industries, company_sizes, require_insurance, require_weekend_off, exclude_outsource,
  blacklist_companies, exclude_keywords, responsibility_keywords, created_at, updated_at FROM job_preferences`

function validatePreferenceInput(input: JobPreferenceInput): void {
  if (!input.targetPosition.trim()) {
    throw new Error('请填写目标岗位')
  }
  if (!input.targetCity.trim()) {
    throw new Error('请填写目标城市')
  }
  if (input.salaryMin <= 0 || input.salaryMax <= 0) {
    throw new Error('请填写薪资范围')
  }
  if (input.salaryMin > input.salaryMax) {
    throw new Error('薪资下限不能高于上限')
  }
  const threshold = input.titleMatchThreshold ?? DEFAULT_TITLE_MATCH_THRESHOLD
  if (threshold < 0 || threshold > 100) {
    throw new Error('名称匹配阈值须在 0–100 之间')
  }
}

function serializeInput(input: JobPreferenceInput): unknown[] {
  const excludeOutsource = deriveExcludeOutsource(input.excludeKeywords)
  return [
    input.targetPosition.trim(),
    input.titleMatchThreshold ?? DEFAULT_TITLE_MATCH_THRESHOLD,
    input.targetCity.trim(),
    input.salaryMin,
    input.salaryMax,
    JSON.stringify(input.industries),
    JSON.stringify(input.companySizes),
    input.requireInsurance ? 1 : 0,
    input.requireWeekendOff ? 1 : 0,
    excludeOutsource ? 1 : 0,
    JSON.stringify(input.blacklistCompanies),
    JSON.stringify(input.excludeKeywords),
    JSON.stringify(input.responsibilityKeywords)
  ]
}

export function listPreferences(db: Database.Database = getDb()): JobPreference[] {
  const user = getOrCreateProfile(db)
  const rows = db.prepare(`${SELECT_FIELDS} WHERE user_id = ? ORDER BY updated_at DESC`).all(
    user.id
  ) as PreferenceRow[]
  return rows.map(mapRow)
}

export function getPreference(
  preferenceId: string,
  db: Database.Database = getDb()
): JobPreference | null {
  const user = getOrCreateProfile(db)
  const row = db
    .prepare(`${SELECT_FIELDS} WHERE id = ? AND user_id = ?`)
    .get(preferenceId, user.id) as PreferenceRow | undefined
  return row ? mapRow(row) : null
}

export function getPreferenceOrThrow(
  preferenceId: string,
  db: Database.Database = getDb()
): JobPreference {
  const preference = getPreference(preferenceId, db)
  if (!preference) {
    throw new Error('求职偏好不存在')
  }
  return preference
}

/** @deprecated 使用 listPreferences */
export function getPreferences(db: Database.Database = getDb()): JobPreference | null {
  return listPreferences(db)[0] ?? null
}

/** @deprecated 使用 listPreferences */
export function getPreferencesOrDefault(db: Database.Database = getDb()): JobPreference {
  const existing = listPreferences(db)[0]
  if (existing) return existing

  const user = getOrCreateProfile(db)
  const defaults = createDefaultPreferenceInput()
  return {
    id: '',
    userId: user.id,
    name: '',
    ...defaults,
    titleMatchThreshold: defaults.titleMatchThreshold ?? DEFAULT_TITLE_MATCH_THRESHOLD,
    excludeOutsource: deriveExcludeOutsource(defaults.excludeKeywords),
    createdAt: '',
    updatedAt: ''
  }
}

export function savePreference(
  input: JobPreferenceInput,
  db: Database.Database = getDb()
): JobPreference {
  validatePreferenceInput(input)
  const user = getOrCreateProfile(db)
  const name = buildPreferenceName(
    input.targetPosition,
    input.targetCity,
    input.salaryMin,
    input.salaryMax
  )
  const payload = serializeInput(input)

  if (input.id) {
    const existing = getPreference(input.id, db)
    if (!existing) {
      throw new Error('求职偏好不存在')
    }

    db.prepare(
      `UPDATE job_preferences SET
        name = ?, target_position = ?, title_match_threshold = ?, target_city = ?, salary_min = ?, salary_max = ?,
        industries = ?, company_sizes = ?, require_insurance = ?, require_weekend_off = ?,
        exclude_outsource = ?, blacklist_companies = ?, exclude_keywords = ?,
        responsibility_keywords = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ).run(name, ...payload, input.id, user.id)

    return getPreferenceOrThrow(input.id, db)
  }

  const id = randomUUID()
  db.prepare(
    `INSERT INTO job_preferences (
      id, user_id, name, target_position, title_match_threshold, target_city, salary_min, salary_max,
      industries, company_sizes, require_insurance, require_weekend_off,
      exclude_outsource, blacklist_companies, exclude_keywords, responsibility_keywords
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, user.id, name, ...payload)

  return getPreferenceOrThrow(id, db)
}

/** @deprecated 使用 savePreference */
export function savePreferences(
  input: JobPreferenceInput,
  db: Database.Database = getDb()
): JobPreference {
  return savePreference(input, db)
}

export function deletePreference(
  preferenceId: string,
  db: Database.Database = getDb()
): boolean {
  const user = getOrCreateProfile(db)
  const result = db
    .prepare('DELETE FROM job_preferences WHERE id = ? AND user_id = ?')
    .run(preferenceId, user.id)
  return result.changes > 0
}

export function parseTagInput(value: string): string[] {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
