#!/usr/bin/env node
/**
 * 将 docs/boss-dom/seed-profile-v1.json 导入本地 SQLite。
 * 用法：node tools/boss-explorer/import-profile.mjs [userDataDir]
 */
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const projectRoot = join(import.meta.dirname, '..', '..')
const seedPath = join(projectRoot, 'docs/boss-dom/seed-profile-v1.json')

function resolveDbPath(userDataArg) {
  if (userDataArg) {
    return join(userDataArg, 'zhisuda.db')
  }
  if (process.platform === 'win32' && process.env.APPDATA) {
    return join(process.env.APPDATA, 'zhisuda-desktop', 'zhisuda.db')
  }
  return join(homedir(), 'Library/Application Support/zhisuda-desktop/zhisuda.db')
}

function runMigrations(db) {
  const migrationPath = join(projectRoot, 'src/main/db/migrations/004_platform_profiles.sql')
  if (existsSync(migrationPath)) {
    db.exec(readFileSync(migrationPath, 'utf-8'))
  }
}

const userDataArg = process.argv[2]
const dbPath = resolveDbPath(userDataArg)

if (!existsSync(seedPath)) {
  console.error('未找到 seed 文件:', seedPath)
  process.exit(1)
}

if (!existsSync(dbPath)) {
  console.error('未找到数据库:', dbPath)
  console.error('请先运行一次应用，或传入 userData 目录')
  process.exit(1)
}

const seed = JSON.parse(readFileSync(seedPath, 'utf-8'))
const db = new Database(dbPath)
runMigrations(db)

const deactivate = db.prepare(
  `UPDATE platform_page_profiles SET is_active = 0 WHERE platform = ? AND page_type = ?`
)
const insert = db.prepare(
  `INSERT INTO platform_page_profiles (
    id, platform, page_type, version, url_pattern, dom_fingerprint, api_fingerprint,
    recipe_json, is_active, captured_at, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?)`
)

const tx = db.transaction(() => {
  for (const profile of seed.profiles) {
    deactivate.run(seed.platform, profile.pageType)
    insert.run(
      randomUUID(),
      seed.platform,
      profile.pageType,
      profile.version,
      profile.urlPattern,
      profile.domFingerprint ?? null,
      profile.apiFingerprint ?? null,
      JSON.stringify(profile.recipe),
      profile.notes ?? null
    )
  }
})

tx()
db.close()

console.log(`已导入 ${seed.profiles.length} 条 PageProfile → ${dbPath}`)
