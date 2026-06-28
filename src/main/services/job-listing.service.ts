import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { JobDetail } from '../../shared/types/platform'
import { getDb } from '../db/database'
import { getOrCreateProfile } from './user.service'

export function upsertJobListings(
  jobs: JobDetail[],
  platform: string,
  profileVersion: string,
  db: Database.Database = getDb()
): void {
  const user = getOrCreateProfile(db)
  const stmt = db.prepare(
    `INSERT INTO job_listings (
      id, user_id, platform, external_job_id, title, company_name, salary, city,
      job_url, detail_json, fetched_at, profile_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(user_id, platform, external_job_id) DO UPDATE SET
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
        user.id,
        platform,
        job.id,
        job.title,
        job.companyName,
        job.salary,
        job.city,
        job.jobUrl,
        JSON.stringify(job),
        profileVersion
      )
    }
  })

  run()
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
