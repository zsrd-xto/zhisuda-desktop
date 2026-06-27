import { useCallback, useEffect, useRef, useState } from 'react'
import type { Resume, ResumeParsedData } from '@shared/types/resume'
import { createEmptyResumeParsedData } from '@shared/types/resume'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'
import { ResumeEditor } from '@renderer/components/ResumeEditor'
import { ResumePreview } from '@renderer/components/ResumePreview'

interface ResumePageProps {
  refreshKey: number
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ResumePage({ refreshKey }: ResumePageProps): React.JSX.Element {
  const [resume, setResume] = useState<Resume | null>(null)
  const [parsedData, setParsedData] = useState<ResumeParsedData>(createEmptyResumeParsedData())
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parsedDataRef = useRef(parsedData)
  const dirtyRef = useRef(false)

  useEffect(() => {
    parsedDataRef.current = parsedData
  }, [parsedData])

  const saveResume = useCallback(async (): Promise<void> => {
    if (!dirtyRef.current) {
      return
    }

    setSaveState('saving')

    try {
      const updated = await zhisudaClient.resume.update(parsedDataRef.current)
      setResume(updated)
      dirtyRef.current = false
      setSaveState('saved')
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '保存失败'
      setError(text)
      setSaveState('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadResume = async (): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        const current = await zhisudaClient.resume.get()
        if (cancelled) {
          return
        }

        setResume(current)
        setParsedData(current?.parsedData ?? createEmptyResumeParsedData())
        dirtyRef.current = false
        setSaveState('idle')
      } catch (err: unknown) {
        if (!cancelled) {
          const text = err instanceof Error ? err.message : '加载简历失败'
          setError(text)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadResume()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    const intervalId = setInterval(() => {
      void saveResume()
    }, 30_000)

    return () => {
      clearInterval(intervalId)
    }
  }, [saveResume])

  const handleParsedDataChange = (next: ResumeParsedData): void => {
    setParsedData(next)
    dirtyRef.current = true
    setSaveState('idle')

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      void saveResume()
    }, 1000)
  }

  const handleUpload = async (): Promise<void> => {
    setUploading(true)
    setError(null)

    try {
      const uploaded = await zhisudaClient.resume.upload()
      if (uploaded) {
        setResume(uploaded)
        setParsedData(uploaded.parsedData)
        dirtyRef.current = false
        setSaveState('saved')
      }
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '上传失败'
      setError(text)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">正在加载简历…</p>
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">简历管理</h2>
          <p className="mt-1 text-sm text-slate-400">
            上传 PDF / Word 简历，解析后可在线编辑，自动保存。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={uploading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? '解析中…' : '上传简历'}
          </button>
          <span className="text-xs text-slate-500">
            {saveState === 'saving' && '保存中…'}
            {saveState === 'saved' && '已自动保存'}
            {saveState === 'error' && '保存失败'}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!resume && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
          <p className="text-slate-300">还没有简历，点击「上传简历」开始。</p>
          <p className="mt-2 text-sm text-slate-500">仅支持 PDF 和 Word 格式</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ResumeEditor parsedData={parsedData} onChange={handleParsedDataChange} />
        <ResumePreview parsedData={parsedData} fileName={resume?.name} />
      </div>
    </section>
  )
}
