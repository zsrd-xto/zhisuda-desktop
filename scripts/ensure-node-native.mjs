import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { rmSync } from 'fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const binding = join(root, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')

rmSync(binding, { force: true })
execSync('npm rebuild better-sqlite3', { cwd: root, stdio: 'inherit' })

console.log('better-sqlite3 ready for Node.js')
