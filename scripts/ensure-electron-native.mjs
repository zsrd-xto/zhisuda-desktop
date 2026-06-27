import { execSync } from 'child_process'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronVersion = require('electron/package.json').version
const betterSqlite3Dir = join(root, 'node_modules', 'better-sqlite3')

execSync(
  `npx prebuild-install --runtime electron --target ${electronVersion} --arch x64`,
  { cwd: betterSqlite3Dir, stdio: 'inherit' }
)

console.log(`better-sqlite3 ready for Electron ${electronVersion}`)
