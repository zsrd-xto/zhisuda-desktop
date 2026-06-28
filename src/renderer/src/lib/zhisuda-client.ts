import type { GetBatchJobsInput, JobBatchJobsResult, JobBatchListResult, ListBatchesInput } from '@shared/types/jobs'
import type { JobFetchBatch } from '@shared/types/jobs'
import type { JobPreference, JobPreferenceInput } from '@shared/types/preferences'
import type {
  BossDomSnapshotResult,
  BossViewLayout,
  FetchJobsResult,
  PlatformErrorCode,
  PlatformIpcError,
  PlatformLoginStatus
} from '@shared/types/platform'
import type { Resume, ResumeParsedData } from '@shared/types/resume'
import type { UserProfile } from '@shared/types/user'

const IPC_ERROR_MARKER = '__zhisuda_platform_error__'

export function parsePlatformIpcError(error: unknown): PlatformIpcError {
  if (!(error instanceof Error)) {
    return { message: '未知错误', errorCode: 'UNKNOWN' }
  }

  if (!error.message.startsWith(IPC_ERROR_MARKER)) {
    return { message: error.message, errorCode: 'UNKNOWN' }
  }

  try {
    const parsed = JSON.parse(error.message.slice(IPC_ERROR_MARKER.length)) as PlatformIpcError
    if (parsed.message && parsed.errorCode) {
      return parsed
    }
  } catch {
    // fall through
  }

  return { message: error.message, errorCode: 'UNKNOWN' }
}

export const PLATFORM_ERROR_LABELS: Record<PlatformErrorCode, string> = {
  NOT_LOGGED_IN: '未登录',
  NOT_ON_JOBS_PAGE: '不在职位页',
  API_CHANGED: '接口变更',
  DOM_CHANGED: '页面结构变更',
  SCROLL_EXHAUSTED: '滚动无新数据',
  PARTIAL_DATA: '数据不完整',
  TIMEOUT: '超时',
  RATE_LIMIT: '频率限制',
  DAILY_QUOTA_EXCEEDED: '今日配额已满',
  CAPTCHA: '需验证码',
  NETWORK: '网络错误',
  UNKNOWN: '未知错误'
}

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (!window.zhisuda?.invoke) {
    throw new Error('职速达 IPC 未就绪，请完全退出应用后重新运行 npm run dev')
  }

  return window.zhisuda.invoke<T>(channel as Parameters<typeof window.zhisuda.invoke>[0], ...args)
}

async function invokePlatform<T>(channel: string, ...args: unknown[]): Promise<T> {
  try {
    return await invoke<T>(channel, ...args)
  } catch (error) {
    const parsed = parsePlatformIpcError(error)
    throw Object.assign(new Error(parsed.message), { errorCode: parsed.errorCode })
  }
}

export const zhisudaClient = {
  user: {
    getProfile: (): Promise<UserProfile> => invoke('user:getProfile'),
    updateNickname: (nickname: string): Promise<UserProfile> =>
      invoke('user:updateNickname', nickname),
    clearAllData: (): Promise<UserProfile> => invoke('user:clearAllData')
  },
  resume: {
    get: (): Promise<Resume | null> => invoke('resume:get'),
    upload: (): Promise<Resume | null> => invoke('resume:upload'),
    update: (parsedData: ResumeParsedData): Promise<Resume> =>
      invoke('resume:update', parsedData)
  },
  preferences: {
    list: (): Promise<JobPreference[]> => invoke('preferences:list'),
    save: (input: JobPreferenceInput): Promise<JobPreference> =>
      invoke('preferences:save', input),
    delete: (preferenceId: string): Promise<boolean> => invoke('preferences:delete', preferenceId)
  },
  jobs: {
    listBatches: (input?: ListBatchesInput): Promise<JobBatchListResult> =>
      invoke('jobs:listBatches', input),
    getLatestBatch: (): Promise<JobFetchBatch | null> => invoke('jobs:getLatestBatch'),
    getBatchJobs: (input: GetBatchJobsInput): Promise<JobBatchJobsResult> =>
      invoke('jobs:getBatchJobs', input)
  },
  platform: {
    login: (): Promise<PlatformLoginStatus> => invokePlatform('platform:login'),
    checkLogin: (): Promise<PlatformLoginStatus> => invokePlatform('platform:checkLogin'),
    getStatus: (): Promise<PlatformLoginStatus> => invoke('platform:getStatus'),
    fetchJobs: (preferenceId: string): Promise<FetchJobsResult> =>
      invokePlatform('platform:fetchJobs', preferenceId),
    hideView: (): Promise<boolean> => invoke('platform:hideView'),
    setViewLayout: (layout: BossViewLayout): Promise<BossViewLayout> =>
      invoke('platform:setViewLayout', layout),
    getViewLayout: (): Promise<BossViewLayout> => invoke('platform:getViewLayout'),
    debugSnapshot: (): Promise<BossDomSnapshotResult> => invokePlatform('platform:debugSnapshot')
  }
}
