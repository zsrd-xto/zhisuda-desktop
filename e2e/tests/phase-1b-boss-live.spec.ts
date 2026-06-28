import { test, expect } from '../fixtures/electron-app-real-login'
import type { FetchJobsResult, PlatformLoginStatus } from '../../src/shared/types/platform'

const runLiveBossTests = process.env.ZHISUDA_E2E_REAL_LOGIN === '1'

test.describe('Phase 1b — Boss 实机（已保存登录）', () => {
  test.skip(!runLiveBossTests, '设置 ZHISUDA_E2E_REAL_LOGIN=1 后运行，需本机已登录 Boss')

  test('读取已保存的 Boss 登录状态', async ({ page }) => {
    const status = (await page.evaluate(async () => {
      return window.zhisuda.invoke('platform:checkLogin')
    })) as PlatformLoginStatus

    expect(status.platform).toBe('boss')
    expect(status.loggedIn).toBe(true)
  })

  test('抓取岗位列表返回至少 5 条', async ({ page }) => {
    test.setTimeout(120_000)

    await page.evaluate(async () => {
      await window.zhisuda.invoke('platform:setViewLayout', { expanded: true, height: 420 })
    })

    const result = (await page.evaluate(async () => {
      return window.zhisuda.invoke('platform:fetchJobs')
    })) as FetchJobsResult

    expect(result.platform).toBe('boss')
    expect(result.jobs.length).toBeGreaterThanOrEqual(5)
    expect(result.jobs[0]?.title).toBeTruthy()
    expect(result.fetchedAt).toBeTruthy()
  })

  test('Boss 岗位页 UI 可展开底部面板', async ({ page }) => {
    await page.getByRole('button', { name: 'Boss 岗位' }).click()
    await expect(page.getByRole('heading', { name: 'Boss 岗位' })).toBeVisible()
    await expect(page.getByRole('button', { name: '展开 Boss 面板' })).toBeVisible()

    await page.getByRole('button', { name: '展开 Boss 面板' }).click()
    await expect(page.getByRole('button', { name: '收起 Boss 面板' })).toBeVisible()

    const layout = await page.evaluate(async () => {
      return window.zhisuda.invoke('platform:getViewLayout')
    })

    expect(layout.expanded).toBe(true)
    expect(layout.height).toBeGreaterThan(0)
  })
})
