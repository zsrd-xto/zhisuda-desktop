import { useEffect, useState } from 'react'
import type { UserProfile } from '@shared/types/user'
import type { UpdaterStatusEvent } from '@shared/types/updater'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'

interface SettingsPageProps {
  profile: UserProfile
  onProfileChange: (profile: UserProfile) => void
  onDataCleared: () => void
}

export function SettingsPage({
  profile,
  onProfileChange,
  onDataCleared
}: SettingsPageProps): React.JSX.Element {
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdaterStatusEvent | null>(null)
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    void zhisudaClient.updater.getVersion().then(setAppVersion)
    return zhisudaClient.updater.onStatus((event) => {
      setUpdateStatus(event)
      if (event.phase === 'downloading') {
        setDownloading(true)
      }
      if (event.phase === 'downloaded' || event.phase === 'error' || event.phase === 'not-available') {
        setDownloading(false)
        setChecking(false)
      }
    })
  }, [])

  const handleCheckUpdate = async (): Promise<void> => {
    setChecking(true)
    setUpdateError(null)
    try {
      const result = await zhisudaClient.updater.check()
      setUpdateStatus({
        phase: result.phase === 'available' ? 'available' : result.phase,
        currentVersion: result.currentVersion,
        updateInfo: result.updateInfo,
        message: result.message
      })
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '检查更新失败'
      setUpdateError(text)
    } finally {
      setChecking(false)
    }
  }

  const handleDownload = async (): Promise<void> => {
    setDownloading(true)
    setUpdateError(null)
    try {
      await zhisudaClient.updater.download()
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '下载更新失败'
      setUpdateError(text)
      setDownloading(false)
    }
  }

  const handleInstall = async (): Promise<void> => {
    await zhisudaClient.updater.install()
  }

  const handleSkipVersion = async (): Promise<void> => {
    const version = updateStatus?.updateInfo?.version
    if (!version) {
      return
    }
    await zhisudaClient.updater.skipVersion(version)
    setUpdateStatus({
      phase: 'not-available',
      currentVersion: appVersion,
      message: `已跳过版本 ${version}`
    })
  }

  const handleClearAllData = async (): Promise<void> => {
    const confirmed = window.confirm(
      '确定要清除所有本地数据吗？此操作将删除简历等信息，且不可恢复。'
    )

    if (!confirmed) {
      return
    }

    setClearing(true)
    setError(null)

    try {
      const profileAfterClear = await zhisudaClient.user.clearAllData()
      onProfileChange(profileAfterClear)
      onDataCleared()
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '清除数据失败'
      setError(text)
    } finally {
      setClearing(false)
    }
  }

  const availableVersion = updateStatus?.updateInfo?.version
  const showUpdateActions =
    updateStatus?.phase === 'available' || updateStatus?.phase === 'downloaded'

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">设置</h2>
        <p className="mt-1 text-sm text-slate-400">管理本地数据与隐私相关选项。</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-medium text-white">当前账号</h3>
        <p className="mt-2 text-sm text-slate-400">
          用户 ID：<span className="font-mono text-slate-200">{profile.id}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-medium text-white">应用更新</h3>
        <p className="mt-2 text-sm text-slate-400">
          当前版本：<span className="font-mono text-slate-200">v{appVersion || '…'}</span>
        </p>

        {updateStatus?.message && (
          <p className="mt-2 text-sm text-slate-300">{updateStatus.message}</p>
        )}

        {updateStatus?.phase === 'available' && availableVersion && (
          <p className="mt-2 text-sm text-emerald-300">发现新版本 v{availableVersion}</p>
        )}

        {updateStatus?.phase === 'downloading' && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${updateStatus.progress ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              下载中 {Math.round(updateStatus.progress ?? 0)}%
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCheckUpdate()}
            disabled={checking || downloading}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking ? '检查中…' : '检查更新'}
          </button>

          {showUpdateActions && updateStatus?.phase === 'available' && (
            <>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? '下载中…' : '立即更新'}
              </button>
              <button
                type="button"
                onClick={() => void handleSkipVersion()}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                跳过此版本
              </button>
            </>
          )}

          {updateStatus?.phase === 'downloaded' && (
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
            >
              重启并安装
            </button>
          )}
        </div>
        {updateError && <p className="mt-3 text-sm text-red-400">{updateError}</p>}
      </div>

      <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-6">
        <h3 className="text-lg font-medium text-red-200">危险操作</h3>
        <p className="mt-2 text-sm text-slate-400">
          清除所有数据将删除本地 SQLite 中的用户与简历记录，并重新初始化账号。
        </p>
        <button
          type="button"
          onClick={() => void handleClearAllData()}
          disabled={clearing}
          className="mt-4 rounded-lg border border-red-500/60 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {clearing ? '清除中…' : '清除所有数据'}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </section>
  )
}
