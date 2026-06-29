export interface JobListing {
  id: string
  title: string
  company: string
  salary: string
  city: string
  url: string
  description?: string
  isOutsource?: boolean
}

export interface MatchBreakdown {
  keyword: number
  companyScale: number
  companyCapital: number
  companyBenefits: number
  total: number
}

export interface FetchSearchOverrides {
  query: string
  city: string
  salaryMin: number
}

export interface JobDetail {
  id: string
  title: string
  salary: string
  city: string
  jobUrl: string
  companyName: string
  responsibilities?: string
  benefits?: string[]
  companyType?: string
  companyScale?: string
  registeredCapital?: string
  isOutsource?: boolean
  hasInsurance?: boolean | null
  hasWeekendOff?: boolean | null
  matchScore?: number
  matchBreakdown?: MatchBreakdown
  securityId?: string
  raw?: Record<string, unknown>
}

/** @deprecated 使用 JobDetail.companyName */
export function jobDetailToListing(job: JobDetail): JobListing {
  return {
    id: job.id,
    title: job.title,
    company: job.companyName,
    salary: job.salary,
    city: job.city,
    url: job.jobUrl,
    description: job.responsibilities,
    isOutsource: job.isOutsource
  }
}

export interface BossViewLayout {
  expanded: boolean
  height: number
}

export const DEFAULT_BOSS_VIEW_HEIGHT = 420

export type PlatformId = 'boss'

export type PlatformErrorCode =
  | 'NOT_LOGGED_IN'
  | 'NOT_ON_JOBS_PAGE'
  | 'API_CHANGED'
  | 'DOM_CHANGED'
  | 'SCROLL_EXHAUSTED'
  | 'PARTIAL_DATA'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'DAILY_QUOTA_EXCEEDED'
  | 'CAPTCHA'
  | 'NETWORK'
  | 'UNKNOWN'

export type ApplyErrorCode = PlatformErrorCode

export type ExtractChannel = 'api' | 'dom' | 'hybrid'

export interface ApplyResult {
  success: boolean
  errorCode?: PlatformErrorCode
  message?: string
}

export interface PlatformLoginStatus {
  platform: PlatformId
  loggedIn: boolean
  lastLoginAt: string | null
}

export interface FetchJobsMeta {
  profileVersion: string
  channel: ExtractChannel
  partial?: boolean
  errorCode?: PlatformErrorCode
  batchId?: string
  conditionsLabel?: string
  preferenceId?: string
}

export interface FetchJobsResult {
  platform: PlatformId
  jobs: JobDetail[]
  fetchedAt: string
  meta: FetchJobsMeta
}

export interface PlatformIpcError {
  message: string
  errorCode: PlatformErrorCode
}

export interface BossDomApiProbe {
  path: string
  httpStatus?: number
  code?: number
  message?: string
  listLength?: number
  firstItemKeys?: string[]
  sampleFirstItem?: Record<string, unknown> | null
  hasMore?: boolean
  error?: string
}

export interface BossDomSnapshotResult {
  capturedAt: string
  url: string
  title: string
  domProbe: Record<string, number>
  vueProbe: { found: boolean; jobListLength: number }
  sampleLinks: string[]
  apiProbes: BossDomApiProbe[]
  detailProbe: Record<string, unknown> | null
  filePath: string
}
