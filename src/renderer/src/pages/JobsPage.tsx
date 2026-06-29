import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_JOB_PAGE_SIZE } from '@shared/types/jobs'
import type { JobFetchBatch } from '@shared/types/jobs'
import type { JobPreference } from '@shared/types/preferences'
import { DEFAULT_BOSS_VIEW_HEIGHT } from '@shared/types/platform'
import type { ExtractChannel, JobDetail, PlatformErrorCode, PlatformLoginStatus } from '@shared/types/platform'
import { COMPANY_SCORE_RULE_LINES, RulesInfoTooltip } from '@renderer/components/RulesInfoBanner'
import { PLATFORM_ERROR_LABELS, zhisudaClient } from '@renderer/lib/zhisuda-client'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2'

const cardClass = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-5'

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
  const [fetchQuery, setFetchQuery] = useState('')
  const [fetchCity, setFetchCity] = useState('')
  const [fetchSalaryMin, setFetchSalaryMin] = useState(0)

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

  useEffect(() => {
    const preference = preferences.find((item) => item.id === selectedPreferenceId)
    if (!preference) return
    setFetchQuery(preference.targetPosition)
    setFetchCity(preference.targetCity)
    setFetchSalaryMin(preference.salaryMin)
  }, [selectedPreferenceId, preferences])

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

    if (!fetchQuery.trim() || !fetchCity.trim() || fetchSalaryMin <= 0) {
      setError('请填写抓取岗位名称、城市与薪资下限')
      return
    }

    setBusyAction('fetch')
    clearFeedback()

    try {
      await setPanelExpanded(true)
      const result = await zhisudaClient.platform.fetchJobs(selectedPreferenceId, {
        query: fetchQuery.trim(),
        city: fetchCity.trim(),
        salaryMin: fetchSalaryMin
      })
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
  const actionDisabled = busyAction !== null

  return (
    <section
      className="flex w-full flex-col gap-4"
      style={{ paddingBottom: viewExpanded ? DEFAULT_BOSS_VIEW_HEIGHT + 24 : 0 }}
    >
      <div>
        <h2 className="text-2xl font-semibold text-white">Boss 岗位</h2>
        <p className="mt-1 text-sm text-slate-400">
          选择求职偏好后抓取，结果按批次保存（保留 7 天）。Boss WebView 在窗口底部。
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${cardClass} flex flex-col gap-4`}>
          <h3 className="text-sm font-medium text-slate-200">抓取设置</h3>

          <label className="block text-sm text-slate-300">
            抓取条件（求职偏好）
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={selectedPreferenceId}
              disabled={singlePreference || actionDisabled || preferences.length === 0}
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

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm text-slate-300">
              岗位名称
              <input
                className={`${inputClass} mt-1`}
                placeholder="AI应用开发"
                value={fetchQuery}
                disabled={actionDisabled}
                onChange={(event) => setFetchQuery(event.target.value.trim())}
              />
            </label>
            <label className="block text-sm text-slate-300">
              城市
              <input
                className={`${inputClass} mt-1`}
                placeholder="深圳"
                value={fetchCity}
                disabled={actionDisabled}
                onChange={(event) => setFetchCity(event.target.value.trim())}
              />
            </label>
            <label className="block text-sm text-slate-300">
              薪资下限 (K)
              <input
                type="number"
                className={`${inputClass} mt-1`}
                value={fetchSalaryMin || ''}
                disabled={actionDisabled}
                onChange={(event) =>
                  setFetchSalaryMin(event.target.value ? Number(event.target.value) : 0)
                }
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleFetchJobs()}
            disabled={actionDisabled || preferences.length === 0}
            className="w-full rounded-lg border border-emerald-700 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === 'fetch' ? '抓取中…' : '抓取岗位列表'}
          </button>
        </div>

        <div className={`${cardClass} flex flex-col gap-4`}>
          <h3 className="text-sm font-medium text-slate-200">Boss 登录</h3>

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
              disabled={actionDisabled}
              className="ml-auto rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {viewExpanded ? '收起 Boss 面板' : '展开 Boss 面板'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={actionDisabled}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'login' ? '打开中…' : '打开 Boss 登录'}
            </button>
            <button
              type="button"
              onClick={() => void handleCheckLogin()}
              disabled={actionDisabled}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'check' ? '检测中…' : '检测登录状态'}
            </button>
            <button
              type="button"
              onClick={() => void handleExportSnapshot()}
              disabled={actionDisabled}
              className="rounded-lg border border-amber-700 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'snapshot' ? '导出中…' : '导出页面结构'}
            </button>
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-3">
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

      <div className={`${cardClass} flex min-h-[min(720px,calc(100vh-22rem))] flex-col`}>
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <h3 className="text-lg font-medium text-white">岗位列表</h3>
          <RulesInfoTooltip title="公司打分规则" lines={COMPANY_SCORE_RULE_LINES} />
        </div>

        <div className="my-[5px] flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-slate-500">抓取条件</span>
            <span className="text-sm text-slate-200">
              {activeBatch?.conditionsLabel ?? '暂无批次'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-slate-500">抓取时间</span>
            <span className="text-sm text-slate-200">
              {activeBatch
                ? `${activeBatch.fetchedAt}${fetchChannel ? ` · ${fetchChannel}` : ''}`
                : '—'}
            </span>
          </div>
          {batches.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-slate-500">历史批次</span>
              <select
                className="min-w-48 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
                value={selectedBatchId}
                onChange={(event) => void handleBatchChange(event.target.value)}
              >
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.conditionsLabel} · {batch.jobCount} 条
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-slate-400">
            登录并选择偏好后点击「抓取岗位列表」。切换页面后将从数据库恢复最近批次。
          </p>
        ) : (
          <>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {jobs.map((job) => (
                <li
                  key={`${job.id}-${job.jobUrl}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{job.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {job.matchScore !== undefined && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                          得分 {job.matchScore}
                        </span>
                      )}
                      <p className="text-emerald-300">{job.salary}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-slate-400">
                    {job.companyName}
                    {job.city ? ` · ${job.city}` : ''}
                    {job.companyScale ? ` · ${job.companyScale}` : ''}
                    {job.isOutsource ? ' · 外包' : ''}
                    {job.hasWeekendOff === true
                      ? ' · 双休'
                      : job.hasWeekendOff === false
                        ? ' · 单休'
                        : ''}
                    {job.hasInsurance === true
                      ? ' · 五险一金'
                      : job.hasInsurance === false
                        ? ' · 无五险'
                        : ''}
                  </p>
                  {job.benefits && job.benefits.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">{job.benefits.join(' · ')}</p>
                  )}
                  {job.responsibilities && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {job.responsibilities}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex shrink-0 items-center justify-between text-sm text-slate-400">
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
