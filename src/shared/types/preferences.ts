import type { FetchSearchOverrides } from './platform'

export const DEFAULT_TITLE_MATCH_THRESHOLD = 20

/** 排除关键词快捷选项 */
export const PRESET_EXCLUDE_KEYWORDS = ['外包', '驻场', '单休', '大小周', '销售'] as const

export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function joinCommaSeparatedList(items: string[]): string {
  return items.join('，')
}

export function deriveExcludeOutsource(excludeKeywords: string[]): boolean {
  return excludeKeywords.some((keyword) => /外包|外派/.test(keyword))
}

/** 编辑表单时合并历史 excludeOutsource 标记到排除关键词 */
export function normalizeExcludeKeywordsForForm(
  excludeKeywords: string[],
  excludeOutsource: boolean
): string[] {
  const keywords = [...excludeKeywords]
  if (excludeOutsource && !keywords.some((keyword) => /外包|外派/.test(keyword))) {
    keywords.push('外包')
  }
  return keywords
}

export interface JobPreference {
  id: string
  userId: string
  name: string
  targetPosition: string
  titleMatchThreshold: number
  targetCity: string
  salaryMin: number
  salaryMax: number
  industries: string[]
  companySizes: string[]
  requireInsurance: boolean
  requireWeekendOff: boolean
  excludeOutsource: boolean
  blacklistCompanies: string[]
  excludeKeywords: string[]
  responsibilityKeywords: string[]
  createdAt: string
  updatedAt: string
}

export interface JobPreferenceInput {
  id?: string
  targetPosition: string
  titleMatchThreshold?: number
  targetCity: string
  salaryMin: number
  salaryMax: number
  industries: string[]
  companySizes: string[]
  requireInsurance: boolean
  requireWeekendOff: boolean
  blacklistCompanies: string[]
  excludeKeywords: string[]
  responsibilityKeywords: string[]
}

/** @deprecated 使用 JobPreference */
export type JobPreferences = JobPreference

/** @deprecated 使用 JobPreferenceInput */
export type JobPreferencesInput = JobPreferenceInput

export function buildPreferenceName(
  targetPosition: string,
  targetCity: string,
  salaryMin: number,
  salaryMax: number
): string {
  return `${targetPosition.trim()}·${targetCity.trim()}·${salaryMin}-${salaryMax}K`
}

export function createDefaultPreferenceInput(): JobPreferenceInput {
  return {
    targetPosition: '',
    titleMatchThreshold: DEFAULT_TITLE_MATCH_THRESHOLD,
    targetCity: '',
    salaryMin: 0,
    salaryMax: 0,
    industries: [],
    companySizes: [],
    requireInsurance: true,
    requireWeekendOff: false,
    blacklistCompanies: [],
    excludeKeywords: [],
    responsibilityKeywords: []
  }
}

/** @deprecated 使用 createDefaultPreferenceInput */
export function createDefaultPreferencesInput(): JobPreferenceInput {
  return createDefaultPreferenceInput()
}

export interface FetchCriteriaSnapshot {
  preferenceId: string
  name: string
  targetPosition: string
  titleMatchThreshold: number
  targetCity: string
  salaryMin: number
  salaryMax: number
  fetchQuery: string
  fetchCity: string
  fetchSalaryMin: number
  industries: string[]
  companySizes: string[]
  requireInsurance: boolean
  requireWeekendOff: boolean
  excludeOutsource: boolean
  blacklistCompanies: string[]
  excludeKeywords: string[]
  responsibilityKeywords: string[]
}

export function applyFetchSearchOverrides(
  criteria: FetchCriteriaSnapshot,
  overrides?: FetchSearchOverrides
): FetchCriteriaSnapshot {
  if (!overrides) return criteria
  return {
    ...criteria,
    fetchQuery: overrides.query.trim() || criteria.targetPosition,
    fetchCity: overrides.city.trim() || criteria.targetCity,
    fetchSalaryMin: overrides.salaryMin > 0 ? overrides.salaryMin : criteria.salaryMin
  }
}

export function preferenceToFetchCriteria(preference: JobPreference): FetchCriteriaSnapshot {
  return {
    preferenceId: preference.id,
    name: preference.name,
    targetPosition: preference.targetPosition,
    titleMatchThreshold: preference.titleMatchThreshold,
    targetCity: preference.targetCity,
    salaryMin: preference.salaryMin,
    salaryMax: preference.salaryMax,
    fetchQuery: preference.targetPosition,
    fetchCity: preference.targetCity,
    fetchSalaryMin: preference.salaryMin,
    industries: preference.industries,
    companySizes: preference.companySizes,
    requireInsurance: preference.requireInsurance,
    requireWeekendOff: preference.requireWeekendOff,
    excludeOutsource: deriveExcludeOutsource(preference.excludeKeywords),
    blacklistCompanies: preference.blacklistCompanies,
    excludeKeywords: preference.excludeKeywords,
    responsibilityKeywords: preference.responsibilityKeywords
  }
}

export function buildConditionsLabel(criteria: FetchCriteriaSnapshot): string {
  const query = criteria.fetchQuery || criteria.targetPosition
  const city = criteria.fetchCity || criteria.targetCity
  const salaryMin = criteria.fetchSalaryMin ?? criteria.salaryMin
  return `${query} · ${city} · ${salaryMin}K+`
}
