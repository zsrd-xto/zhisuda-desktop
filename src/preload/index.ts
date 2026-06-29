import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DeliveryProgressEvent } from '../shared/types/delivery'
import type { UpdaterStatusEvent } from '../shared/types/updater'

export type IpcChannel =
  | 'user:getProfile'
  | 'user:updateNickname'
  | 'user:clearAllData'
  | 'resume:get'
  | 'resume:upload'
  | 'resume:update'
  | 'resume:uploadFromPath'
  | 'preferences:list'
  | 'preferences:save'
  | 'preferences:delete'
  | 'jobs:listBatches'
  | 'jobs:getLatestBatch'
  | 'jobs:getBatchJobs'
  | 'platform:login'
  | 'platform:checkLogin'
  | 'platform:fetchJobs'
  | 'platform:getStatus'
  | 'platform:hideView'
  | 'platform:setViewLayout'
  | 'platform:getViewLayout'
  | 'platform:debugSnapshot'
  | 'delivery:applyBatch'
  | 'delivery:resumeQueue'
  | 'delivery:getRecords'
  | 'delivery:getStats'
  | 'delivery:listStarred'
  | 'delivery:listDelivered'
  | 'delivery:toggleStar'
  | 'delivery:appendBlacklist'
  | 'updater:check'
  | 'updater:download'
  | 'updater:install'
  | 'updater:skipVersion'
  | 'updater:getVersion'

export interface ZhisudaApi {
  invoke: <T>(channel: IpcChannel, ...args: unknown[]) => Promise<T>
  onDeliveryProgress: (callback: (event: DeliveryProgressEvent) => void) => () => void
  onUpdaterStatus: (callback: (event: UpdaterStatusEvent) => void) => () => void
}

const zhisuda: ZhisudaApi = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  onDeliveryProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: DeliveryProgressEvent): void => {
      callback(payload)
    }
    ipcRenderer.on('delivery:progress', handler)
    return () => {
      ipcRenderer.removeListener('delivery:progress', handler)
    }
  },
  onUpdaterStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: UpdaterStatusEvent): void => {
      callback(payload)
    }
    ipcRenderer.on('updater:status', handler)
    return () => {
      ipcRenderer.removeListener('updater:status', handler)
    }
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('zhisuda', zhisuda)
  contextBridge.exposeInMainWorld('electron', electronAPI)
} else {
  throw new Error('contextIsolation must be enabled')
}
