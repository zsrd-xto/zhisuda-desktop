import { join } from 'path'
import { test, expect } from '../fixtures/electron-app'
import type { Resume } from '../../src/shared/types/resume'

const sampleResumePath = join(import.meta.dirname, '..', 'fixtures', 'sample-resume.pdf')

test.describe('Phase 1a — 基础数据', () => {
  test('首次启动自动创建本地用户', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible()
    await expect(page.getByText('用户 ID')).toBeVisible()
    await expect(page.getByText('设备 ID')).toBeVisible()
  })

  test('昵称可保存', async ({ page }) => {
    await page.getByLabel('昵称').fill('E2E测试用户')
    await page.getByRole('button', { name: '保存昵称' }).click()
    await expect(page.getByText('昵称已保存')).toBeVisible()
    await expect(page.getByLabel('昵称')).toHaveValue('E2E测试用户')
  })

  test('简历上传解析与预览', async ({ page }) => {
    await page.getByRole('button', { name: '简历管理' }).click()
    await expect(page.getByRole('heading', { name: '简历管理' })).toBeVisible()

    const uploaded = (await page.evaluate(async (filePath) => {
      return window.zhisuda.invoke('resume:uploadFromPath', filePath)
    }, sampleResumePath)) as Resume | null

    expect(uploaded).not.toBeNull()
    expect(uploaded?.parsedData.basicInfo.name).toBeTruthy()

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: '简历管理' }).click()

    await expect(page.getByText('Zhang San')).toBeVisible()
    await expect(page.getByText('zhangsan@example.com')).toBeVisible()
  })

  test('清除所有数据后重建账号', async ({ page }) => {
    const userIdBefore = await page.evaluate(async () => {
      const profile = await window.zhisuda.invoke('user:getProfile')
      return profile.id
    })

    await page.getByRole('button', { name: '设置' }).click()
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()

    page.once('dialog', (dialog) => {
      void dialog.accept()
    })
    await page.getByRole('button', { name: '清除所有数据' }).click()

    await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible()

    const userIdAfter = await page.evaluate(async () => {
      const profile = await window.zhisuda.invoke('user:getProfile')
      return profile.id
    })

    expect(userIdAfter).not.toBe(userIdBefore)
  })
})
