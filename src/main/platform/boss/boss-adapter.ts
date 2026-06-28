import { BrowserView, session, type Event as ElectronEvent, type Rectangle, type WebContents } from 'electron'
import {
  BOSS_CHROME_USER_AGENT,
  BOSS_JOBS_FETCH_LIMIT,
  BOSS_JOBS_PAGE_TIMEOUT_MS,
  BOSS_JOBS_POLL_INTERVAL_MS,
  BOSS_JOBS_URL,
  BOSS_LOGIN_COOKIE_NAMES,
  BOSS_LOGIN_URL,
  BOSS_PARTITION
} from './boss-config'
import checkLoginScript from './scripts/check-login.js?raw'
import fetchJobsScript from './scripts/fetch-jobs.js?raw'
import type { BossViewLayout, JobListing } from '../../../shared/types/platform'

let bossView: BrowserView | null = null
let onViewRecreated: (() => void) | null = null

export function setBossViewRecreateHandler(handler: (() => void) | null): void {
  onViewRecreated = handler
}

function notifyViewRecreated(): void {
  onViewRecreated?.()
}

function resetBossViewIfDestroyed(): void {
  if (bossView?.webContents.isDestroyed()) {
    bossView = null
    notifyViewRecreated()
  }
}

export function getBossView(): BrowserView {
  resetBossViewIfDestroyed()
  if (!bossView) {
    bossView = new BrowserView({
      webPreferences: {
        partition: BOSS_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    bossView.webContents.setUserAgent(BOSS_CHROME_USER_AGENT)
    notifyViewRecreated()
  }
  return bossView
}

export function getBossViewBounds(
  windowWidth: number,
  windowHeight: number,
  layout: BossViewLayout
): Rectangle {
  if (!layout.expanded || layout.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const height = Math.min(layout.height, Math.max(200, windowHeight - 80))
  return {
    x: 0,
    y: windowHeight - height,
    width: windowWidth,
    height
  }
}

export async function checkBossLoginByCookies(): Promise<boolean> {
  const cookies = await session.fromPartition(BOSS_PARTITION).cookies.get({
    url: 'https://www.zhipin.com'
  })
  return cookies.some((cookie) =>
    (BOSS_LOGIN_COOKIE_NAMES as readonly string[]).includes(cookie.name)
  )
}

export async function loadBossLoginPage(): Promise<void> {
  const view = getBossView()
  await loadUrlWithTimeout(view.webContents, BOSS_LOGIN_URL, BOSS_JOBS_PAGE_TIMEOUT_MS)
}

export async function loadBossJobsPage(force = false): Promise<void> {
  const view = getBossView()
  const currentUrl = view.webContents.getURL()
  if (!force && currentUrl.includes('/geek/jobs')) {
    await delay(300)
    return
  }
  await loadUrlWithTimeout(view.webContents, BOSS_JOBS_URL, BOSS_JOBS_PAGE_TIMEOUT_MS)
}

export async function checkBossLoginStatus(): Promise<boolean> {
  if (await checkBossLoginByCookies()) {
    return true
  }

  const view = getBossView()
  const url = view.webContents.getURL()
  if (!url || url === 'about:blank') {
    return false
  }

  try {
    const result = (await view.webContents.executeJavaScript(checkLoginScript, true)) as {
      loggedIn: boolean
    }
    return Boolean(result?.loggedIn)
  } catch {
    return false
  }
}

export async function fetchBossJobListings(): Promise<JobListing[]> {
  const view = getBossView()

  let jobs = await extractJobListings(view.webContents)
  if (jobs.length > 0) {
    return jobs.slice(0, BOSS_JOBS_FETCH_LIMIT)
  }

  await loadBossJobsPage()
  await waitForJobCards(BOSS_JOBS_PAGE_TIMEOUT_MS)

  jobs = await extractJobListings(view.webContents)
  if (jobs.length > 0) {
    return jobs.slice(0, BOSS_JOBS_FETCH_LIMIT)
  }

  await loadBossJobsPage(true)
  await waitForJobCards(BOSS_JOBS_PAGE_TIMEOUT_MS)
  jobs = await extractJobListings(view.webContents)

  return jobs.slice(0, BOSS_JOBS_FETCH_LIMIT)
}

async function extractJobListings(webContents: WebContents): Promise<JobListing[]> {
  if (webContents.isDestroyed()) {
    return []
  }

  try {
    await webContents.executeJavaScript('window.scrollTo(0, document.body.scrollHeight)', true)
    await delay(600)
    await webContents.executeJavaScript('window.scrollTo(0, 0)', true)
    await delay(300)

    const jobs = (await webContents.executeJavaScript(fetchJobsScript, true)) as JobListing[]
    return Array.isArray(jobs) ? jobs : []
  } catch {
    return []
  }
}

async function loadUrlWithTimeout(
  _webContents: WebContents,
  url: string,
  timeoutMs: number
): Promise<void> {
  resetBossViewIfDestroyed()
  const view = getBossView()
  const contents = view.webContents

  if (contents.isDestroyed()) {
    throw new Error('Boss 页面已关闭，请重新展开面板后重试')
  }

  const targetPath = new URL(url).pathname
  const currentUrl = contents.getURL()
  if (currentUrl.includes(targetPath)) {
    await delay(300)
    return
  }

  await Promise.race([
    new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (): void => {
        if (settled) {
          return
        }
        settled = true
        cleanup()
        resolve()
      }
      const fail = (
        _event: ElectronEvent,
        errorCode: number,
        errorDescription: string,
        _validatedURL: string,
        isMainFrame: boolean
      ): void => {
        if (!isMainFrame || settled) {
          return
        }
        settled = true
        cleanup()
        reject(new Error(`Boss 页面加载失败 (${errorCode}): ${errorDescription}`))
      }
      const cleanup = (): void => {
        contents.removeListener('did-stop-loading', finish)
        contents.removeListener('did-finish-load', finish)
        contents.removeListener('did-fail-load', fail)
      }

      contents.once('did-stop-loading', finish)
      contents.once('did-finish-load', finish)
      contents.once('did-fail-load', fail)

      void contents.loadURL(url).then(() => {
        if (!contents.isLoading()) {
          finish()
        }
      }).catch((error: unknown) => {
        if (settled) {
          return
        }
        settled = true
        cleanup()
        reject(error instanceof Error ? error : new Error('Boss 页面加载失败'))
      })
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Boss 页面加载超时，请检查网络后重试')), timeoutMs)
    })
  ])
}

async function waitForJobCards(timeoutMs: number): Promise<number> {
  const countScript = `(function () {
    const selectors = [
      '.job-card-wrapper',
      '.job-list-box .job-card',
      '.job-card',
      '.rec-job-list .job-card',
      'li.job-card-box',
      '.job-list li',
      'a[href*="job_detail"]'
    ]
    for (const selector of selectors) {
      const count = document.querySelectorAll(selector).length
      if (count > 0) return count
    }
    return 0
  })()`

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    resetBossViewIfDestroyed()
    const contents = getBossView().webContents

    if (contents.isDestroyed()) {
      bossView = null
      notifyViewRecreated()
      await loadBossJobsPage(true)
      continue
    }

    try {
      const count = (await contents.executeJavaScript(countScript, true)) as number
      if (count > 0) {
        return count
      }
    } catch {
      // 页面脚本尚未可执行
    }

    await delay(BOSS_JOBS_POLL_INTERVAL_MS)
  }

  return 0
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function destroyBossView(): void {
  if (bossView) {
    bossView.webContents.close()
    bossView = null
  }
}
