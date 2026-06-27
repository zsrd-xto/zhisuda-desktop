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
  }
}
