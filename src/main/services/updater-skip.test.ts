import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  readSkippedVersionFrom,
  shouldSkipVersionIn,
  writeSkippedVersionTo
} from './updater-skip'

const testUserData = join(tmpdir(), `zhisuda-updater-test-${process.pid}`)

describe('updater skip version', () => {
  beforeEach(() => {
    mkdirSync(testUserData, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testUserData)) {
      rmSync(testUserData, { recursive: true, force: true })
    }
  })

  it('returns null when no skipped version file exists', () => {
    expect(readSkippedVersionFrom(testUserData)).toBeNull()
    expect(shouldSkipVersionIn(testUserData, '0.2.0')).toBe(false)
  })

  it('persists and reads skipped version', () => {
    writeSkippedVersionTo(testUserData, '0.2.0')
    expect(readSkippedVersionFrom(testUserData)).toBe('0.2.0')
    expect(shouldSkipVersionIn(testUserData, '0.2.0')).toBe(true)
    expect(shouldSkipVersionIn(testUserData, '0.3.0')).toBe(false)
  })

  it('handles invalid skipped version file', () => {
    writeFileSync(join(testUserData, 'skipped-version.json'), 'not-json', 'utf8')
    expect(readSkippedVersionFrom(testUserData)).toBeNull()
  })
})
