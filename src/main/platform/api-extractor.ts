import type { WebContents } from 'electron'
import { applyTemplate, queryJsonPath, resolveFieldMap } from './json-path'
import { PlatformError } from './platform-error'
import type { PageRecipeApi } from './types'

export interface BrowserApiResponse {
  ok: boolean
  status: number
  json: unknown
  error?: string
}

export async function fetchJsonInBrowser(
  webContents: WebContents,
  url: string,
  method: 'GET' | 'POST' = 'GET'
): Promise<BrowserApiResponse> {
  if (webContents.isDestroyed()) {
    throw new PlatformError('Boss 页面已关闭', 'UNKNOWN')
  }

  const result = (await webContents.executeJavaScript(
    `(
      async function () {
        try {
          const res = await fetch(${JSON.stringify(url)}, {
            method: ${JSON.stringify(method)},
            credentials: 'include',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest'
            }
          })
          const text = await res.text()
          let json = null
          try { json = JSON.parse(text) } catch { json = { _raw: text } }
          return { ok: res.ok, status: res.status, json }
        } catch (e) {
          return { ok: false, status: 0, json: null, error: String(e) }
        }
      }
    )()`,
    true
  )) as BrowserApiResponse

  return result
}

export function assertBossApiResponse(response: BrowserApiResponse): Record<string, unknown> {
  if (!response.ok || !response.json) {
    throw new PlatformError(
      response.error || `Boss API 请求失败 (HTTP ${response.status})`,
      'NETWORK'
    )
  }

  const json = response.json as Record<string, unknown>
  const code = json.code

  if (code === 36 || code === 37) {
    throw new PlatformError('Boss 检测到异常行为，请稍后在网页中完成验证', 'RATE_LIMIT')
  }

  if (code !== 0 && code !== undefined) {
    const message = typeof json.message === 'string' ? json.message : 'Boss API 返回错误'
    if (/登录|token|auth/i.test(message)) {
      throw new PlatformError(message, 'NOT_LOGGED_IN')
    }
    throw new PlatformError(message, 'API_CHANGED')
  }

  return json
}

export function buildListUrl(api: PageRecipeApi, page: number): string {
  if (!api.listUrl) {
    throw new PlatformError('列表 API 未配置', 'API_CHANGED')
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(api.queryParams ?? {})) {
    params.set(key, value)
  }

  if (api.pagination) {
    params.set(api.pagination.param, String(page))
  }

  let url = api.listUrl
    .replace(/\{page\}/g, String(page))
    .replace(/\{city\}/g, api.queryParams?.city ?? '')

  const query = params.toString()
  if (query && !url.includes('?')) {
    url += `?${query}`
  } else if (query && url.includes('?')) {
    url += `&${query}`
  }

  return url
}

export function buildDetailUrl(api: PageRecipeApi, context: Record<string, unknown>): string {
  if (!api.detailUrl) {
    throw new PlatformError('详情 API 未配置', 'API_CHANGED')
  }

  return applyTemplate(api.detailUrl, context)
}

export function parseListItems(
  json: Record<string, unknown>,
  api: PageRecipeApi
): Array<Record<string, unknown>> {
  const listPath = api.listJsonPath ?? 'zpData.jobList'
  const list = queryJsonPath(json, listPath)

  if (!Array.isArray(list)) {
    throw new PlatformError(`列表 JSON 路径失效: ${listPath}`, 'API_CHANGED')
  }

  return list.map((item) => resolveFieldMap(item as Record<string, unknown>, api.fieldMap))
}

export function parseDetailItem(
  json: Record<string, unknown>,
  api: PageRecipeApi
): Record<string, unknown> {
  const rootPath = api.detailJsonPath ?? 'zpData'
  const data = queryJsonPath(json, rootPath) as Record<string, unknown> | undefined

  if (!data || typeof data !== 'object') {
    throw new PlatformError('详情 JSON 结构失效', 'API_CHANGED')
  }

  return resolveFieldMap(data, api.fieldMap)
}

export function hasMorePages(json: Record<string, unknown>, api: PageRecipeApi): boolean {
  const path = api.hasMorePath ?? 'zpData.hasMore'
  const value = queryJsonPath(json, path)
  return Boolean(value)
}
