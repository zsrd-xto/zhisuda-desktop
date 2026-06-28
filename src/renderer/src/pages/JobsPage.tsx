import { useEffect, useState } from 'react'
import { DEFAULT_BOSS_VIEW_HEIGHT } from '@shared/types/platform'
import type { JobDetail, PlatformLoginStatus } from '@shared/types/platform'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'

export function JobsPage(): React.JSX.Element {
  const [status, setStatus] = useState<PlatformLoginStatus | null>(null)
  const [jobs, setJobs] = useState<JobDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [viewExpanded, setViewExpanded] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    const loadStatus = async (): Promise<void> => {
      try {
        const [current, layout] = await Promise.all([
          zhisudaClient.platform.getStatus(),
          zhisudaClient.platform.getViewLayout()
        ])
        if (!cancelled) {
          setStatus(current)
          setViewExpanded(layout.expanded)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const text = err instanceof Error ? err.message : '加载平台状态失败'
          setError(text)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStatus()

    return () => {
      cancelled = true
      void zhisudaClient.platform.hideView()
    }
  }, [])

  const handleTogglePanel = async (): Promise<void> => {
    setError(null)
    await setPanelExpanded(!viewExpanded)
  }

  const handleLogin = async (): Promise<void> => {
    setBusyAction('login')
    setError(null)
    setMessage(null)

    try {
      await setPanelExpanded(true)
      const nextStatus = await zhisudaClient.platform.login()
      setStatus(nextStatus)
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '打开 Boss 登录失败'
      setError(text)
    } finally {
      setBusyAction(null)
    }
  }

  const handleCheckLogin = async (): Promise<void> => {
    setBusyAction('check')
    setError(null)
    setMessage(null)

    try {
      const nextStatus = await zhisudaClient.platform.checkLogin()
      setStatus(nextStatus)
      setMessage(nextStatus.loggedIn ? '已检测到 Boss 登录状态' : '当前未登录')
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '检测登录状态失败'
      setError(text)
    } finally {
      setBusyAction(null)
    }
  }

  const handleExportSnapshot = async (): Promise<void> => {
    setBusyAction('snapshot')
    setError(null)
    setMessage(null)

    try {
      await setPanelExpanded(true)
      const result = await zhisudaClient.platform.debugSnapshot()
      setMessage(`页面结构已导出：${result.filePath}`)
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '导出页面结构失败'
      setError(text)
    } finally {
      setBusyAction(null)
    }
  }

  const handleFetchJobs = async (): Promise<void> => {
    setBusyAction('fetch')
    setError(null)
    setMessage(null)

    try {
      await setPanelExpanded(true)
      const result = await zhisudaClient.platform.fetchJobs()
      setJobs(result.jobs)
      setFetchedAt(result.fetchedAt)
      setMessage(`已抓取 ${result.jobs.length} 条岗位`)
      const nextStatus = await zhisudaClient.platform.getStatus()
      setStatus(nextStatus)
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '抓取岗位失败'
      setError(text)
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">正在加载 Boss 平台状态…</p>
  }

  return (
    <section
      className="max-w-2xl space-y-6"
      style={{ paddingBottom: viewExpanded ? DEFAULT_BOSS_VIEW_HEIGHT + 24 : 0 }}
    >
      <div>
        <h2 className="text-2xl font-semibold text-white">Boss 岗位</h2>
        <p className="mt-1 text-sm text-slate-400">
          Boss 直聘 WebView 在窗口底部。登录后可用「导出页面结构」采样 DOM/API（无需 F12），文件保存在用户数据目录。
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
            disabled={busyAction !== null}
            className="rounded-lg border border-emerald-700 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === 'fetch' ? '抓取中…' : '抓取岗位列表'}
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-white">岗位列表</h3>
          <span className="text-xs text-slate-500">
            {fetchedAt ? `更新时间：${fetchedAt}` : '尚未抓取'}
          </span>
        </div>

        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            登录后点击「抓取岗位列表」，最多返回 100 条。抓取时会自动展开底部面板。
          </p>
        ) : (
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
                  {job.isOutsource ? ' · 外包' : ''}
                </p>
                {job.responsibilities && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{job.responsibilities}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
