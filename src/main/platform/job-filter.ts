import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'

/** 解析 Boss 薪资描述为 K 为单位的区间 */
export function parseSalaryRangeK(salaryText: string): { min: number; max: number } | null {
  const text = salaryText.trim()
  if (!text) return null

  const rangeMatch = text.match(/(\d+)\s*[-~～至]\s*(\d+)\s*[Kk千]?/)
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) }
  }

  const aboveMatch = text.match(/(\d+)\s*[Kk千]?\s*以上/)
  if (aboveMatch) {
    const min = Number(aboveMatch[1])
    return { min, max: min + 50 }
  }

  const belowMatch = text.match(/(\d+)\s*[Kk千]?\s*以下/)
  if (belowMatch) {
    const max = Number(belowMatch[1])
    return { min: 0, max }
  }

  const singleMatch = text.match(/(\d+)\s*[Kk千]/)
  if (singleMatch) {
    const value = Number(singleMatch[1])
    return { min: value, max: value }
  }

  return null
}

function salaryOverlaps(
  jobSalary: string,
  prefMin: number,
  prefMax: number
): boolean {
  const parsed = parseSalaryRangeK(jobSalary)
  if (!parsed) return true
  return parsed.max >= prefMin && parsed.min <= prefMax
}

function cityMatches(jobCity: string, targetCity: string): boolean {
  const normalizedTarget = targetCity.trim().replace(/市$/, '')
  const normalizedJob = jobCity.trim()
  return normalizedJob.includes(normalizedTarget)
}

function titleMatches(jobTitle: string, targetPosition: string): boolean {
  const title = jobTitle.trim().toLowerCase()
  const position = targetPosition.trim().toLowerCase()
  if (!position) return true
  if (title.includes(position)) return true
  const tokens = position.split(/[\s/]+/).filter((t) => t.length >= 2)
  return tokens.some((token) => title.includes(token))
}

export function filterJobsByCriteria<T extends {
  title: string
  city: string
  salary: string
  companyName: string
  isOutsource?: boolean
}>(jobs: T[], criteria: FetchCriteriaSnapshot): T[] {
  return jobs.filter((job) => {
    if (!cityMatches(job.city, criteria.targetCity)) return false
    if (!titleMatches(job.title, criteria.targetPosition)) return false
    if (!salaryOverlaps(job.salary, criteria.salaryMin, criteria.salaryMax)) return false

    if (criteria.excludeOutsource && job.isOutsource) return false

    const haystack = `${job.title} ${job.companyName}`.toLowerCase()
    if (criteria.blacklistCompanies.some((c) => c && haystack.includes(c.toLowerCase()))) {
      return false
    }
    if (criteria.excludeKeywords.some((k) => k && haystack.includes(k.toLowerCase()))) {
      return false
    }

    return true
  })
}
