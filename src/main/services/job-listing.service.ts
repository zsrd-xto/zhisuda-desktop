import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type {
  GetBatchJobsInput,
  JobBatchJobsResult,
  JobBatchListResult,
  JobFetchBatch,
  ListBatchesInput
} from '../../shared/types/jobs'
import {
  DAILY_JOB_LISTING_QUOTA,
  DEFAULT_JOB_PAGE_SIZE,
  JOB_BATCH_RETENTION_DAYS
} from '../../shared/types/jobs'
import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'
import { buildConditionsLabel } from '../../shared/types/preferences'
import type { ExtractChannel, JobDetail } from '../../shared/types/platform'
import { PlatformError } from '../platform/platform-error'
import { getDb } from '../db/database'
import { getOrCreateProfile } from './user.service'

interface BatchRow {
  id: string
  user_id: string
  preference_id: string | null
  platform: string
  conditions_json: string
  conditions_label: string
  fetched_at: string
  job_count: number
  channel: string | null
  profile_version: string | null
}

interface ListingRow {
  external_job_id: string
  title: string | null
  company_name: string | null
  salary: string | null
  city: string | null
  job_url: string | null
  detail_json: string | null
}

function mapBatchRow(row: BatchRow): JobFetchBatch {
  return {
    id: row.id,
    userId: row.user_id,
    preferenceId: row.preference_id,
    platform: row.platform,
    conditionsLabel: row.conditions_label,
    conditionsJson: JSON.parse(row.conditions_json) as Record<string, unknown>,
    fetchedAt: row.fetched_at,
    jobCount: row.job_count,
    channel: (row.channel as ExtractChannel | null) ?? null,
    profileVersion: row.profile_version
  }
}

function mapListingRow(row: ListingRow): JobDetail {
  if (row.detail_json) {
    try {
      return JSON.parse(row.detail_json) as JobDetail
    } catch {
      // fall through
    }
  }

  return {
    id: row.external_job_id,
    title: row.title ?? '',
    salary: row.salary ?? '',
    city: row.city ?? '',
    jobUrl: row.job_url ?? '',
    companyName: row.company_name ?? ''
  }
}

export function countTodayJobListings(db: Database.Database = getDb()): number {
  const user = getOrCreateProfile(db)
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM job_listings
       WHERE user_id = ? AND date(fetched_at) = date('now', 'localtime')`
    )
    .get(user.id) as { c: number }
  return row.c
}

export function assertDailyQuota(jobCount: number, db: Database.Database = getDb()): void {
  const todayCount = countTodayJobListings(db)
  if (todayCount + jobCount > DAILY_JOB_LISTING_QUOTA) {
    throw new PlatformError(
      `今日岗位抓取已达上限（${DAILY_JOB_LISTING_QUOTA} 条），请明天再试`,
      'DAILY_QUOTA_EXCEEDED'
    )
  }
}

export function cleanupExpiredBatches(db: Database.Database = getDb()): number {
  const user = getOrCreateProfile(db)
  const result = db
    .prepare(
      `DELETE FROM job_fetch_batches
       WHERE user_id = ?
         AND datetime(fetched_at) < datetime('now', '-' || ? || ' days', 'localtime')`
    )
    .run(user.id, JOB_BATCH_RETENTION_DAYS)
  return result.changes
}

export function createFetchBatch(
  input: {
    preferenceId: string
    platform: string
    criteria: FetchCriteriaSnapshot
    channel: ExtractChannel
    profileVersion: string
    jobCount: number
    fetchedAt: string
  },
  db: Database.Database = getDb()
): JobFetchBatch {
  const user = getOrCreateProfile(db)
  const batchId = randomUUID()
  const conditionsLabel = buildConditionsLabel(input.criteria)

  db.prepare(
    `INSERT INTO job_fetch_batches (
      id, user_id, preference_id, platform, conditions_json, conditions_label,
      fetched_at, job_count, channel, profile_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    batchId,
    user.id,
    input.preferenceId,
    input.platform,
    JSON.stringify(input.criteria),
    conditionsLabel,
    input.fetchedAt,
    input.jobCount,
    input.channel,
    input.profileVersion
  )

  const row = db
    .prepare('SELECT * FROM job_fetch_batches WHERE id = ?')
    .get(batchId) as BatchRow
  return mapBatchRow(row)
}

