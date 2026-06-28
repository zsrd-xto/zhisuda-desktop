import { describe, expect, it } from 'vitest'
import { openDatabase } from './database'
import { listMigrationVersions, runMigrations } from './migrate'

describe('runMigrations', () => {
  it('applies migrations and records schema_migrations', () => {
    const db = openDatabase(':memory:')

    expect(listMigrationVersions()).toContain('005_preferences_multi')

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'schema_migrations',
        'users',
        'resumes',
        'job_preferences',
        'job_fetch_batches',
        'platform_accounts',
        'platform_page_profiles',
        'platform_extract_runs',
        'job_listings'
      ])
    )

    const applied = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all() as Array<{ version: string }>

    expect(applied.map((row) => row.version)).toEqual(
      expect.arrayContaining([
        '001_init',
        '002_resumes',
        '003_preferences_platform',
        '004_platform_profiles',
        '005_preferences_multi'
      ])
    )

    runMigrations(db)

    const appliedAgain = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all() as Array<{ version: string }>

    expect(appliedAgain).toHaveLength(5)

    db.close()
  })
})
