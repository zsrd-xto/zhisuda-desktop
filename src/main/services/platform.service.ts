import { BrowserView } from 'electron'
import type { BossDomSnapshotResult, BossViewLayout, FetchJobsResult, PlatformLoginStatus } from '../../shared/types/platform'
import { DEFAULT_BOSS_VIEW_HEIGHT } from '../../shared/types/platform'
import { captureBossDomSnapshot } from '../platform/boss/boss-dom-capture'
import { runBossJobExtraction } from '../platform/extractor-runner'
import { PlatformError } from '../platform/platform-error'
import { getMainWindow } from '../window/main-window'
import {
  checkBossLoginByCookies,
  checkBossLoginStatus,
  getBossView,
  getBossViewBounds,
  loadBossLoginPage,
  setBossViewRecreateHandler
} from '../platform/boss/boss-adapter'
import { preferenceToFetchCriteria } from '../../shared/types/preferences'
import {
  getPlatformLoginStatus,
  upsertPlatformLogin
} from '../services/platform-account.service'
import { getPreferenceOrThrow } from '../services/preferences.service'

let attachedView: BrowserView | null = null
let currentLayout: BossViewLayout = { expanded: false, height: 0 }

function syncAttachedView(): void {
  if (attachedView?.webContents.isDestroyed()) {
    attachedView = null
  }
}

function applyBossViewBounds(): void {
  if (!attachedView) {
    return
  }

  const mainWindow = getMainWindow()
  const bounds = getBossViewBounds(
    mainWindow.getBounds().width,
    mainWindow.getBounds().height,
    currentLayout
  )

  if (bounds.height <= 0) {
    hideBossView()
    return
  }

  attachedView.setBounds(bounds)
}

function attachBossView(): BrowserView {
  syncAttachedView()
  const mainWindow = getMainWindow()
  const view = getBossView()
  const bounds = getBossViewBounds(
    mainWindow.getBounds().width,
    mainWindow.getBounds().height,
    currentLayout
  )

  if (bounds.height <= 0) {
    hideBossView()
    return view
  }

  if (attachedView !== view) {
    mainWindow.setBrowserView(view)
    attachedView = view
  }

  view.setBounds(bounds)
  view.setAutoResize({ width: true, height: false, horizontal: true, vertical: false })
  return view
}

function updateBossViewBounds(): void {
  applyBossViewBounds()
}

export function registerBossViewResizeHandler(): void {
  const mainWindow = getMainWindow()
  mainWindow.on('resize', updateBossViewBounds)

  setBossViewRecreateHandler(() => {
    syncAttachedView()
    if (currentLayout.expanded && currentLayout.height > 0) {
      attachBossView()
    }
  })
}

export function setBossViewLayout(layout: BossViewLayout): void {
  currentLayout = layout
  if (!layout.expanded || layout.height <= 0) {
    hideBossView()
    return
  }
  attachBossView()
}

export function getBossViewLayout(): BossViewLayout {
  return currentLayout
}

export function hideBossView(): void {
  const mainWindow = getMainWindow()
  mainWindow.setBrowserView(null)
  attachedView = null
  currentLayout = { expanded: false, height: 0 }
}

export async function openBossLogin(): Promise<PlatformLoginStatus> {
  setBossViewLayout({ expanded: true, height: DEFAULT_BOSS_VIEW_HEIGHT })
  await loadBossLoginPage()
  const loggedIn = await checkBossLoginStatus()
  return upsertPlatformLogin('boss', loggedIn)
}

export async function checkBossPlatformLogin(): Promise<PlatformLoginStatus> {
  const cookieLoggedIn = await checkBossLoginByCookies()
  if (cookieLoggedIn) {
    return upsertPlatformLogin('boss', true)
  }

  if (!attachedView) {
    return getPlatformLoginStatus('boss')
  }

  const loggedIn = await checkBossLoginStatus()
  return upsertPlatformLogin('boss', loggedIn)
}

export async function fetchBossJobs(preferenceId: string): Promise<FetchJobsResult> {
  const dbLoggedIn = getPlatformLoginStatus('boss').loggedIn
  const cookieLoggedIn = await checkBossLoginByCookies()

  if (!dbLoggedIn && !cookieLoggedIn) {
    throw new PlatformError('请先登录 Boss 直聘', 'NOT_LOGGED_IN')
  }

  const preference = getPreferenceOrThrow(preferenceId)
  const criteria = preferenceToFetchCriteria(preference)

  setBossViewLayout({ expanded: true, height: DEFAULT_BOSS_VIEW_HEIGHT })
  attachBossView()

  const result = await runBossJobExtraction(criteria)
  await upsertPlatformLogin('boss', true)
  return result
}

export function getBossPlatformStatus(): PlatformLoginStatus {
  return getPlatformLoginStatus('boss')
}

export async function exportBossDomSnapshot(): Promise<BossDomSnapshotResult> {
  setBossViewLayout({ expanded: true, height: DEFAULT_BOSS_VIEW_HEIGHT })
  attachBossView()
  return captureBossDomSnapshot()
}