export function insertBatchJobs(
  batchId: string,
  jobs: JobDetail[],
  platform: string,
  profileVersion: string,
  fetchedAt: string,
  db: Database.Database = getDb()
): void {
  const user = getOrCreateProfile(db)
  const stmt = db.prepare(
    `INSERT INTO job_listings (
      id, batch_id, user_id, platform, external_job_id, title, company_name, salary, city,
      job_url, detail_json, fetched_at, profile_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(batch_id, external_job_id) DO UPDATE SET
      title = excluded.title,
      company_name = excluded.company_name,
      salary = excluded.salary,
      city = excluded.city,
      job_url = excluded.job_url,
      detail_json = excluded.detail_json,
      fetched_at = excluded.fetched_at,
      profile_version = excluded.profile_version`
  )

  const run = db.transaction(() => {
    for (const job of jobs) {
      stmt.run(
        randomUUID(),
        batchId,
        user.id,
        platform,
        job.id,
        job.title,
        job.companyName,
        job.salary,
        job.city,
        job.jobUrl,
        JSON.stringify(job),
        fetchedAt,
        profileVersion
      )
    }
  })

  run()
}

export function saveFetchResult(
  input: {
    preferenceId: string
    platform: string
    criteria: FetchCriteriaSnapshot
    channel: ExtractChannel
    profileVersion: string
    jobs: JobDetail[]
    fetchedAt: string
  },
  db: Database.Database = getDb()
): JobFetchBatch {
  cleanupExpiredBatches(db)
  assertDailyQuota(input.jobs.length, db)

  const batch = createFetchBatch(
    {
      preferenceId: input.preferenceId,
      platform: input.platform,
      criteria: input.criteria,
      channel: input.channel,
      profileVersion: input.profileVersion,
      jobCount: input.jobs.length,
      fetchedAt: input.fetchedAt
    },
    db
  )

  insertBatchJobs(
    batch.id,
    input.jobs,
    input.platform,
    input.profileVersion,
    input.fetchedAt,
    db
  )

  return batch
}

export function listFetchBatches(
  input: ListBatchesInput = {},
  db: Database.Database = getDb()
): JobBatchListResult {
  const user = getOrCreateProfile(db)
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.max(1, input.pageSize ?? DEFAULT_JOB_PAGE_SIZE)
  const offset = (page - 1) * pageSize

  const totalRow = db
    .prepare('SELECT COUNT(*) as c FROM job_fetch_batches WHERE user_id = ?')
    .get(user.id) as { c: number }

  const rows = db
    .prepare(
      `SELECT * FROM job_fetch_batches
       WHERE user_id = ?
       ORDER BY fetched_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(user.id, pageSize, offset) as BatchRow[]

  return {
    items: rows.map(mapBatchRow),
    total: totalRow.c,
    page,
    pageSize
  }
}

export function getLatestFetchBatch(db: Database.Database = getDb()): JobFetchBatch | null {
  const user = getOrCreateProfile(db)
  const row = db
    .prepare(
      `SELECT * FROM job_fetch_batches
       WHERE user_id = ?
       ORDER BY fetched_at DESC
       LIMIT 1`
    )
    .get(user.id) as BatchRow | undefined
  return row ? mapBatchRow(row) : null
}

export function getFetchBatch(
  batchId: string,
  db: Database.Database = getDb()
): JobFetchBatch | null {
  const user = getOrCreateProfile(db)
  const row = db
    .prepare('SELECT * FROM job_fetch_batches WHERE id = ? AND user_id = ?')
    .get(batchId, user.id) as BatchRow | undefined
  return row ? mapBatchRow(row) : null
}

export function getBatchJobs(
  input: GetBatchJobsInput,
  db: Database.Database = getDb()
): JobBatchJobsResult {
  const batch = getFetchBatch(input.batchId, db)
  if (!batch) {
    throw new Error('抓取批次不存在')
  }

  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.max(1, input.pageSize ?? DEFAULT_JOB_PAGE_SIZE)
  const offset = (page - 1) * pageSize

  const totalRow = db
    .prepare('SELECT COUNT(*) as c FROM job_listings WHERE batch_id = ?')
    .get(batch.id) as { c: number }

  const rows = db
    .prepare(
      `SELECT external_job_id, title, company_name, salary, city, job_url, detail_json
       FROM job_listings
       WHERE batch_id = ?
       ORDER BY rowid ASC
       LIMIT ? OFFSET ?`
    )
    .all(batch.id, pageSize, offset) as ListingRow[]

  return {
    batch,
    jobs: rows.map(mapListingRow),
    total: totalRow.c,
    page,
    pageSize
  }
}

/** @deprecated 使用 saveFetchResult */
export function upsertJobListings(): void {
  throw new Error('upsertJobListings 已废弃，请使用 saveFetchResult')
}

export function logExtractRun(
  input: {
    profileId: string | null
    channel: string
    status: string
    errorCode?: string | null
    jobCount: number
  },
  db: Database.Database = getDb()
): void {
  db.prepare(
    `INSERT INTO platform_extract_runs (id, profile_id, channel, status, error_code, job_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    input.profileId,
    input.channel,
    input.status,
    input.errorCode ?? null,
    input.jobCount
  )
}
