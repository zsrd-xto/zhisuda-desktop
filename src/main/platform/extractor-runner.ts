import type { WebContents } from 'electron'
import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'
import { buildConditionsLabel } from '../../shared/types/preferences'
import { resolveBossCityCode } from './boss/boss-city-codes'
import { BOSS_JOBS_FETCH_LIMIT, BOSS_RATE_LIMIT } from './boss/boss-config'
import { getBossView, loadBossJobsSearchPage } from './boss/boss-adapter'
import {
  assertBossApiResponse,
  buildDetailUrl,
  buildListUrl,
  fetchJsonInBrowser,
  hasMorePages,
  parseDetailItem,
  parseListItems
} from './api-extractor'
import { rankJobs, passesFilter } from '../services/matching.service'
import { PlatformError } from './platform-error'
import {
  assertFetchCooldown,
  markFetchCompleted,
  waitForDetailInterval,
  waitForPageInterval
} from './rate-limiter'
import { compileDomListScript } from './script-compiler'
import type { PageRecipe } from './types'
import type { ExtractChannel, FetchJobsResult, JobDetail, PlatformErrorCode } from '../../shared/types/platform'
import { getActiveProfile, listActiveProfileVersions } from '../services/platform-profile.service'
import { assertDailyQuota, logExtractRun, saveFetchResult } from '../services/job-listing.service'

const BOSS_SEARCH_LIST_URL =
  'https://www.zhipin.com/wapi/zpgeek/search/joblist.json?page={page}&pageSize=15&city={city}&query={query}'

function asString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean)
  }
  if (typeof value === 'string' && value) {
    return [value]
  }
  return []
}

function mapListItem(raw: Record<string, unknown>): JobDetail {
  const id = asString(raw.id) || asString(raw.encryptJobId)
  return {
    id,
    title: asString(raw.title),
    salary: asString(raw.salary),
    city: asString(raw.city),
    jobUrl: asString(raw.jobUrl),
    companyName: asString(raw.companyName),
    companyScale: asString(raw.companyScale),
    benefits: asStringArray(raw.benefits),
    securityId: asString(raw.securityId),
    isOutsource: /外包|外派/i.test(`${raw.companyName} ${raw.title}`),
    raw
  }
}

function mergeDetail(base: JobDetail, detail: Record<string, unknown>): JobDetail {
  return {
    ...base,
    id: asString(detail.id) || base.id,
    title: asString(detail.title) || base.title,
    salary: asString(detail.salary) || base.salary,
    city: asString(detail.city) || base.city,
    jobUrl: asString(detail.jobUrl) || base.jobUrl,
    companyName: asString(detail.companyName) || base.companyName,
    responsibilities: asString(detail.responsibilities) || base.responsibilities,
    benefits: asStringArray(detail.benefits).length
      ? asStringArray(detail.benefits)
      : base.benefits,
    companyType: asString(detail.companyType) || base.companyType,
    companyScale: asString(detail.companyScale) || base.companyScale,
    registeredCapital: asString(detail.registeredCapital) || base.registeredCapital,
    raw: { ...(base.raw ?? {}), detail }
  }
}

function needsDetail(job: JobDetail): boolean {
  return !job.responsibilities || !job.companyScale
}

function buildListRecipeForCriteria(baseRecipe: PageRecipe, criteria: FetchCriteriaSnapshot): PageRecipe {
  const cityName = criteria.fetchCity || criteria.targetCity
  const cityCode = resolveBossCityCode(cityName)
  const query = criteria.fetchQuery || criteria.targetPosition
  const api = baseRecipe.api

  if (!api) {
    throw new PlatformError('列表 API 未配置', 'API_CHANGED')
  }

  return {
    ...baseRecipe,
    api: {
      ...api,
      listUrl: BOSS_SEARCH_LIST_URL,
      listJsonPath: api.listJsonPath ?? 'zpData.jobList',
      hasMorePath: api.hasMorePath ?? 'zpData.hasMore',
      queryParams: {
        city: cityCode,
        query
      }
    }
  }
}

