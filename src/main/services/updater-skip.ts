import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const SKIPPED_VERSION_FILE = 'skipped-version.json'

export function getSkippedVersionPath(userDataDir: string): string {
  return join(userDataDir, SKIPPED_VERSION_FILE)
}

export function readSkippedVersionFrom(userDataDir: string): string | null {
  const filePath = getSkippedVersionPath(userDataDir)
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as { version?: string }
    return typeof parsed.version === 'string' ? parsed.version : null
  } catch {
    return null
  }
}

export function writeSkippedVersionTo(userDataDir: string, version: string): void {
  writeFileSync(getSkippedVersionPath(userDataDir), JSON.stringify({ version }, null, 2), 'utf8')
}

export function shouldSkipVersionIn(userDataDir: string, version: string): boolean {
  return readSkippedVersionFrom(userDataDir) === version
}
