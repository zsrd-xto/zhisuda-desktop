import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'
import { DAILY_JOB_LISTING_QUOTA } from '../../shared/types/jobs'
import type { JobDetail } from '../../shared/types/platform'
import { openDatabase } from '../db/database'
import { getOrCreateProfile } from './user.service'
import {
  assertDailyQuota,
  cleanupExpiredBatches,
  countTodayJobListings,
  getBatchJobs,
  getLatestFetchBatch,
  listFetchBatches,
  saveFetchResult
} from './job-listing.service'
import { savePreference } from './preferences.service'
import { PlatformError } from '../platform/platform-error'

function createTestDb(): Database.Database {
  return openDatabase(':memory:')
}

const sampleJob: JobDetail = {
  id: 'job-1',
  title: 'AI应用开发',
  salary: '20-25K',
  city: '深圳',
  jobUrl: 'https://example.com/job/1',
  companyName: '测试公司'
}

const criteria: FetchCriteriaSnapshot = {
  preferenceId: 'pref-1',
  name: 'AI应用开发·深圳·20-25K',
  targetPosition: 'AI应用开发',
  titleMatchThreshold: 20,
  targetCity: '深圳',
  salaryMin: 20,
  salaryMax: 25,
  fetchQuery: 'AI应用开发',
  fetchCity: '深圳',
  fetchSalaryMin: 20,
  industries: [],
  companySizes: [],
  requireInsurance: true,
  requireWeekendOff: false,
  excludeOutsource: false,
  blacklistCompanies: [],
  excludeKeywords: [],
  responsibilityKeywords: []
}

describe('job-listing.service', () => {
  let db: Database.Database | null = null

  afterEach(() => {
    db?.close()
    db = null
  })

  it('saves batch and paginates jobs', () => {
    db = createTestDb()
    getOrCreateProfile(db)
    const preference = savePreference(
      {
        targetPosition: 'AI应用开发',
        targetCity: '深圳',
        salaryMin: 20,
        salaryMax: 25,
        industries: [],
        companySizes: [],
        requireInsurance: true,
        requireWeekendOff: false,
        blacklistCompanies: [],
        excludeKeywords: [],
        responsibilityKeywords: []
      },
      db
    )

    const batch = saveFetchResult(
      {
        preferenceId: preference.id,
        platform: 'boss',
        criteria: { ...criteria, preferenceId: preference.id },
        channel: 'api',
        profileVersion: 'test',
        jobs: [sampleJob],
        fetchedAt: new Date().toISOString()
      },
      db
    )

    expect(batch.jobCount).toBe(1)
    expect(getLatestFetchBatch(db)?.id).toBe(batch.id)

    const page = getBatchJobs({ batchId: batch.id, page: 1, pageSize: 20 }, db)
    expect(page.total).toBe(1)
    expect(page.jobs[0].title).toBe('AI应用开发')

    const batches = listFetchBatches({ page: 1, pageSize: 10 }, db)
    expect(batches.total).toBe(1)
  })

  it('rejects when daily quota exceeded', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    db.prepare(
      `INSERT INTO job_fetch_batches (
        id, user_id, preference_id, platform, conditions_json, conditions_label,
        fetched_at, job_count, channel, profile_version
      ) VALUES ('b1', (SELECT id FROM users LIMIT 1), NULL, 'boss', '{}', 'test', datetime('now'), 0, 'api', 'v1')`
    ).run()

    const userId = getOrCreateProfile(db).id
    const stmt = db.prepare(
      `INSERT INTO job_listings (
        id, batch_id, user_id, platform, external_job_id, title, fetched_at
      ) VALUES (?, 'b1', ?, 'boss', ?, 't', datetime('now'))`
    )

    for (let i = 0; i < DAILY_JOB_LISTING_QUOTA; i++) {
      stmt.run(`id-${i}`, userId, `job-${i}`)
    }

    expect(countTodayJobListings(db)).toBe(DAILY_JOB_LISTING_QUOTA)
    expect(() => assertDailyQuota(1, db!)).toThrow(PlatformError)
  })

  it('cleans batches older than retention window', () => {
    db = createTestDb()
    getOrCreateProfile(db)

    db.prepare(
      `INSERT INTO job_fetch_batches (
        id, user_id, preference_id, platform, conditions_json, conditions_label,
        fetched_at, job_count, channel, profile_version
      ) VALUES ('old', (SELECT id FROM users LIMIT 1), NULL, 'boss', '{}', 'old', datetime('now', '-10 days'), 0, 'api', 'v1')`
    ).run()

    const removed = cleanupExpiredBatches(db)
    expect(removed).toBe(1)
    expect(listFetchBatches({}, db).total).toBe(0)
  })
})
