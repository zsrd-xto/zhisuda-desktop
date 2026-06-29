import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdaterCheckResult, UpdaterStatusEvent } from '../../shared/types/updater'
import { getMainWindow } from '../window/main-window'
import {
  readSkippedVersionFrom,
  shouldSkipVersionIn,
  writeSkippedVersionTo
} from './updater-skip'

const AUTO_CHECK_DELAY_MS = 5000

let statusListener: ((event: UpdaterStatusEvent) => void) | null = null
let pendingUpdateVersion: string | null = null
let initialized = false

function getUserDataDir(): string {
  return app.getPath('userData')
}

export function readSkippedVersion(): string | null {
  return readSkippedVersionFrom(getUserDataDir())
}

export function writeSkippedVersion(version: string): void {
  writeSkippedVersionTo(getUserDataDir(), version)
}

export function shouldSkipVersion(version: string): boolean {
  return shouldSkipVersionIn(getUserDataDir(), version)
}

function emitStatus(event: UpdaterStatusEvent): void {
  statusListener?.(event)
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', event)
  }
}

function toUpdateInfoPayload(info: { version: string; releaseNotes?: unknown }): {
  version: string
  releaseNotes?: string
} {
  let releaseNotes: string | undefined
  const rawNotes = info.releaseNotes
  if (typeof rawNotes === 'string') {
    releaseNotes = rawNotes
  } else if (Array.isArray(rawNotes)) {
    releaseNotes = rawNotes
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object' && 'note' in item) {
          const note = (item as { note?: string | null }).note
          return typeof note === 'string' ? note : null
        }
        return null
      })
      .filter((note): note is string => typeof note === 'string')
      .join('\n')
  }

  return {
    version: info.version,
    releaseNotes
  }
}

function configureAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    emitStatus({ phase: 'checking', currentVersion: app.getVersion() })
  })

  autoUpdater.on('update-available', (info) => {
    if (shouldSkipVersion(info.version)) {
      emitStatus({
        phase: 'not-available',
        currentVersion: app.getVersion(),
        message: '已跳过此版本'
      })
      return
    }

    pendingUpdateVersion = info.version
    emitStatus({
      phase: 'available',
      currentVersion: app.getVersion(),
      updateInfo: toUpdateInfoPayload(info)
    })
  })

  autoUpdater.on('update-not-available', () => {
    emitStatus({
      phase: 'not-available',
      currentVersion: app.getVersion(),
      message: '当前已是最新版本'
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    emitStatus({
      phase: 'downloading',
      currentVersion: app.getVersion(),
      updateInfo: pendingUpdateVersion ? { version: pendingUpdateVersion } : undefined,
      progress: progress.percent
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    emitStatus({
      phase: 'downloaded',
      currentVersion: app.getVersion(),
      updateInfo: toUpdateInfoPayload(info)
    })
  })

  autoUpdater.on('error', (error) => {
    emitStatus({
      phase: 'error',
      currentVersion: app.getVersion(),
      message: error.message
    })
  })
}

export function initAutoUpdater(onStatus?: (event: UpdaterStatusEvent) => void): void {
  if (initialized) {
    return
  }

  initialized = true
  statusListener = onStatus ?? null
  configureAutoUpdater()

  if (!app.isPackaged) {
    return
  }

  setTimeout(() => {
    void checkForUpdates()
  }, AUTO_CHECK_DELAY_MS)
}

export async function checkForUpdates(): Promise<UpdaterCheckResult> {
  if (!app.isPackaged) {
    return {
      phase: 'error',
      currentVersion: app.getVersion(),
      message: '开发模式不支持检查更新'
    }
  }

  try {
    const result = await autoUpdater.checkForUpdates()
    const updateInfo = result?.updateInfo

    if (!updateInfo) {
      return {
        phase: 'not-available',
        currentVersion: app.getVersion(),
        message: '当前已是最新版本'
      }
    }

    if (shouldSkipVersion(updateInfo.version)) {
      return {
        phase: 'not-available',
        currentVersion: app.getVersion(),
        message: '已跳过此版本'
      }
    }

    pendingUpdateVersion = updateInfo.version
    return {
      phase: 'available',
      currentVersion: app.getVersion(),
      updateInfo: toUpdateInfoPayload(updateInfo)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '检查更新失败'
    return {
      phase: 'error',
      currentVersion: app.getVersion(),
      message
    }
  }
}

export async function downloadUpdate(): Promise<boolean> {
  if (!app.isPackaged) {
    return false
  }

  await autoUpdater.downloadUpdate()
  return true
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}

export function skipUpdateVersion(version: string): void {
  writeSkippedVersion(version)
  pendingUpdateVersion = null
  emitStatus({
    phase: 'not-available',
    currentVersion: app.getVersion(),
    message: `已跳过版本 ${version}`
  })
}

export function getCurrentAppVersion(): string {
  return app.getVersion()
}
