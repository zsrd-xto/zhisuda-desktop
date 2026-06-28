import { BOSS_RATE_LIMIT } from './boss/boss-config'
import { PlatformError } from './platform-error'

export function jitterDelay(baseMs: number, jitterMs: number): number {
  return baseMs + Math.floor(Math.random() * jitterMs)
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForPageInterval(): Promise<void> {
  await sleep(jitterDelay(BOSS_RATE_LIMIT.pageIntervalMs, BOSS_RATE_LIMIT.pageIntervalJitterMs))
}

export async function waitForDetailInterval(): Promise<void> {
  await sleep(jitterDelay(BOSS_RATE_LIMIT.detailIntervalMs, BOSS_RATE_LIMIT.detailIntervalJitterMs))
}

export async function waitForScrollInterval(): Promise<void> {
  await sleep(jitterDelay(BOSS_RATE_LIMIT.scrollIntervalMs, BOSS_RATE_LIMIT.scrollIntervalJitterMs))
}

let lastFullFetchAt = 0

export function assertFetchCooldown(): void {
  const elapsed = Date.now() - lastFullFetchAt
  if (lastFullFetchAt > 0 && elapsed < BOSS_RATE_LIMIT.minRunCooldownMs) {
    const waitSec = Math.ceil((BOSS_RATE_LIMIT.minRunCooldownMs - elapsed) / 1000)
    throw new PlatformError(
      `抓取过于频繁，请 ${waitSec} 秒后再试（避免触发 Boss 风控）`,
      'RATE_LIMIT'
    )
  }
}

export function markFetchCompleted(): void {
  lastFullFetchAt = Date.now()
}

export function resetFetchCooldownForTests(): void {
  lastFullFetchAt = 0
}
