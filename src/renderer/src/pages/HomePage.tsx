import { useState } from 'react'
import type { UserProfile } from '@shared/types/user'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'

interface HomePageProps {
  profile: UserProfile
  onProfileChange: (profile: UserProfile) => void
}

export function HomePage({ profile, onProfileChange }: HomePageProps): React.JSX.Element {
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const updated = await zhisudaClient.user.updateNickname(nickname)
      onProfileChange(updated)
      setMessage('昵称已保存')
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '保存失败'
      setError(text)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">个人中心</h2>
        <p className="mt-1 text-sm text-slate-400">本地账号信息，数据仅保存在本机。</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <dl className="space-y-4 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-slate-400">用户 ID</dt>
            <dd className="font-mono text-slate-200">{profile.id}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-slate-400">设备 ID</dt>
            <dd className="font-mono text-slate-200">{profile.deviceId}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-slate-400">创建时间</dt>
            <dd className="text-slate-200">{profile.createdAt}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block text-sm font-medium text-white" htmlFor="nickname">
          昵称
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="设置你的昵称"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存昵称'}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </section>
  )
}
