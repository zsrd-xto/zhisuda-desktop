import { ipcMain } from 'electron'
import {
  checkForUpdates,
  downloadUpdate,
  getCurrentAppVersion,
  installUpdate,
  skipUpdateVersion
} from '../services/updater.service'

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:check', () => {
    return checkForUpdates()
  })

  ipcMain.handle('updater:download', () => {
    return downloadUpdate()
  })

  ipcMain.handle('updater:install', () => {
    installUpdate()
  })

  ipcMain.handle('updater:skipVersion', (_event, version: string) => {
    skipUpdateVersion(version)
    return true
  })

  ipcMain.handle('updater:getVersion', () => {
    return getCurrentAppVersion()
  })
}
