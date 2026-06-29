import type { PlatformErrorCode } from './platform'

/** 投递状态机（MVP 子集） */
export type DeliveryRecordStatus =
  | 'pending'
  | 'applying'
  | 'sent'
  | 'failed'
  | 'viewed'
  | 'replied'
  | 'interview'

export interface DeliveryRecord {
  id: string
  userId: string
  taskId: string | null
  platform: string
  batchId: string | null
  externalJobId: string
  jobTitle: string | null
  companyName: string | null
  salaryRange: string | null
  jobUrl: string | null
  matchScore: number | null
  status: DeliveryRecordStatus
  errorCode: PlatformErrorCode | null
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
}

export interface ApplyBatchInput {
  batchId: string
  jobIds: string[]
  preferenceId?: string
}

export interface ApplyBatchJobResult {
  externalJobId: string
  jobTitle: string
  success: boolean
  status: DeliveryRecordStatus
  errorCode?: PlatformErrorCode
  errorMessage?: string
}

export interface ApplyBatchResult {
  total: number
  successCount: number
  failedCount: number
  paused: boolean
  results: ApplyBatchJobResult[]
}

export type DeliveryProgressEvent =
  | {
      type: 'progress'
      current: number
      total: number
      externalJobId: string
      jobTitle: string
      status: DeliveryRecordStatus
    }
  | {
      type: 'paused'
      current: number
      total: number
      externalJobId: string
      jobTitle: string
      errorCode: PlatformErrorCode
      message: string
    }
  | {
      type: 'completed'
      total: number
      successCount: number
      failedCount: number
      paused: boolean
    }

export interface GetDeliveryRecordsInput {
  page?: number
  pageSize?: number
  status?: DeliveryRecordStatus
}

export interface DeliveryRecordsResult {
  items: DeliveryRecord[]
  total: number
  page: number
  pageSize: number
}

export interface DeliveryStats {
  totalSent: number
  todaySent: number
  last7Days: Array<{ date: string; count: number }>
}

export interface ToggleStarInput {
  externalJobId: string
  starred: boolean
  platform?: string
}

export interface AppendBlacklistInput {
  preferenceId: string
  companyName: string
}

export const MAX_DELIVERY_BATCH_SIZE = 10
