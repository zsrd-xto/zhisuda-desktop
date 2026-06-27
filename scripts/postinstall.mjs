import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

try {
  execSync('electron-builder install-app-deps', { cwd: root, stdio: 'inherit' })
} catch {
  console.warn('[postinstall] electron-builder rebuild failed, falling back to prebuild-install')
  execSync('node scripts/ensure-electron-native.mjs', { cwd: root, stdio: 'inherit' })
}
