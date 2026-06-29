import { useEffect, useState } from 'react'
import type { UpdaterStatusEvent } from '@shared/types/updater'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'

export function UpdateBanner(): React.JSX.Element | null {
  const [status, setStatus] = useState<UpdaterStatusEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    return zhisudaClient.updater.onStatus((event) => {
      if (event.phase === 'available' || event.phase === 'downloaded') {
        setStatus(event)
        setDismissed(false)
      }
    })
  }, [])

  if (!status || dismissed) {
    return null
  }

  const version = status.updateInfo?.version

  const handleUpdate = async (): Promise<void> => {
    if (status.phase === 'downloaded') {
      await zhisudaClient.updater.install()
      return
    }

    if (version) {
      await zhisudaClient.updater.download()
    }
  }

  const handleSkip = async (): Promise<void> => {
    if (version) {
      await zhisudaClient.updater.skipVersion(version)
    }
    setDismissed(true)
  }

  return (
    <div className="border-b border-emerald-500/30 bg-emerald-950/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <p className="text-sm text-emerald-100">
          {status.phase === 'downloaded'
            ? `新版本 v${version} 已下载，重启后即可安装`
            : `发现新版本 v${version}，是否立即更新？`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleUpdate()}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            {status.phase === 'downloaded' ? '重启并安装' : '立即更新'}
          </button>
          {status.phase === 'available' && version && (
            <button
              type="button"
              onClick={() => void handleSkip()}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              跳过此版本
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  )
}
