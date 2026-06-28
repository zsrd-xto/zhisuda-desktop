import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type IpcChannel =
  | 'user:getProfile'
  | 'user:updateNickname'
  | 'user:clearAllData'
  | 'resume:get'
  | 'resume:upload'
  | 'resume:update'
  | 'resume:uploadFromPath'
  | 'preferences:get'
  | 'preferences:save'
  | 'platform:login'
  | 'platform:checkLogin'
  | 'platform:fetchJobs'
  | 'platform:getStatus'
  | 'platform:hideView'
  | 'platform:setViewLayout'
  | 'platform:getViewLayout'
  | 'platform:debugSnapshot'

export interface ZhisudaApi {
  invoke: <T>(channel: IpcChannel, ...args: unknown[]) => Promise<T>
}

const zhisuda: ZhisudaApi = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('zhisuda', zhisuda)
  contextBridge.exposeInMainWorld('electron', electronAPI)
} else {
  throw new Error('contextIsolation must be enabled')
}
