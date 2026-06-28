import { BrowserView } from 'electron'
import type { BossDomSnapshotResult, BossViewLayout, FetchJobsResult, JobDetail, PlatformLoginStatus } from '../../shared/types/platform'
import { DEFAULT_BOSS_VIEW_HEIGHT } from '../../shared/types/platform'
import { captureBossDomSnapshot } from '../platform/boss/boss-dom-capture'
import { getMainWindow } from '../window/main-window'
import {
  checkBossLoginByCookies,
  checkBossLoginStatus,
  fetchBossJobListings,
  getBossView,
  getBossViewBounds,
  loadBossLoginPage,
  setBossViewRecreateHandler
} from '../platform/boss/boss-adapter'
import {
  getPlatformLoginStatus,
  upsertPlatformLogin
} from '../services/platform-account.service'

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

export async function fetchBossJobs(): Promise<FetchJobsResult> {
  const dbLoggedIn = getPlatformLoginStatus('boss').loggedIn
  const cookieLoggedIn = await checkBossLoginByCookies()

  if (!dbLoggedIn && !cookieLoggedIn) {
    throw new Error('请先登录 Boss 直聘')
  }

  setBossViewLayout({ expanded: true, height: DEFAULT_BOSS_VIEW_HEIGHT })
  attachBossView()

  const jobs = await fetchBossJobListings()
  if (jobs.length === 0) {
    throw new Error('未抓取到岗位，请在底部面板确认职位列表已加载后重试')
  }

  await upsertPlatformLogin('boss', true)

  const details: JobDetail[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    salary: job.salary,
    city: job.city,
    jobUrl: job.url,
    companyName: job.company,
    responsibilities: job.description,
    isOutsource: job.isOutsource
  }))

  return {
    platform: 'boss',
    jobs: details,
    fetchedAt: new Date().toISOString(),
    meta: {
      profileVersion: 'legacy-dom',
      channel: 'dom'
    }
  }
}

export function getBossPlatformStatus(): PlatformLoginStatus {
  return getPlatformLoginStatus('boss')
}

export async function exportBossDomSnapshot(): Promise<BossDomSnapshotResult> {
  setBossViewLayout({ expanded: true, height: DEFAULT_BOSS_VIEW_HEIGHT })
  attachBossView()
  return captureBossDomSnapshot()
}
