import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { BossDomSnapshotResult } from '../../../shared/types/platform'
import { getBossView } from './boss-adapter'

const CAPTURE_SCRIPT = `(async function () {
  const selectorMap = {
    jobCardWrapper: '.job-card-wrapper',
    jobCard: '.job-card',
    jobListBox: '.job-list-box',
    jobCardBox: 'li.job-card-box',
    jobDetailLinks: 'a[href*="job_detail"]',
    jobName: '.job-name',
    companyName: '.company-name',
    salary: '.salary'
  }

  const domProbe = {}
  for (const [key, selector] of Object.entries(selectorMap)) {
    domProbe[key] = document.querySelectorAll(selector).length
  }

  const sampleLinks = Array.from(document.querySelectorAll('a[href*="job_detail"]'))
    .slice(0, 3)
    .map((a) => (a instanceof HTMLAnchorElement ? a.href : ''))

  let vueProbe = { found: false, jobListLength: 0 }
  const listRoot = document.querySelector('.job-list-box, .job-list, .rec-job-list')
  if (listRoot) {
    const vue = listRoot.__vue__ || listRoot.__vueParentComponent
    if (vue) {
      vueProbe.found = true
      const list = vue.jobList || vue.$data?.jobList || vue.setupState?.jobList
      if (Array.isArray(list)) {
        vueProbe.jobListLength = list.length
      }
    }
  }

  function pickJobFields(item) {
    if (!item || typeof item !== 'object') return { fields: null, securityId: null }
    return {
      fields: {
        encryptJobId: item.encryptJobId,
        jobName: item.jobName,
        salaryDesc: item.salaryDesc,
        cityName: item.cityName,
        brandName: item.brandName
      },
      securityId: item.securityId || null
    }
  }

  const apiEndpoints = [
    '/wapi/zpgeek/pc/recommend/job/list.json?page=1&pageSize=15&city=101280100',
    '/wapi/zpgeek/search/joblist.json?page=1&pageSize=15&city=101280100&query='
  ]

  const apiProbes = []
  let detailSecurityId = null
  for (const path of apiEndpoints) {
    try {
      const res = await fetch('https://www.zhipin.com' + path, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      const json = await res.json()
      const list = json?.zpData?.jobList
      const picked = list?.[0] ? pickJobFields(list[0]) : { fields: null, securityId: null }
      if (!detailSecurityId && picked.securityId) {
        detailSecurityId = picked.securityId
      }
      apiProbes.push({
        path,
        httpStatus: res.status,
        code: json?.code,
        message: json?.message,
        listLength: Array.isArray(list) ? list.length : 0,
        firstItemKeys: list?.[0] ? Object.keys(list[0]).slice(0, 25) : [],
        sampleFirstItem: picked.fields,
        hasMore: json?.zpData?.hasMore
      })
    } catch (error) {
      apiProbes.push({
        path,
        error: String(error)
      })
    }
  }

  let detailProbe = null
  if (detailSecurityId) {
    try {
      const detailRes = await fetch(
        'https://www.zhipin.com/wapi/zpgeek/job/detail.json?securityId=' +
          encodeURIComponent(detailSecurityId),
        { credentials: 'include' }
      )
      const detailJson = await detailRes.json()
      detailProbe = {
        httpStatus: detailRes.status,
        code: detailJson?.code,
        jobInfoKeys: detailJson?.zpData?.jobInfo
          ? Object.keys(detailJson.zpData.jobInfo).slice(0, 20)
          : [],
        brandComInfoKeys: detailJson?.zpData?.brandComInfo
          ? Object.keys(detailJson.zpData.brandComInfo).slice(0, 20)
          : [],
        sample: {
          jobName: detailJson?.zpData?.jobInfo?.jobName,
          postDescriptionLength: (detailJson?.zpData?.jobInfo?.postDescription || '').length,
          brandName: detailJson?.zpData?.brandComInfo?.brandName,
          scaleName: detailJson?.zpData?.brandComInfo?.scaleName,
          stageName: detailJson?.zpData?.brandComInfo?.stageName
        }
      }
    } catch (error) {
      detailProbe = { error: String(error) }
    }
  }

  return {
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    domProbe,
    vueProbe,
    sampleLinks,
    apiProbes,
    detailProbe
  }
})()`

function getCaptureDir(): string {
  return join(app.getPath('userData'), 'boss-dom-capture')
}

export async function captureBossDomSnapshot(): Promise<BossDomSnapshotResult> {
  const view = getBossView()
  const webContents = view.webContents

  if (webContents.isDestroyed()) {
    throw new Error('Boss 面板未就绪，请先展开底部面板并打开职位页')
  }

  const url = webContents.getURL()
  if (!url || url === 'about:blank') {
    throw new Error('Boss 页面尚未加载，请先登录并打开职位列表')
  }

  const payload = (await webContents.executeJavaScript(CAPTURE_SCRIPT, true)) as Omit<
    BossDomSnapshotResult,
    'filePath'
  >

  const dir = getCaptureDir()
  mkdirSync(dir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = join(dir, `snapshot-${timestamp}.json`)

  const result: BossDomSnapshotResult = {
    ...payload,
    filePath
  }

  writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8')

  return result
}

export function getBossDomCaptureDir(): string {
  return getCaptureDir()
}
