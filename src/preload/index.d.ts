import { ElectronAPI } from '@electron-toolkit/preload'
import type { ZhisudaApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    zhisuda: ZhisudaApi
  }
}

export {}
