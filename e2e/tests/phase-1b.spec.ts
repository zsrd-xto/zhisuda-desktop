import { test, expect } from '../fixtures/electron-app'
import type { JobPreferences } from '../../src/shared/types/preferences'
import type { PlatformLoginStatus } from '../../src/shared/types/platform'

test.describe('Phase 1b — 偏好与 Boss', () => {
  test('求职偏好可保存并持久化', async ({ page }) => {
    await page.getByRole('button', { name: '求职偏好' }).click()
    await expect(page.getByRole('heading', { name: '求职偏好' })).toBeVisible()

    await page.getByPlaceholder('前端开发，全栈工程师').fill('前端开发')
    await page.getByPlaceholder('北京，上海，杭州').fill('北京')
    await page.getByPlaceholder('外包，销售，驻场').fill('外包')

    const salaryInputs = page.locator('input[type="number"]')
    await salaryInputs.nth(0).fill('20')
    await salaryInputs.nth(1).fill('30')

    await page.getByRole('button', { name: '保存偏好' }).click()
    await expect(page.getByText('求职偏好已保存')).toBeVisible()

    const saved = (await page.evaluate(async () => {
      return window.zhisuda.invoke('preferences:get')
    })) as JobPreferences

    expect(saved.targetPositions).toContain('前端开发')
    expect(saved.targetCities).toContain('北京')
    expect(saved.salaryMin).toBe(20)
    expect(saved.salaryMax).toBe(30)
    expect(saved.excludeKeywords).toContain('外包')
  })

  test('Boss 平台初始状态为未登录', async ({ page }) => {
    const status = (await page.evaluate(async () => {
      return window.zhisuda.invoke('platform:getStatus')
    })) as PlatformLoginStatus

    expect(status.platform).toBe('boss')
    expect(status.loggedIn).toBe(false)
  })

  test('Boss 岗位页可打开', async ({ page }) => {
    await page.getByRole('button', { name: 'Boss 岗位' }).click()
    await expect(page.getByRole('heading', { name: 'Boss 岗位' })).toBeVisible()
    await expect(page.getByRole('button', { name: '打开 Boss 登录' })).toBeVisible()
    await expect(page.getByRole('button', { name: '展开 Boss 面板' })).toBeVisible()
  })
})
