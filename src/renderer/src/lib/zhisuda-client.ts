import type { JobPreferences, JobPreferencesInput } from '@shared/types/preferences'
import type { BossDomSnapshotResult, BossViewLayout, FetchJobsResult, PlatformLoginStatus } from '@shared/types/platform'
import type { Resume, ResumeParsedData } from '@shared/types/resume'
import type { UserProfile } from '@shared/types/user'

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (!window.zhisuda?.invoke) {
    throw new Error('职速达 IPC 未就绪，请完全退出应用后重新运行 npm run dev')
  }

  return window.zhisuda.invoke<T>(channel as Parameters<typeof window.zhisuda.invoke>[0], ...args)
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
    get: (): Promise<JobPreferences> => invoke('preferences:get'),
    save: (input: JobPreferencesInput): Promise<JobPreferences> =>
      invoke('preferences:save', input)
  },
  platform: {
    login: (): Promise<PlatformLoginStatus> => invoke('platform:login'),
    checkLogin: (): Promise<PlatformLoginStatus> => invoke('platform:checkLogin'),
    getStatus: (): Promise<PlatformLoginStatus> => invoke('platform:getStatus'),
    fetchJobs: (): Promise<FetchJobsResult> => invoke('platform:fetchJobs'),
    hideView: (): Promise<boolean> => invoke('platform:hideView'),
    setViewLayout: (layout: BossViewLayout): Promise<BossViewLayout> =>
      invoke('platform:setViewLayout', layout),
    getViewLayout: (): Promise<BossViewLayout> => invoke('platform:getViewLayout'),
    debugSnapshot: (): Promise<BossDomSnapshotResult> => invoke('platform:debugSnapshot')
  }
}
