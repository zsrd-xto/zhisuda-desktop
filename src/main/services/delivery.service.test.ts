import { randomUUID } from 'crypto'
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database'
import { runMigrations } from '../db/migrate'
import {
  getDeliveredJobIds,
  getDeliveryRecords,
  getDeliveryStats,
  listStarredJobIds,
  resumeDeliveryQueue,
  toggleStarredJob
} from './delivery.service'
import { getOrCreateProfile } from './user.service'

describe('delivery.service', () => {
  it('persists delivery records and stats', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)
    const user = getOrCreateProfile(db)

    db.prepare(
      `INSERT INTO delivery_records (
        id, user_id, platform, batch_id, external_job_id, job_title, company_name,
        salary_range, job_url, match_score, status, sent_at
      ) VALUES (?, ?, 'boss', NULL, 'job-1', 'Java工程师', '示例科技', '20-25K', 'https://example.com', 30, 'sent', datetime('now'))`
    ).run(randomUUID(), user.id)

    db.prepare(
      `INSERT INTO delivery_records (
        id, user_id, platform, batch_id, external_job_id, job_title, company_name,
        salary_range, job_url, match_score, status, error_message, sent_at
      ) VALUES (?, ?, 'boss', NULL, 'job-2', '前端工程师', '失败公司', '15-20K', 'https://example.com/2', 10, 'failed', '限流', NULL)`
    ).run(randomUUID(), user.id)

    const records = getDeliveryRecords({ page: 1, pageSize: 10 }, db)
    expect(records.total).toBe(2)
    expect(records.items[0].status).toBe('failed')

    const stats = getDeliveryStats(db)
    expect(stats.totalSent).toBe(1)
    expect(stats.todaySent).toBe(1)
    expect(stats.last7Days).toHaveLength(7)

    const delivered = getDeliveredJobIds('boss', db)
    expect(delivered).toEqual(['job-1'])

    db.close()
  })

  it('toggles starred jobs', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)

    const starred = toggleStarredJob({ externalJobId: 'job-star', starred: true }, db)
    expect(starred).toEqual(['job-star'])
    expect(listStarredJobIds('boss', db)).toEqual(['job-star'])

    const cleared = toggleStarredJob({ externalJobId: 'job-star', starred: false }, db)
    expect(cleared).toEqual([])

    db.close()
  })

  it('resumeDeliveryQueue returns false when idle', () => {
    expect(resumeDeliveryQueue()).toBe(false)
  })
})
