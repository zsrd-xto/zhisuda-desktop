import { describe, expect, it } from 'vitest'
import {
  parsePlatformErrorFromIpc,
  PlatformError,
  serializePlatformErrorForIpc
} from './platform-error'

describe('platform-error IPC', () => {
  it('round-trips structured error through IPC message', () => {
    const ipcError = serializePlatformErrorForIpc(
      new PlatformError('抓取过于频繁', 'RATE_LIMIT')
    )
    const parsed = parsePlatformErrorFromIpc(ipcError)

    expect(parsed.errorCode).toBe('RATE_LIMIT')
    expect(parsed.message).toBe('抓取过于频繁')
  })
})
