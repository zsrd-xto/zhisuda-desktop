import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'
import type { JobDetail, MatchBreakdown } from '../../shared/types/platform'

export interface ScoredJob extends JobDetail {
  matchScore: number
  matchBreakdown: MatchBreakdown
}

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

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function buildBigrams(text: string): Set<string> {
  const normalized = normalizeText(text)
  const bigrams = new Set<string>()
  if (normalized.length <= 1) {
    if (normalized) bigrams.add(normalized)
    return bigrams
  }
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.slice(i, i + 2))
  }
  return bigrams
}

/** 字符级 bigram Jaccard，结果 0–100 */
export function titleJaccardScore(jobTitle: string, targetPosition: string): number {
  const position = targetPosition.trim()
  if (!position) return 100

  const normJob = normalizeText(jobTitle)
  const normPos = normalizeText(position)
  if (normPos.length >= 2 && normJob.includes(normPos)) {
    return 100
  }

  const a = buildBigrams(jobTitle)
  const b = buildBigrams(position)
  if (a.size === 0 && b.size === 0) return 100
  if (a.size === 0 || b.size === 0) return 0

  let intersection = 0
  for (const gram of a) {
    if (b.has(gram)) intersection++
  }
  const union = a.size + b.size - intersection
  if (union === 0) return 0
  return Math.round((intersection / union) * 100)
}

function jobTextBlob(job: JobDetail): string {
  const benefits = job.benefits?.join(' ') ?? ''
  return `${job.title} ${job.companyName} ${benefits} ${job.responsibilities ?? ''}`
}

export function detectInsurance(text: string): boolean | null {
  if (/无五险|不交社保|无社保/.test(text)) return false
  if (/五险一金|五险|社保/.test(text)) return true
  return null
}

export function detectWeekendOff(text: string): boolean | null {
  if (/单休|大小周/.test(text)) return false
  if (/双休|周末双休|做五休二/.test(text)) return true
  return null
}

export function detectFoodHousing(text: string): boolean {
  return /包吃|包住|包吃住/.test(text)
}

/** 从 Boss 规模描述提取人数上限，如「100-499人」→ 499 */
export function parseCompanyScaleHeadcount(scaleText: string): number | null {
  const text = scaleText.trim()
  if (!text) return null

  const rangeMatch = text.match(/(\d+)\s*[-~～]\s*(\d+)\s*人/)
  if (rangeMatch) {
    return Number(rangeMatch[2])
  }

  const aboveMatch = text.match(/(\d+)\s*人\s*以上/)
  if (aboveMatch) {
    return Number(aboveMatch[1])
  }

  const singleMatch = text.match(/(\d+)\s*人/)
  if (singleMatch) {
    return Number(singleMatch[1])
  }

  return null
}

/** 注册资本转为万元 */
export function parseRegisteredCapitalWan(capitalText: string): number | null {
  const text = capitalText.trim()
  if (!text) return null

  const yiMatch = text.match(/([\d.]+)\s*亿/)
  if (yiMatch) {
    return Number(yiMatch[1]) * 10000
  }

  const wanMatch = text.match(/([\d.]+)\s*万/)
  if (wanMatch) {
    return Number(wanMatch[1])
  }

  return null
}

export function scoreCompanyScale(companyScale?: string): number {
  const headcount = parseCompanyScaleHeadcount(companyScale ?? '')
  if (headcount === null) return 0
  if (headcount < 20) return -10
  if (headcount < 100) return 10
  return 20
}

export function scoreRegisteredCapital(registeredCapital?: string): number {
  const wan = parseRegisteredCapitalWan(registeredCapital ?? '')
  if (wan === null) return 0
  if (wan < 10) return -10
  if (wan < 100) return 10
  return 20
}

export function scoreCompanyBenefits(job: JobDetail): number {
  const text = jobTextBlob(job)
  let score = 0

  if (detectInsurance(text) === true) score += 10
  if (detectWeekendOff(text) === true) score += 10
  if (detectFoodHousing(text)) score += 20

  return score
}

function normalizeKeywords(keywords: string[]): string[] {
  return keywords.map((token) => token.trim()).filter((token) => token.length >= 2)
}

/** 每命中一个岗位职责关键词 +10 分 */
export function scoreResponsibilityKeywords(job: JobDetail, keywords: string[]): number {
  const normalized = normalizeKeywords(keywords)
  if (normalized.length === 0) return 0

  const responsibilities = job.responsibilities ?? ''
  if (!responsibilities.trim()) return 0

  const lower = responsibilities.toLowerCase()
  const hits = normalized.filter((kw) => lower.includes(kw.toLowerCase())).length
  return hits * 10
}

export function passesSalaryMinFilter(jobSalary: string, salaryMin: number): boolean {
  const parsed = parseSalaryRangeK(jobSalary)
  if (!parsed) return false
  return parsed.min >= salaryMin
}

/** 筛选：仅通过/不通过，不参与打分 */
export function passesFilter(job: JobDetail, criteria: FetchCriteriaSnapshot): boolean {
  const fetchQuery = criteria.fetchQuery || criteria.targetPosition
  const threshold = criteria.titleMatchThreshold ?? 20

  if (titleJaccardScore(job.title, fetchQuery) < threshold) {
    return false
  }

  const salaryMin = criteria.fetchSalaryMin ?? criteria.salaryMin
  if (!passesSalaryMinFilter(job.salary, salaryMin)) {
    return false
  }

  const haystack = jobTextBlob(job).toLowerCase()

  if (
    criteria.blacklistCompanies.some(
      (company) => company && haystack.includes(company.toLowerCase())
    )
  ) {
    return false
  }

  if (
    criteria.excludeKeywords.some((keyword) => keyword && haystack.includes(keyword.toLowerCase()))
  ) {
    return false
  }

  return true
}

export function computeMatchBreakdown(
  job: JobDetail,
  criteria: FetchCriteriaSnapshot
): MatchBreakdown {
  const keyword = scoreResponsibilityKeywords(job, criteria.responsibilityKeywords)
  const companyScale = scoreCompanyScale(job.companyScale)
  const companyCapital = scoreRegisteredCapital(job.registeredCapital)
  const companyBenefits = scoreCompanyBenefits(job)
  const total = keyword + companyScale + companyCapital + companyBenefits

  return { keyword, companyScale, companyCapital, companyBenefits, total }
}

function enrichJobFlags(job: JobDetail): JobDetail {
  const text = jobTextBlob(job)
  return {
    ...job,
    isOutsource: job.isOutsource ?? /外包|外派/i.test(`${job.companyName} ${job.title}`),
    hasInsurance: job.hasInsurance ?? detectInsurance(text),
    hasWeekendOff: job.hasWeekendOff ?? detectWeekendOff(text)
  }
}

export function scoreJob(job: JobDetail, criteria: FetchCriteriaSnapshot): ScoredJob {
  const enriched = enrichJobFlags(job)
  const matchBreakdown = computeMatchBreakdown(enriched, criteria)
  return {
    ...enriched,
    matchScore: matchBreakdown.total,
    matchBreakdown
  }
}

export function rankJobs(jobs: JobDetail[], criteria: FetchCriteriaSnapshot): ScoredJob[] {
  return jobs
    .filter((job) => passesFilter(job, criteria))
    .map((job) => scoreJob(job, criteria))
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      return a.title.localeCompare(b.title, 'zh-CN')
    })
}

/** @deprecated 使用 passesFilter */
export function passesHardGate(job: JobDetail, criteria: FetchCriteriaSnapshot): boolean {
  return passesFilter(job, criteria)
}
