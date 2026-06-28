import { useEffect, useState } from 'react'
import type { JobPreferencesInput } from '@shared/types/preferences'
import { createDefaultPreferencesInput } from '@shared/types/preferences'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2'

function tagsToText(tags: string[]): string {
  return tags.join('，')
}

export function PreferencesPage(): React.JSX.Element {
  const [form, setForm] = useState<JobPreferencesInput>(createDefaultPreferencesInput())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    zhisudaClient.preferences
      .get()
      .then((preferences) => {
        if (!cancelled) {
          setForm({
            targetPositions: preferences.targetPositions,
            targetCities: preferences.targetCities,
            salaryMin: preferences.salaryMin,
            salaryMax: preferences.salaryMax,
            industries: preferences.industries,
            companySizes: preferences.companySizes,
            requireInsurance: preferences.requireInsurance,
            requireWeekendOff: preferences.requireWeekendOff,
            excludeOutsource: preferences.excludeOutsource,
            blacklistCompanies: preferences.blacklistCompanies,
            excludeKeywords: preferences.excludeKeywords
          })
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

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      await zhisudaClient.preferences.save(form)
      setMessage('求职偏好已保存')
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : '保存失败'
      setError(text)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">正在加载求职偏好…</p>
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">求职偏好</h2>
        <p className="mt-1 text-sm text-slate-400">设置目标岗位、城市与薪资范围，用于后续岗位匹配。</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">目标岗位 *</span>
          <input
            className={inputClass}
            placeholder="前端开发，全栈工程师"
            value={tagsToText(form.targetPositions)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                targetPositions: event.target.value
                  .split(/[,，、]/)
                  .map((item) => item.trim())
                  .filter(Boolean)
              }))
            }
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">目标城市 *</span>
          <input
            className={inputClass}
            placeholder="北京，上海，杭州"
            value={tagsToText(form.targetCities)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                targetCities: event.target.value
                  .split(/[,，、]/)
                  .map((item) => item.trim())
                  .filter(Boolean)
              }))
            }
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">薪资下限 (K) *</span>
            <input
              type="number"
              className={inputClass}
              value={form.salaryMin ?? ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  salaryMin: event.target.value ? Number(event.target.value) : null
                }))
              }
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">薪资上限 (K) *</span>
            <input
              type="number"
              className={inputClass}
              value={form.salaryMax ?? ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  salaryMax: event.target.value ? Number(event.target.value) : null
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
            value={tagsToText(form.excludeKeywords)}
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
              checked={form.requireInsurance}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requireInsurance: event.target.checked }))
              }
            />
            必须有五险一金
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.requireWeekendOff}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requireWeekendOff: event.target.checked }))
              }
            />
            必须双休
          </label>
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
          {saving ? '保存中…' : '保存偏好'}
        </button>

        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  )
}
