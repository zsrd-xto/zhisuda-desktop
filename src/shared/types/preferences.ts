export interface JobPreferences {
  id: string
  userId: string
  targetPositions: string[]
  targetCities: string[]
  salaryMin: number | null
  salaryMax: number | null
  industries: string[]
  companySizes: string[]
  requireInsurance: boolean
  requireWeekendOff: boolean
  excludeOutsource: boolean
  blacklistCompanies: string[]
  excludeKeywords: string[]
  updatedAt: string
}

export interface JobPreferencesInput {
  targetPositions: string[]
  targetCities: string[]
  salaryMin: number | null
  salaryMax: number | null
  industries: string[]
  companySizes: string[]
  requireInsurance: boolean
  requireWeekendOff: boolean
  excludeOutsource: boolean
  blacklistCompanies: string[]
  excludeKeywords: string[]
}

export function createDefaultPreferencesInput(): JobPreferencesInput {
  return {
    targetPositions: [],
    targetCities: [],
    salaryMin: null,
    salaryMax: null,
    industries: [],
    companySizes: [],
    requireInsurance: true,
    requireWeekendOff: false,
    excludeOutsource: false,
    blacklistCompanies: [],
    excludeKeywords: []
  }
}