async function fetchListViaApi(
  webContents: WebContents,
  recipe: PageRecipe,
  criteria: FetchCriteriaSnapshot
): Promise<JobDetail[]> {
  const api = recipe.api
  if (!api?.listUrl) {
    throw new PlatformError('列表 API 未配置', 'API_CHANGED')
  }

  const maxPages = Math.min(
    api.pagination?.maxPages ?? BOSS_RATE_LIMIT.maxListPagesPerRun,
    BOSS_RATE_LIMIT.maxListPagesPerRun
  )
  const startPage = api.pagination?.startPage ?? 1
  const jobs: JobDetail[] = []
  const seen = new Set<string>()

  const countMatching = (): number => jobs.filter((job) => passesFilter(job, criteria)).length

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const page = startPage + pageIndex
    if (pageIndex > 0) {
      await waitForPageInterval()
    }

    const url = buildListUrl(api, page)
    const response = await fetchJsonInBrowser(webContents, url, api.method ?? 'GET')
    const json = assertBossApiResponse(response)
    const items = parseListItems(json, api)

    if (items.length === 0) {
      break
    }

    for (const item of items) {
      const mapped = mapListItem(item)
      if (!mapped.id || seen.has(mapped.id)) continue
      seen.add(mapped.id)
      jobs.push(mapped)
      if (jobs.length >= BOSS_JOBS_FETCH_LIMIT * 2) break
    }

    if (countMatching() >= BOSS_JOBS_FETCH_LIMIT) {
      break
    }
    if (jobs.length >= BOSS_JOBS_FETCH_LIMIT * 2) {
      break
    }
    if (!hasMorePages(json, api)) {
      break
    }
  }

  return jobs
}

async function fetchDetailsViaApi(
  webContents: WebContents,
  recipe: PageRecipe,
  jobs: JobDetail[]
): Promise<{ jobs: JobDetail[]; partial: boolean }> {
  const api = recipe.api
  if (!api?.detailUrl) {
    return { jobs, partial: true }
  }

  let partial = false
  const limit = Math.min(BOSS_RATE_LIMIT.maxDetailsPerRun, jobs.length)
  const enriched: JobDetail[] = []

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    if (i < limit && needsDetail(job) && job.securityId) {
      if (enriched.length > 0) {
        await waitForDetailInterval()
      }

      try {
        const url = buildDetailUrl(api, {
          securityId: job.securityId,
          jobId: job.id,
          encryptJobId: job.id
        })
        const response = await fetchJsonInBrowser(webContents, url, api.method ?? 'GET')
        const json = assertBossApiResponse(response)
        const detail = parseDetailItem(json, api)
        enriched.push(mergeDetail(job, detail))
      } catch {
        partial = true
        enriched.push(job)
      }
    } else {
      if (i < limit && needsDetail(job) && !job.securityId) {
        partial = true
      }
      enriched.push(job)
    }
  }

  return { jobs: enriched, partial }
}

async function fetchListViaDom(
  webContents: WebContents,
  recipe: PageRecipe
): Promise<JobDetail[]> {
  const dom = recipe.dom
  if (!dom) {
    throw new PlatformError('DOM 配置缺失', 'DOM_CHANGED')
  }

  const domWithScroll = {
    ...dom,
    maxScrollRounds: dom.maxScrollRounds ?? BOSS_RATE_LIMIT.maxScrollRounds
  }
  const script = compileDomListScript(domWithScroll, BOSS_JOBS_FETCH_LIMIT * 2)
  const raw = (await webContents.executeJavaScript(script, true)) as Array<Record<string, unknown>>

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new PlatformError('DOM 选择器未匹配到职位卡片', 'DOM_CHANGED')
  }

  const jobs = raw.map((item) => mapListItem(item))
  return jobs
}

