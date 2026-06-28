import { test as base, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { join } from 'path'

const require = createRequire(import.meta.url)
const electronPath = require('electron') as string
const projectRoot = join(import.meta.dirname, '..', '..')

function resolveRealUserDataDir(): string {
  if (process.env.ZHISUDA_E2E_USER_DATA) {
    return process.env.ZHISUDA_E2E_USER_DATA
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    return join(process.env.APPDATA, 'zhisuda-desktop')
  }

  return join(homedir(), 'Library', 'Application Support', 'zhisuda-desktop')
}

type ElectronFixtures = {
  electronApp: ElectronApplication
  page: Page
  userDataDir: string
}

export const test = base.extend<ElectronFixtures>({
  userDataDir: async ({}, use) => {
    const dir = resolveRealUserDataDir()
    if (!existsSync(dir)) {
      throw new Error(`未找到用户数据目录：${dir}，请先在本机完成 Boss 登录`)
    }
    await use(dir)
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
