import { ipcMain } from 'electron'
import type { BossViewLayout } from '../../shared/types/platform'
import {
  checkBossPlatformLogin,
  exportBossDomSnapshot,
  fetchBossJobs,
  getBossPlatformStatus,
  getBossViewLayout,
  hideBossView,
  openBossLogin,
  setBossViewLayout
} from '../services/platform.service'

export function registerPlatformIpc(): void {
  ipcMain.handle('platform:login', async () => {
    return openBossLogin()
  })

  ipcMain.handle('platform:checkLogin', async () => {
    return checkBossPlatformLogin()
  })

  ipcMain.handle('platform:fetchJobs', async () => {
    return fetchBossJobs()
  })

  ipcMain.handle('platform:getStatus', () => {
    return getBossPlatformStatus()
  })

  ipcMain.handle('platform:hideView', () => {
    hideBossView()
    return true
  })

  ipcMain.handle('platform:setViewLayout', (_event, layout: BossViewLayout) => {
    setBossViewLayout(layout)
    return getBossViewLayout()
  })

  ipcMain.handle('platform:getViewLayout', () => {
    return getBossViewLayout()
  })

  ipcMain.handle('platform:debugSnapshot', async () => {
    return exportBossDomSnapshot()
  })
}
