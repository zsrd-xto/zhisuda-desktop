import { test as base, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { createRequire } from 'module'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const require = createRequire(import.meta.url)
const electronPath = require('electron') as string
const projectRoot = join(import.meta.dirname, '..', '..')

type ElectronFixtures = {
  electronApp: ElectronApplication
  page: Page
  userDataDir: string
}

export const test = base.extend<ElectronFixtures>({
  userDataDir: async ({}, use) => {
    const dir = mkdtempSync(join(tmpdir(), 'zhisuda-e2e-'))
    await use(dir)
    rmSync(dir, { recursive: true, force: true })
  },
  electronApp: async ({ userDataDir }, use) => {
    const app = await electron.launch({
      executablePath: electronPath,
      args: [projectRoot],
      env: {
        ...process.env,
        ZHISUDA_E2E: '1',
        ZHISUDA_USER_DATA: userDataDir,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
      }
    })

    await use(app)
    await app.close()
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible()
    await use(page)
  }
})

export { expect }
