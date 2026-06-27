import { useState } from 'react'
import type { UserProfile } from '@shared/types/user'
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
