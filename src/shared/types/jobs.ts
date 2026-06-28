import type { ExtractChannel, JobDetail } from './platform'

export interface JobFetchBatch {
  id: string
  userId: string
  preferenceId: string | null
  platform: string
  conditionsLabel: string
  conditionsJson: Record<string, unknown>
  fetchedAt: string
  jobCount: number
  channel: ExtractChannel | null
  profileVersion: string | null
}

export interface JobBatchListResult {
  items: JobFetchBatch[]
  total: number
  page: number
  pageSize: number
}

export interface JobBatchJobsResult {
  batch: JobFetchBatch
  jobs: JobDetail[]
  total: number
  page: number
  pageSize: number
}

export interface ListBatchesInput {
  page?: number
  pageSize?: number
}

export interface GetBatchJobsInput {
  batchId: string
  page?: number
  pageSize?: number
}

export const DEFAULT_JOB_PAGE_SIZE = 20
export const JOB_BATCH_RETENTION_DAYS = 7
export const DAILY_JOB_LISTING_QUOTA = 500
