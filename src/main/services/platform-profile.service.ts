import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getDb } from '../db/database'
import type { PageRecipe, PlatformPageProfileRow, SeedProfileFile } from '../platform/types'

const SEED_PATH = join(process.cwd(), 'docs/boss-dom/seed-profile-v1.json')

function mapRow(row: PlatformPageProfileRow): {
  id: string
  platform: string
  pageType: string
  version: string
  recipe: PageRecipe
} {
  return {
    id: row.id,
    platform: row.platform,
    pageType: row.page_type,
    version: row.version,
    recipe: JSON.parse(row.recipe_json) as PageRecipe
  }
}

export function loadSeedFile(): SeedProfileFile {
  const raw = readFileSync(SEED_PATH, 'utf-8')
  return JSON.parse(raw) as SeedProfileFile
}

export function importSeedProfiles(db: Database.Database = getDb()): number {
  const seed = loadSeedFile()
  let imported = 0

  const deactivate = db.prepare(
    `UPDATE platform_page_profiles SET is_active = 0 WHERE platform = ? AND page_type = ?`
  )
  const insert = db.prepare(
    `INSERT INTO platform_page_profiles (
      id, platform, page_type, version, url_pattern, dom_fingerprint, api_fingerprint,
      recipe_json, is_active, captured_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?)`
  )

  const run = db.transaction(() => {
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
      imported += 1
    }
  })

  run()
  return imported
}

export function ensureDefaultProfiles(db: Database.Database = getDb()): void {
  const count = db
    .prepare('SELECT COUNT(*) as c FROM platform_page_profiles WHERE platform = ?')
    .get('boss') as { c: number }

  if (count.c === 0) {
    importSeedProfiles(db)
  }
}

export function getActiveProfile(
  platform: string,
  pageType: string,
  db: Database.Database = getDb()
): ReturnType<typeof mapRow> | null {
  const row = db
    .prepare(
      `SELECT id, platform, page_type, version, url_pattern, dom_fingerprint, api_fingerprint,
              recipe_json, is_active, captured_at, notes
       FROM platform_page_profiles
       WHERE platform = ? AND page_type = ? AND is_active = 1
       ORDER BY captured_at DESC
       LIMIT 1`
    )
    .get(platform, pageType) as PlatformPageProfileRow | undefined

  return row ? mapRow(row) : null
}

export function listActiveProfileVersions(
  platform: string,
  db: Database.Database = getDb()
): Record<string, string> {
  const rows = db
    .prepare(
      `SELECT page_type, version FROM platform_page_profiles
       WHERE platform = ? AND is_active = 1`
    )
    .all(platform) as Array<{ page_type: string; version: string }>

  return Object.fromEntries(rows.map((row) => [row.page_type, row.version]))
}
