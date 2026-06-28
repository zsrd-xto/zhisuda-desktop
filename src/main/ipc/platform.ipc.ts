import { ipcMain } from 'electron'
import type { BossViewLayout } from '../../shared/types/platform'
import { serializePlatformErrorForIpc } from '../platform/platform-error'
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

async function handlePlatformAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    throw serializePlatformErrorForIpc(error)
  }
}

export function registerPlatformIpc(): void {
  ipcMain.handle('platform:login', async () => {
    return handlePlatformAction(openBossLogin)
  })

  ipcMain.handle('platform:checkLogin', async () => {
    return handlePlatformAction(checkBossPlatformLogin)
  })

  ipcMain.handle('platform:fetchJobs', async (_event, preferenceId: string) => {
    return handlePlatformAction(() => fetchBossJobs(preferenceId))
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
    return handlePlatformAction(exportBossDomSnapshot)
  })
}
