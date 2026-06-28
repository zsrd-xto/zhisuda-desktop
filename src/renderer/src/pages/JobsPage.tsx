import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_JOB_PAGE_SIZE } from '@shared/types/jobs'
import type { JobFetchBatch } from '@shared/types/jobs'
import type { JobPreference } from '@shared/types/preferences'
import { DEFAULT_BOSS_VIEW_HEIGHT } from '@shared/types/platform'
import type { ExtractChannel, JobDetail, PlatformErrorCode, PlatformLoginStatus } from '@shared/types/platform'
import { PLATFORM_ERROR_LABELS, zhisudaClient } from '@renderer/lib/zhisuda-client'

interface PlatformActionError extends Error {
  errorCode?: PlatformErrorCode
}

function getActionError(err: unknown): { message: string; errorCode?: PlatformErrorCode } {
  if (err instanceof Error) {
    const code = (err as PlatformActionError).errorCode
    return { message: err.message, errorCode: code }
  }
  return { message: '操作失败' }
}

export function JobsPage(): React.JSX.Element {
  const [status, setStatus] = useState<PlatformLoginStatus | null>(null)
  const [preferences, setPreferences] = useState<JobPreference[]>([])
  const [selectedPreferenceId, setSelectedPreferenceId] = useState<string>('')
  const [batches, setBatches] = useState<JobFetchBatch[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [activeBatch, setActiveBatch] = useState<JobFetchBatch | null>(null)
  const [jobs, setJobs] = useState<JobDetail[]>([])
  const [jobPage, setJobPage] = useState(1)
  const [jobTotal, setJobTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<PlatformErrorCode | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [fetchChannel, setFetchChannel] = useState<ExtractChannel | null>(null)
  const [viewExpanded, setViewExpanded] = useState(false)

  const pageSize = DEFAULT_JOB_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(jobTotal / pageSize))

  const clearFeedback = (): void => {
    setError(null)
    setErrorCode(null)
    setMessage(null)
  }

  const showError = (err: unknown): void => {
    const parsed = getActionError(err)
    setError(parsed.message)
    setErrorCode(parsed.errorCode ?? null)
  }

  const setPanelExpanded = async (expanded: boolean): Promise<void> => {
    setViewExpanded(expanded)
    if (expanded) {
      await zhisudaClient.platform.setViewLayout({
        expanded: true,
        height: DEFAULT_BOSS_VIEW_HEIGHT
      })
    } else {
      await zhisudaClient.platform.hideView()
    }
  }

  const loadBatches = useCallback(async (): Promise<JobFetchBatch[]> => {
    const result = await zhisudaClient.jobs.listBatches({ page: 1, pageSize: 50 })
    setBatches(result.items)
    return result.items
  }, [])

  const loadBatchJobs = useCallback(
    async (batchId: string, page = 1): Promise<void> => {
      const result = await zhisudaClient.jobs.getBatchJobs({ batchId, page, pageSize })
      setActiveBatch(result.batch)
      setSelectedBatchId(batchId)
      setJobs(result.jobs)
      setJobPage(result.page)
      setJobTotal(result.total)
      setFetchChannel(result.batch.channel)
    },
    [pageSize]
  )

  useEffect(() => {
    let cancelled = false

    const init = async (): Promise<void> => {
      try {
        const [current, layout, prefList, batchList] = await Promise.all([
          zhisudaClient.platform.getStatus(),
          zhisudaClient.platform.getViewLayout(),
          zhisudaClient.preferences.list(),
          zhisudaClient.jobs.listBatches({ page: 1, pageSize: 50 })
        ])

        if (cancelled) return

        setStatus(current)
        setViewExpanded(layout.expanded)
        setPreferences(prefList)
        setBatches(batchList.items)

        if (prefList.length === 1) {
          setSelectedPreferenceId(prefList[0].id)
        } else if (prefList.length > 0 && !selectedPreferenceId) {
          setSelectedPreferenceId(prefList[0].id)
        }

        const latest = batchList.items[0]
        if (latest) {
          await loadBatchJobs(latest.id, 1)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          showError(err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void init()

    return () => {
      cancelled = true
      void zhisudaClient.platform.hideView()
    }
  }, [loadBatchJobs])

  const handleTogglePanel = async (): Promise<void> => {
    clearFeedback()
    await setPanelExpanded(!viewExpanded)
  }

  const handleLogin = async (): Promise<void> => {
    setBusyAction('login')
    clearFeedback()

    try {
      await setPanelExpanded(true)
      const nextStatus = await zhisudaClient.platform.login()
      setStatus(nextStatus)
    } catch (err: unknown) {
      showError(err)
    } finally {
      setBusyAction(null)
    }
  }

  const handleCheckLogin = async (): Promise<void> => {
    setBusyAction('check')
    clearFeedback()

    try {
      const nextStatus = await zhisudaClient.platform.checkLogin()
      setStatus(nextStatus)
      setMessage(nextStatus.loggedIn ? '已检测到 Boss 登录状态' : '当前未登录')
    } catch (err: unknown) {
      showError(err)
    } finally {
      setBusyAction(null)
    }
  }

  const handleExportSnapshot = async (): Promise<void> => {
    setBusyAction('snapshot')
    clearFeedback()

    try {
      await setPanelExpanded(true)
      const result = await zhisudaClient.platform.debugSnapshot()
      setMessage(`页面结构已导出：${result.filePath}`)
    } catch (err: unknown) {
      showError(err)
    } finally {
      setBusyAction(null)
    }
  }

  const handleFetchJobs = async (): Promise<void> => {
    if (!selectedPreferenceId) {
      setError('请先创建并选择一条求职偏好')
      return
    }

    setBusyAction('fetch')
    clearFeedback()

    try {
      await setPanelExpanded(true)
      const result = await zhisudaClient.platform.fetchJobs(selectedPreferenceId)
      const channelLabel =
        result.meta.channel === 'api'
          ? 'API'
          : result.meta.channel === 'hybrid'
            ? 'API+详情'
            : 'DOM'
      const partialHint = result.meta.partial ? '（部分详情未补全）' : ''
      setMessage(`已抓取 ${result.jobs.length} 条岗位 · ${channelLabel}${partialHint}`)

      const updatedBatches = await loadBatches()
      const batchId = result.meta.batchId ?? updatedBatches[0]?.id
      if (batchId) {
        await loadBatchJobs(batchId, 1)
      }

      const nextStatus = await zhisudaClient.platform.getStatus()
      setStatus(nextStatus)
    } catch (err: unknown) {
      showError(err)
    } finally {
      setBusyAction(null)
    }
  }

  const handleBatchChange = async (batchId: string): Promise<void> => {
    if (!batchId) return
    clearFeedback()
    try {
      await loadBatchJobs(batchId, 1)
    } catch (err: unknown) {
      showError(err)
    }
  }

  const handleJobPageChange = async (nextPage: number): Promise<void> => {
    if (!selectedBatchId || nextPage < 1 || nextPage > totalPages) return
    try {
      await loadBatchJobs(selectedBatchId, nextPage)
    } catch (err: unknown) {
      showError(err)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">正在加载 Boss 平台状态…</p>
  }

  const singlePreference = preferences.length === 1

  return (
    <section
      className="max-w-2xl space-y-6"
      style={{ paddingBottom: viewExpanded ? DEFAULT_BOSS_VIEW_HEIGHT + 24 : 0 }}
    >
      <div>
        <h2 className="text-2xl font-semibold text-white">Boss 岗位</h2>
        <p className="mt-1 text-sm text-slate-400">
          选择求职偏好后抓取，结果按批次永久保存（保留 7 天）。Boss WebView 在窗口底部。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              status?.loggedIn
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {status?.loggedIn ? '已登录' : '未登录'}
          </span>
          {status?.lastLoginAt && (
            <span className="text-xs text-slate-500">最近登录：{status.lastLoginAt}</span>
          )}
          <button
            type="button"
            onClick={() => void handleTogglePanel()}
            disabled={busyAction !== null}
            className="ml-auto rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {viewExpanded ? '收起 Boss 面板' : '展开 Boss 面板'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm text-slate-300">
            抓取条件（求职偏好）
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={selectedPreferenceId}
              disabled={singlePreference || busyAction !== null || preferences.length === 0}
              onChange={(event) => setSelectedPreferenceId(event.target.value)}
            >
              {preferences.length === 0 ? (
                <option value="">请先在「求职偏好」页创建</option>
              ) : (
                preferences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={busyAction !== null}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === 'login' ? '打开中…' : '打开 Boss 登录'}
          </button>
          <button
            type="button"
            onClick={() => void handleCheckLogin()}
            disabled={busyAction !== null}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === 'check' ? '检测中…' : '检测登录状态'}
          </button>
          <button
            type="button"
            onClick={() => void handleExportSnapshot()}
            disabled={busyAction !== null}
            className="rounded-lg border border-amber-700 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === 'snapshot' ? '导出中…' : '导出页面结构'}
          </button>
          <button
            type="button"
            onClick={() => void handleFetchJobs()}
            disabled={busyAction !== null || preferences.length === 0}
            className="rounded-lg border border-emerald-700 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === 'fetch' ? '抓取中…' : '抓取岗位列表'}
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}
        {error && (
          <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/30 p-3">
            {errorCode && (
              <p className="text-xs font-medium text-red-300">
                {errorCode} · {PLATFORM_ERROR_LABELS[errorCode]}
              </p>
            )}
            <p className="mt-1 text-sm text-red-400">{error}</p>
            {errorCode === 'RATE_LIMIT' && (
              <p className="mt-2 text-xs text-slate-400">
                请在底部 Boss 面板中完成验证，并等待 2 分钟后再抓取。
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium text-white">岗位列表</h3>
            {activeBatch && (
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                <p>
                  抓取条件：<span className="text-slate-200">{activeBatch.conditionsLabel}</span>
                </p>
                <p>
                  抓取时间：<span className="text-slate-200">{activeBatch.fetchedAt}</span>
                  {fetchChannel ? ` · ${fetchChannel}` : ''}
                </p>
              </div>
            )}
          </div>

          {batches.length > 0 && (
            <label className="text-xs text-slate-400">
              历史批次
              <select
                className="mt-1 block min-w-48 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
                value={selectedBatchId}
                onChange={(event) => void handleBatchChange(event.target.value)}
              >
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.conditionsLabel} · {batch.fetchedAt} ({batch.jobCount})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            登录并选择偏好后点击「抓取岗位列表」。切换页面后将从数据库恢复最近批次。
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {jobs.map((job) => (
                <li
                  key={`${job.id}-${job.jobUrl}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{job.title}</p>
                    <p className="text-emerald-300">{job.salary}</p>
                  </div>
                  <p className="mt-1 text-slate-400">
                    {job.companyName}
                    {job.city ? ` · ${job.city}` : ''}
                    {job.companyScale ? ` · ${job.companyScale}` : ''}
                    {job.isOutsource ? ' · 外包' : ''}
                  </p>
                  {job.benefits && job.benefits.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">{job.benefits.join(' · ')}</p>
                  )}
                  {job.responsibilities && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{job.responsibilities}</p>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
              <span>
                共 {jobTotal} 条 · 第 {jobPage}/{totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={jobPage <= 1}
                  onClick={() => void handleJobPageChange(jobPage - 1)}
                  className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={jobPage >= totalPages}
                  onClick={() => void handleJobPageChange(jobPage + 1)}
                  className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