export async function runBossJobExtraction(
  criteria: FetchCriteriaSnapshot
): Promise<FetchJobsResult> {
  assertFetchCooldown()
  assertDailyQuota(1)

  const listProfile = getActiveProfile('boss', 'job_list')
  const detailProfile = getActiveProfile('boss', 'job_detail')

  if (!listProfile) {
    throw new PlatformError('未找到 Boss 列表页配置，请运行 import-profile', 'API_CHANGED')
  }

  const searchRecipe = buildListRecipeForCriteria(listProfile.recipe, criteria)
  const view = getBossView()
  const cityName = criteria.fetchCity || criteria.targetCity
  const query = criteria.fetchQuery || criteria.targetPosition
  await loadBossJobsSearchPage(cityName, query)
  const webContents = view.webContents

  let channel: ExtractChannel = 'api'
  let jobs: JobDetail[] = []
  let partial = false

  try {
    try {
      jobs = await fetchListViaApi(webContents, searchRecipe, criteria)
    } catch (apiError) {
      channel = 'dom'
      if (!listProfile.recipe.dom) {
        throw apiError
      }
      jobs = await fetchListViaDom(webContents, listProfile.recipe)
    }

    if (detailProfile?.recipe.api?.detailUrl) {
      channel = channel === 'dom' ? 'hybrid' : 'api'
      const detailResult = await fetchDetailsViaApi(webContents, detailProfile.recipe, jobs)
      jobs = detailResult.jobs
      partial = detailResult.partial
    }

    jobs = rankJobs(jobs, criteria)

    if (jobs.length === 0) {
      throw new PlatformError(
        `未找到符合「${buildConditionsLabel(criteria)}」的岗位，请调低名称匹配阈值或调整偏好后重试`,
        'NO_MATCHING_JOBS'
      )
    }

    const versions = listActiveProfileVersions('boss')
    const profileVersion = versions.job_list ?? listProfile.version
    const fetchedAt = new Date().toISOString()

    const batch = saveFetchResult({
      preferenceId: criteria.preferenceId,
      platform: 'boss',
      criteria,
      channel,
      profileVersion,
      jobs,
      fetchedAt
    })

    logExtractRun({
      profileId: listProfile.id,
      channel,
      status: partial ? 'partial' : 'success',
      jobCount: jobs.length
    })

    markFetchCompleted()

    return {
      platform: 'boss',
      jobs,
      fetchedAt,
      meta: {
        profileVersion,
        channel,
        partial: partial || undefined,
        batchId: batch.id,
        conditionsLabel: batch.conditionsLabel,
        preferenceId: criteria.preferenceId
      }
    }
  } catch (error) {
    const platformError =
      error instanceof PlatformError ? error : new PlatformError(
        error instanceof Error ? error.message : '抓取失败',
        'UNKNOWN'
      )

    logExtractRun({
      profileId: listProfile.id,
      channel,
      status: 'failed',
      errorCode: platformError.errorCode,
      jobCount: jobs.length
    })

    throw platformError
  }
}

export function mapPlatformErrorCodeToMessage(code: PlatformErrorCode): string {
  const messages: Record<PlatformErrorCode, string> = {
    NOT_LOGGED_IN: '请先登录 Boss 直聘',
    NOT_ON_JOBS_PAGE: '当前不在职位列表页',
    API_CHANGED: 'Boss 接口结构已变更，需更新页面配置',
    DOM_CHANGED: 'Boss 页面结构已变更，需更新选择器配置',
    NO_MATCHING_JOBS: '未找到符合筛选条件的岗位，请调低名称匹配阈值或放宽薪资/排除规则',
    SCROLL_EXHAUSTED: '滚动加载后仍无新职位',
    PARTIAL_DATA: '部分职位详情不完整',
    TIMEOUT: '页面加载超时，请稍后重试',
    RATE_LIMIT: '操作过于频繁，请稍后在 Boss 网页完成验证',
    DAILY_QUOTA_EXCEEDED: '今日岗位抓取已达上限，请明天再试',
    CAPTCHA: '需要完成验证码',
    NETWORK: '网络请求失败，请检查连接',
    UNKNOWN: '未知错误'
  }
  return messages[code] ?? messages.UNKNOWN
}
