import { useEffect, useState } from 'react'
import type { JobPreference, JobPreferenceInput } from '@shared/types/preferences'
import {
  buildPreferenceName,
  createDefaultPreferenceInput,
  joinCommaSeparatedList,
  parseCommaSeparatedList,
  PRESET_EXCLUDE_KEYWORDS
} from '@shared/types/preferences'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'
import { FILTER_RULE_LINES, RulesInfoBanner } from '@renderer/components/RulesInfoBanner'

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2'

function mergeLegacyExcludeKeywords(preference: JobPreference): string[] {
  const keywords = [...preference.excludeKeywords]
  if (preference.excludeOutsource && !keywords.some((k) => /外包|外派/.test(k))) {
    keywords.push('外包')
  }
  return keywords
}

function preferenceToForm(preference: JobPreference): JobPreferenceInput {
  return {
    id: preference.id,
    targetPosition: preference.targetPosition,
    titleMatchThreshold: preference.titleMatchThreshold,
    targetCity: preference.targetCity,
    salaryMin: preference.salaryMin,
    salaryMax: preference.salaryMax,
    industries: preference.industries,
    companySizes: preference.companySizes,
    requireInsurance: preference.requireInsurance,
    requireWeekendOff: preference.requireWeekendOff,
    blacklistCompanies: preference.blacklistCompanies,
    excludeKeywords: mergeLegacyExcludeKeywords(preference),
    responsibilityKeywords: preference.responsibilityKeywords
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

  const togglePresetExcludeKeyword = (keyword: string, checked: boolean): void => {
    setForm((prev) => {
      const next = new Set(prev.excludeKeywords)
      if (checked) {
        next.add(keyword)
      } else {
        next.delete(keyword)
      }
      return { ...prev, excludeKeywords: [...next] }
    })
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

        <RulesInfoBanner title="筛选规则" lines={FILTER_RULE_LINES} />

        <div className="grid gap-4 sm:grid-cols-2">
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
            <span
              className="text-slate-300"
              title="岗位名称 Jaccard 相似度低于此值的岗位将被过滤"
            >
              名称匹配阈值 (%)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={form.titleMatchThreshold ?? 20}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  titleMatchThreshold: event.target.value
                    ? Math.min(100, Math.max(0, Number(event.target.value)))
                    : 0
                }))
              }
            />
          </label>
        </div>

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
          <span className="text-slate-300">岗位职责关键词</span>
          <input
            className={inputClass}
            placeholder="大模型，RAG，Agent，Python"
            value={joinCommaSeparatedList(form.responsibilityKeywords)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                responsibilityKeywords: parseCommaSeparatedList(event.target.value)
              }))
            }
          />
          <p className="text-xs text-slate-500">多个关键词用逗号分隔，用于 Boss 岗位页公司打分（每命中 +10 分）</p>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">黑名单公司</span>
          <input
            className={inputClass}
            placeholder="某公司，另一家公司"
            value={joinCommaSeparatedList(form.blacklistCompanies)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                blacklistCompanies: parseCommaSeparatedList(event.target.value)
              }))
            }
          />
          <p className="text-xs text-slate-500">多个公司名称用逗号分隔，命中即硬过滤</p>
        </label>

        <div className="space-y-2 text-sm">
          <span className="text-slate-300">排除关键词</span>
          <div className="flex flex-wrap gap-3">
            {PRESET_EXCLUDE_KEYWORDS.map((keyword) => (
              <label key={keyword} className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={form.excludeKeywords.includes(keyword)}
                  onChange={(event) => togglePresetExcludeKeyword(keyword, event.target.checked)}
                />
                {keyword}
              </label>
            ))}
          </div>
          <input
            className={inputClass}
            placeholder="可自定义，如：外派，实习"
            value={joinCommaSeparatedList(form.excludeKeywords)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                excludeKeywords: parseCommaSeparatedList(event.target.value)
              }))
            }
          />
          <p className="text-xs text-slate-500">
            勾选快捷项会自动追加到文本框；岗位标题、公司名或职责描述含任一关键词即硬过滤
          </p>
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
