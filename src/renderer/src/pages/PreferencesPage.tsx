import { useEffect, useState } from 'react'
import type { JobPreference, JobPreferenceInput } from '@shared/types/preferences'
import {
  buildPreferenceName,
  createDefaultPreferenceInput
} from '@shared/types/preferences'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2'

function preferenceToForm(preference: JobPreference): JobPreferenceInput {
  return {
    id: preference.id,
    targetPosition: preference.targetPosition,
    targetCity: preference.targetCity,
    salaryMin: preference.salaryMin,
    salaryMax: preference.salaryMax,
    industries: preference.industries,
    companySizes: preference.companySizes,
    requireInsurance: preference.requireInsurance,
    requireWeekendOff: preference.requireWeekendOff,
    excludeOutsource: preference.excludeOutsource,
    blacklistCompanies: preference.blacklistCompanies,
    excludeKeywords: preference.excludeKeywords
  }
}

export function PreferencesPage(): React.JSX.Element {
  const [preferences, setPreferences] = useState<JobPreference[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<JobPreferenceInput>(createDefaultPreferenceInput())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPreferences = async (): Promise<void> => {
    const items = await zhisudaClient.preferences.list()
    setPreferences(items)
  }

  useEffect(() => {
    let cancelled = false

    zhisudaClient.preferences
      .list()
      .then((items) => {
        if (!cancelled) {
          setPreferences(items)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const text = err instanceof Error ? err.message : '加载求职偏好失败'
          setError(text)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const resetForm = (): void => {
    setEditingId(null)
    setForm(createDefaultPreferenceInput())
  }

  const handleEdit = (preference: JobPreference): void => {
    setEditingId(preference.id)
    setForm(preferenceToForm(preference))
    setMessage(null)
    setError(null)
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const saved = await zhisudaClient.preferences.save({
        ...form,
        id: editingId ?? undefined
      })
      await loadPreferences()
      setEditingId(saved.id)
      setForm(preferenceToForm(saved))
      setMessage(`已保存：${saved.name}`)
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '保存失败'
      setError(text)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (preferenceId: string): Promise<void> => {
    setError(null)
    setMessage(null)

    try {
      await zhisudaClient.preferences.delete(preferenceId)
      await loadPreferences()
      if (editingId === preferenceId) {
        resetForm()
      }
      setMessage('已删除求职偏好')
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '删除失败'
      setError(text)
    }
  }

  const previewName =
    form.targetPosition && form.targetCity && form.salaryMin > 0 && form.salaryMax > 0
      ? buildPreferenceName(form.targetPosition, form.targetCity, form.salaryMin, form.salaryMax)
      : '填写岗位、城市与薪资后自动生成'

  if (loading) {
    return <p className="text-sm text-slate-400">正在加载求职偏好…</p>
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">求职偏好</h2>
          <p className="mt-1 text-sm text-slate-400">
            可保存多条偏好，名称格式：岗位·城市·薪资。抓取岗位时选择对应偏好作为条件。
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          新增偏好
        </button>
      </div>

      {preferences.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-medium text-slate-300">已保存的偏好</h3>
          <ul className="space-y-2">
            {preferences.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
              >
                <span className="text-white">{item.name}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs text-slate-500">名称预览：{previewName}</p>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">目标岗位 *</span>
          <input
            className={inputClass}
            placeholder="AI应用开发"
            value={form.targetPosition}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, targetPosition: event.target.value.trim() }))
            }
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">目标城市 *</span>
          <input
            className={inputClass}
            placeholder="深圳"
            value={form.targetCity}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, targetCity: event.target.value.trim() }))
            }
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">薪资下限 (K) *</span>
            <input
              type="number"
              className={inputClass}
              value={form.salaryMin || ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  salaryMin: event.target.value ? Number(event.target.value) : 0
                }))
              }
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">薪资上限 (K) *</span>
            <input
              type="number"
              className={inputClass}
              value={form.salaryMax || ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  salaryMax: event.target.value ? Number(event.target.value) : 0
                }))
              }
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">黑名单公司</span>
          <textarea
            className={`${inputClass} min-h-20`}
            placeholder="每行一个公司名称"
            value={form.blacklistCompanies.join('\n')}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                blacklistCompanies: event.target.value
                  .split('\n')
                  .map((item) => item.trim())
                  .filter(Boolean)
              }))
            }
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">排除关键词</span>
          <input
            className={inputClass}
            placeholder="外包，销售，驻场"
            value={form.excludeKeywords.join('，')}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                excludeKeywords: event.target.value
                  .split(/[,，、]/)
                  .map((item) => item.trim())
                  .filter(Boolean)
              }))
            }
          />
        </label>

        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.excludeOutsource}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, excludeOutsource: event.target.checked }))
              }
            />
            排除外包岗位
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? '保存中…' : editingId ? '更新偏好' : '保存偏好'}
        </button>

        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  )
}
