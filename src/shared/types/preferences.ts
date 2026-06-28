export interface JobPreference {
  id: string
  userId: string
  name: string
  targetPosition: string
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
  createdAt: string
  updatedAt: string
}

export interface JobPreferenceInput {
  id?: string
  targetPosition: string
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
    targetCity: '',
    salaryMin: 0,
    salaryMax: 0,
    industries: [],
    companySizes: [],
    requireInsurance: true,
    requireWeekendOff: false,
    excludeOutsource: false,
    blacklistCompanies: [],
    excludeKeywords: []
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
}

export function preferenceToFetchCriteria(preference: JobPreference): FetchCriteriaSnapshot {
  return {
    preferenceId: preference.id,
    name: preference.name,
    targetPosition: preference.targetPosition,
    targetCity: preference.targetCity,
    salaryMin: preference.salaryMin,
    salaryMax: preference.salaryMax,
    industries: preference.industries,
    companySizes: preference.companySizes,
    requireInsurance: preference.requireInsurance,
    requireWeekendOff: preference.requireWeekendOff,
    excludeOutsource: preference.excludeOutsource,
    blacklistCompanies: preference.blacklistCompanies,
    excludeKeywords: preference.excludeKeywords
  }
}

export function buildConditionsLabel(criteria: FetchCriteriaSnapshot): string {
  return `${criteria.targetPosition} · ${criteria.targetCity} · ${criteria.salaryMin}-${criteria.salaryMax}K`
}
