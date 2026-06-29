interface RulesInfoBannerProps {
  title: string
  lines: string[]
}

export function RulesInfoBanner({ title, lines }: RulesInfoBannerProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs leading-relaxed text-red-400">
      <p className="font-medium">{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-1">
          {line}
        </p>
      ))}
    </div>
  )
}

export const FILTER_RULE_LINES = [
  '岗位名：与抓取岗位名称做 Jaccard 相似度比对，≥ 名称匹配阈值则通过（默认 20%）',
  '城市：不参与筛选（搜索 API 已按城市限定）',
  '薪资：岗位薪资下限 ≥ 抓取薪资下限则通过',
  '黑名单公司、排除关键词：标题/公司/职责命中则直接过滤'
]

export const COMPANY_SCORE_RULE_LINES = [
  '岗位职责关键词：每命中 1 个 +10 分',
  '公司规模：20人以下 -10 分，20~100人 +10 分，100人以上 +20 分',
  '注册资本：10万元以下 -10 分，10~100万元 +10 分，100万元以上 +20 分',
  '公司福利：标明五险一金 +10 分，标明双休 +10 分，标明包吃/包住 +20 分'
]

interface RulesInfoTooltipProps {
  title: string
  lines: string[]
}

export function RulesInfoTooltip({ title, lines }: RulesInfoTooltipProps): React.JSX.Element {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        aria-label={title}
      >
        i
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-72 -translate-x-1/2 rounded-lg border border-red-900/60 bg-red-950/95 px-3 py-2 text-left text-xs leading-relaxed text-red-400 shadow-lg group-hover:block group-focus-within:block"
      >
        <p className="font-medium">{title}</p>
        {lines.map((line) => (
          <p key={line} className="mt-1">
            {line}
          </p>
        ))}
      </div>
    </span>
  )
}
