import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type {
  ApplyBatchInput,
  ApplyBatchJobResult,
  ApplyBatchResult,
  DeliveryProgressEvent,
  DeliveryRecord,
  DeliveryRecordsResult,
  DeliveryRecordStatus,
  DeliveryStats,
  GetDeliveryRecordsInput,
  ToggleStarInput
} from '../../shared/types/delivery'
import type { PlatformErrorCode } from '../../shared/types/platform'
import { DEFAULT_BOSS_VIEW_HEIGHT } from '../../shared/types/platform'
import { BOSS_DELIVERY_LIMIT } from '../platform/boss/boss-config'
import { applyBossJob } from '../platform/boss/boss-apply'
import { checkBossLoginByCookies } from '../platform/boss/boss-adapter'
import { PlatformError } from '../platform/platform-error'
import { waitForApplyInterval } from '../platform/rate-limiter'
import { getDb } from '../db/database'
import { getBatchJobsByExternalIds } from './job-listing.service'
import { getPlatformLoginStatus } from './platform-account.service'
import { attachBossView, setBossViewLayout } from './platform.service'
import { getOrCreateProfile } from './user.service'

const MANUAL_TAKEOVER_CODES: PlatformErrorCode[] = ['RATE_LIMIT', 'CAPTCHA', 'DOM_CHANGED']

interface DeliveryRow {
  id: string
  user_id: string
  task_id: string | null
  platform: string
  batch_id: string | null
  external_job_id: string
  job_title: string | null
  company_name: string | null
  salary_range: string | null
  job_url: string | null
  match_score: number | null
  status: string
  error_code: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
}

let resumeWaiter: (() => void) | null = null

function mapDeliveryRow(row: DeliveryRow): DeliveryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    platform: row.platform,
    batchId: row.batch_id,
    externalJobId: row.external_job_id,
    jobTitle: row.job_title,
    companyName: row.company_name,
    salaryRange: row.salary_range,
    jobUrl: row.job_url,
    matchScore: row.match_score,
    status: row.status as DeliveryRecordStatus,
    errorCode: (row.error_code as PlatformErrorCode | null) ?? null,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    createdAt: row.created_at
  }
}

function hasSuccessfulDelivery(
  userId: string,
  platform: string,
  externalJobId: string,
  db: Database.Database
): boolean {
  const row = db
    .prepare(
      `SELECT id FROM delivery_records
       WHERE user_id = ? AND platform = ? AND external_job_id = ? AND status = 'sent'
       LIMIT 1`
    )
    .get(userId, platform, externalJobId) as { id: string } | undefined
  return Boolean(row)
}

