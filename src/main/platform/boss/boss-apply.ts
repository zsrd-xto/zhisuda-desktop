import type { WebContents } from 'electron'
import type { ApplyResult, JobDetail, PlatformErrorCode } from '../../../shared/types/platform'
import { BOSS_JOBS_PAGE_TIMEOUT_MS } from './boss-config'
import { getBossView } from './boss-adapter'
import applyJobScript from './scripts/apply-job.js?raw'

interface ApplyScriptResult {
  success: boolean
  errorCode?: string
  message?: string
}

function normalizeApplyErrorCode(code?: string): PlatformErrorCode {
  const allowed: PlatformErrorCode[] = [
    'RATE_LIMIT',
    'CAPTCHA',
    'DOM_CHANGED',
    'NETWORK',
    'NOT_LOGGED_IN',
    'UNKNOWN'
  ]
  if (code && allowed.includes(code as PlatformErrorCode)) {
    return code as PlatformErrorCode
  }
  return 'UNKNOWN'
}

async function loadJobDetailPage(webContents: WebContents, jobUrl: string): Promise<void> {
  if (webContents.isDestroyed()) {
    throw new Error('Boss 页面已关闭')
  }

  const currentUrl = webContents.getURL()
  if (currentUrl === jobUrl || currentUrl.split('?')[0] === jobUrl.split('?')[0]) {
    await delay(500)
    return
  }

  await Promise.race([
    new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve()
      }
      const fail = (): void => {
        if (settled) return
        settled = true
        cleanup()
        reject(new Error('岗位详情页加载失败'))
      }
      const cleanup = (): void => {
        webContents.removeListener('did-stop-loading', finish)
        webContents.removeListener('did-finish-load', finish)
        webContents.removeListener('did-fail-load', fail)
      }

      webContents.once('did-stop-loading', finish)
      webContents.once('did-finish-load', finish)
      webContents.once('did-fail-load', fail)

      void webContents.loadURL(jobUrl).then(() => {
        if (!webContents.isLoading()) {
          finish()
        }
      }).catch(fail)
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('岗位详情页加载超时')), BOSS_JOBS_PAGE_TIMEOUT_MS)
    })
  ])

  await delay(600)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function applyBossJob(job: JobDetail): Promise<ApplyResult> {
  if (!job.jobUrl) {
    return { success: false, errorCode: 'UNKNOWN', message: '岗位链接缺失' }
  }

  const view = getBossView()
  const webContents = view.webContents

  try {
    await loadJobDetailPage(webContents, job.jobUrl)
    const result = (await webContents.executeJavaScript(applyJobScript, true)) as ApplyScriptResult

    if (result?.success) {
      return { success: true }
    }

    return {
      success: false,
      errorCode: normalizeApplyErrorCode(result?.errorCode),
      message: result?.message ?? '投递失败'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '投递失败'
    const errorCode: PlatformErrorCode = /超时|网络|load/i.test(message) ? 'NETWORK' : 'UNKNOWN'
    return { success: false, errorCode, message }
  }
}
