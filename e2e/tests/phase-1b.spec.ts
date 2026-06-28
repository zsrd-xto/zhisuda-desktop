import { test, expect } from '../fixtures/electron-app'

test.describe('Phase 1b — 偏好与 Boss', () => {
  test('求职偏好可保存多条并持久化', async ({ page }) => {
    await page.getByRole('button', { name: '求职偏好' }).click()
    await expect(page.getByRole('heading', { name: '求职偏好' })).toBeVisible()

    await page.getByRole('button', { name: '新增偏好' }).click()
    await page.getByPlaceholder('AI应用开发').fill('AI应用开发')
    await page.getByPlaceholder('深圳').fill('深圳')

    const salaryInputs = page.locator('input[type="number"]')
    await salaryInputs.nth(0).fill('20')
    await salaryInputs.nth(1).fill('25')

    await page.getByRole('button', { name: '保存偏好' }).click()
    await expect(page.getByText('已保存：AI应用开发·深圳·20-25K')).toBeVisible()

    const saved = (await page.evaluate(async () => {
      return window.zhisuda.invoke('preferences:list')
    })) as Array<{ name: string; targetPosition: string; targetCity: string }>

    expect(saved.length).toBeGreaterThanOrEqual(1)
    expect(saved[0].name).toContain('AI应用开发')
    expect(saved[0].targetCity).toBe('深圳')
  })

  test('Boss 平台初始状态为未登录', async ({ page }) => {
    const status = (await page.evaluate(async () => {
      return window.zhisuda.invoke('platform:getStatus')
    })) as { platform: string; loggedIn: boolean }

    expect(status.platform).toBe('boss')
    expect(status.loggedIn).toBe(false)
  })

  test('Boss 岗位页可打开并加载偏好选择', async ({ page }) => {
    await page.getByRole('button', { name: 'Boss 岗位' }).click()
    await expect(page.getByRole('heading', { name: 'Boss 岗位' })).toBeVisible()
    await expect(page.getByRole('button', { name: '打开 Boss 登录' })).toBeVisible()
    await expect(page.getByText('抓取条件（求职偏好）')).toBeVisible()
  })
})