function insertDeliveryRecord(
  input: {
    platform: string
    batchId: string
    externalJobId: string
    jobTitle: string
    companyName: string
    salaryRange: string
    jobUrl: string
    matchScore: number | null
    status: DeliveryRecordStatus
    errorCode?: PlatformErrorCode | null
    errorMessage?: string | null
    sentAt?: string | null
  },
  db: Database.Database
): DeliveryRecord {
  const user = getOrCreateProfile(db)
  const id = randomUUID()
  const sentAt = input.sentAt ?? (input.status === 'sent' ? new Date().toISOString() : null)

  db.prepare(
    `INSERT INTO delivery_records (
      id, user_id, platform, batch_id, external_job_id, job_title, company_name,
      salary_range, job_url, match_score, status, error_code, error_message, sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    user.id,
    input.platform,
    input.batchId,
    input.externalJobId,
    input.jobTitle,
    input.companyName,
    input.salaryRange,
    input.jobUrl,
    input.matchScore,
    input.status,
    input.errorCode ?? null,
    input.errorMessage ?? null,
    sentAt
  )

  const row = db.prepare('SELECT * FROM delivery_records WHERE id = ?').get(id) as DeliveryRow
  return mapDeliveryRow(row)
}

export function resumeDeliveryQueue(): boolean {
  if (!resumeWaiter) {
    return false
  }
  resumeWaiter()
  resumeWaiter = null
  return true
}

function waitForManualResume(): Promise<void> {
  return new Promise((resolve) => {
    resumeWaiter = resolve
  })
}

export async function applyDeliveryBatch(
  input: ApplyBatchInput,
  emit: (event: DeliveryProgressEvent) => void
): Promise<ApplyBatchResult> {
  if (!input.batchId) {
    throw new Error('请指定抓取批次')
  }
  if (!input.jobIds.length) {
    throw new Error('请至少勾选一个岗位')
  }
  if (input.jobIds.length > BOSS_DELIVERY_LIMIT.maxPerBatch) {
    throw new Error(`单次最多投递 ${BOSS_DELIVERY_LIMIT.maxPerBatch} 个岗位`)
  }

  const dbLoggedIn = getPlatformLoginStatus('boss').loggedIn
  const cookieLoggedIn = await checkBossLoginByCookies()
  if (!dbLoggedIn && !cookieLoggedIn) {
    throw new PlatformError('请先登录 Boss 直聘', 'NOT_LOGGED_IN')
  }

  const jobs = getBatchJobsByExternalIds(input.batchId, input.jobIds)
  if (jobs.length === 0) {
    throw new Error('未找到所选岗位，请重新抓取后重试')
  }

  setBossViewLayout({ expanded: true, height: DEFAULT_BOSS_VIEW_HEIGHT })
  attachBossView()

  const user = getOrCreateProfile()
  const results: ApplyBatchJobResult[] = []
  let successCount = 0
  let failedCount = 0
  let paused = false

  for (let index = 0; index < jobs.length; index++) {
    const job = jobs[index]
    const current = index + 1
    const total = jobs.length

    emit({
      type: 'progress',
      current,
      total,
      externalJobId: job.id,
      jobTitle: job.title,
      status: 'applying'
    })

    if (hasSuccessfulDelivery(user.id, 'boss', job.id, getDb())) {
      results.push({
        externalJobId: job.id,
        jobTitle: job.title,
        success: true,
        status: 'sent',
        errorMessage: '该岗位已投递过，已跳过'
      })
      successCount++
      continue
    }

    const applyResult = await applyBossJob(job)

    if (applyResult.success) {
      insertDeliveryRecord(
        {
          platform: 'boss',
          batchId: input.batchId,
          externalJobId: job.id,
          jobTitle: job.title,
          companyName: job.companyName,
          salaryRange: job.salary,
          jobUrl: job.jobUrl,
          matchScore: job.matchScore ?? null,
          status: 'sent',
          sentAt: new Date().toISOString()
        },
        getDb()
      )
      results.push({
        externalJobId: job.id,
        jobTitle: job.title,
        success: true,
        status: 'sent'
      })
      successCount++
    } else {
      const errorCode = applyResult.errorCode ?? 'UNKNOWN'
      insertDeliveryRecord(
        {
          platform: 'boss',
          batchId: input.batchId,
          externalJobId: job.id,
          jobTitle: job.title,
          companyName: job.companyName,
          salaryRange: job.salary,
          jobUrl: job.jobUrl,
          matchScore: job.matchScore ?? null,
          status: 'failed',
          errorCode,
          errorMessage: applyResult.message ?? '投递失败'
        },
        getDb()
      )
      results.push({
        externalJobId: job.id,
        jobTitle: job.title,
        success: false,
        status: 'failed',
        errorCode,
        errorMessage: applyResult.message
      })
      failedCount++

      if (MANUAL_TAKEOVER_CODES.includes(errorCode)) {
        paused = true
        emit({
          type: 'paused',
          current,
          total,
          externalJobId: job.id,
          jobTitle: job.title,
          errorCode,
          message: applyResult.message ?? '请在底部 Boss 面板中手动完成操作'
        })
        await waitForManualResume()
        paused = false
      }
    }

    if (index < jobs.length - 1) {
      await waitForApplyInterval()
    }
  }

  emit({
    type: 'completed',
    total: jobs.length,
    successCount,
    failedCount,
    paused: false
  })

  return {
    total: jobs.length,
    successCount,
    failedCount,
    paused,
    results
  }
}

export function getDeliveryRecords(
  input: GetDeliveryRecordsInput = {},
  db: Database.Database = getDb()
): DeliveryRecordsResult {
  const user = getOrCreateProfile(db)
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.max(1, input.pageSize ?? 20)
  const offset = (page - 1) * pageSize

  const filters = ['user_id = ?']
  const params: unknown[] = [user.id]

  if (input.status) {
    filters.push('status = ?')
    params.push(input.status)
  }

  const where = filters.join(' AND ')
  const totalRow = db
    .prepare(`SELECT COUNT(*) as c FROM delivery_records WHERE ${where}`)
    .get(...params) as { c: number }

  const rows = db
    .prepare(
      `SELECT * FROM delivery_records
       WHERE ${where}
       ORDER BY COALESCE(sent_at, created_at) DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as DeliveryRow[]

  return {
    items: rows.map(mapDeliveryRow),
    total: totalRow.c,
    page,
    pageSize
  }
}

export function getDeliveryStats(db: Database.Database = getDb()): DeliveryStats {
  const user = getOrCreateProfile(db)

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as c FROM delivery_records
       WHERE user_id = ? AND status = 'sent'`
    )
    .get(user.id) as { c: number }

  const todayRow = db
    .prepare(
      `SELECT COUNT(*) as c FROM delivery_records
       WHERE user_id = ? AND status = 'sent'
         AND date(sent_at) = date('now', 'localtime')`
    )
    .get(user.id) as { c: number }

  const trendRows = db
    .prepare(
      `SELECT date(sent_at) as day, COUNT(*) as count
       FROM delivery_records
       WHERE user_id = ? AND status = 'sent'
         AND sent_at IS NOT NULL
         AND date(sent_at) >= date('now', '-6 days', 'localtime')
       GROUP BY date(sent_at)
       ORDER BY day ASC`
    )
    .all(user.id) as Array<{ day: string; count: number }>

  const last7Days: Array<{ date: string; count: number }> = []
  for (let offset = 6; offset >= 0; offset--) {
    const dayRow = db
      .prepare(`SELECT date('now', '-' || ? || ' days', 'localtime') as day`)
      .get(offset) as { day: string }
    const matched = trendRows.find((row) => row.day === dayRow.day)
    last7Days.push({ date: dayRow.day, count: matched?.count ?? 0 })
  }

  return {
    totalSent: totalRow.c,
    todaySent: todayRow.c,
    last7Days
  }
}

export function listStarredJobIds(
  platform = 'boss',
  db: Database.Database = getDb()
): string[] {
  const user = getOrCreateProfile(db)
  const rows = db
    .prepare(
      `SELECT external_job_id FROM job_starred
       WHERE user_id = ? AND platform = ?`
    )
    .all(user.id, platform) as Array<{ external_job_id: string }>
  return rows.map((row) => row.external_job_id)
}

export function toggleStarredJob(
  input: ToggleStarInput,
  db: Database.Database = getDb()
): string[] {
  const user = getOrCreateProfile(db)
  const platform = input.platform ?? 'boss'

  if (input.starred) {
    db.prepare(
      `INSERT OR IGNORE INTO job_starred (user_id, platform, external_job_id)
       VALUES (?, ?, ?)`
    ).run(user.id, platform, input.externalJobId)
  } else {
    db.prepare(
      `DELETE FROM job_starred
       WHERE user_id = ? AND platform = ? AND external_job_id = ?`
    ).run(user.id, platform, input.externalJobId)
  }

  return listStarredJobIds(platform, db)
}

export function getDeliveredJobIds(
  platform = 'boss',
  db: Database.Database = getDb()
): string[] {
  const user = getOrCreateProfile(db)
  const rows = db
    .prepare(
      `SELECT external_job_id FROM delivery_records
       WHERE user_id = ? AND platform = ? AND status = 'sent'`
    )
    .all(user.id, platform) as Array<{ external_job_id: string }>
  return rows.map((row) => row.external_job_id)
}
