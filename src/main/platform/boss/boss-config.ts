export const BOSS_PARTITION = 'persist:boss'

export const BOSS_CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const BOSS_LOGIN_URL = 'https://www.zhipin.com/web/user/?ka=header-login'

export const BOSS_JOBS_URL = 'https://www.zhipin.com/web/geek/jobs'

export const BOSS_JOBS_FETCH_LIMIT = 100

export const BOSS_JOBS_PAGE_TIMEOUT_MS = 25_000

export const BOSS_JOBS_POLL_INTERVAL_MS = 500

/** L1 批量投递限制 */
export const BOSS_DELIVERY_LIMIT = {
  maxPerBatch: 10,
  intervalMs: 15_000,
  intervalJitterMs: 15_000
} as const

/** Boss 登录态常见 Cookie */
export const BOSS_LOGIN_COOKIE_NAMES = ['wt2', 'zp_at', 'bst', '__a'] as const

/**
 * 访问频率限制 — Boss 对高频 API 请求敏感，需保守抓取。
 * @see docs/boss-dom/README.md
 */
export const BOSS_RATE_LIMIT = {
  /** 列表分页请求基础间隔 */
  pageIntervalMs: 3000,
  pageIntervalJitterMs: 2000,
  /** 详情请求基础间隔 */
  detailIntervalMs: 4000,
  detailIntervalJitterMs: 3000,
  /** 单次抓取最多翻页数（每页约 15 条，直至凑满匹配岗位或 API 无更多） */
  maxListPagesPerRun: 10,
  /** 单次抓取最多拉取详情数 */
  maxDetailsPerRun: 10,
  /** DOM 滚动间隔 */
  scrollIntervalMs: 2000,
  scrollIntervalJitterMs: 1000,
  /** DOM 兜底最大滚动轮次 */
  maxScrollRounds: 10,
  /** 两次完整抓取最小冷却（毫秒） */
  minRunCooldownMs: 120_000
} as const
