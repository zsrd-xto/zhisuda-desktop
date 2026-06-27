import type Database from 'better-sqlite3'

const migrationModules = import.meta.glob<string>('./migrations/*.sql', {
  eager: true,
  query: '?raw',
  import: 'default'
})

function getMigrationEntries(): Array<{ version: string; sql: string }> {
  return Object.entries(migrationModules)
    .map(([filePath, sql]) => {
      const fileName = filePath.split('/').pop() ?? filePath
      const version = fileName.replace(/\.sql$/, '')
      return { version, sql }
    })
    .sort((a, b) => a.version.localeCompare(b.version))
}

function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

function getAppliedVersions(db: Database.Database): Set<string> {
  ensureMigrationsTable(db)
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{
    version: string
  }>
  return new Set(rows.map((row) => row.version))
}

export function runMigrations(db: Database.Database): void {
  const applied = getAppliedVersions(db)

  for (const { version, sql } of getMigrationEntries()) {
    if (applied.has(version)) {
      continue
    }

    const run = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version)
    })

    run()
  }
}

export function listMigrationVersions(): string[] {
  return getMigrationEntries().map((entry) => entry.version)
}
