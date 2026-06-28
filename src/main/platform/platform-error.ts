import type { PlatformErrorCode, PlatformIpcError } from '../../shared/types/platform'

const IPC_ERROR_MARKER = '__zhisuda_platform_error__'

export class PlatformError extends Error {
  readonly errorCode: PlatformErrorCode

  constructor(message: string, errorCode: PlatformErrorCode) {
    super(message)
    this.name = 'PlatformError'
    this.errorCode = errorCode
  }
}

export function isPlatformError(error: unknown): error is PlatformError {
  return error instanceof PlatformError
}

export function toPlatformError(error: unknown, fallbackCode: PlatformErrorCode = 'UNKNOWN'): PlatformError {
  if (isPlatformError(error)) {
    return error
  }
  const message = error instanceof Error ? error.message : '未知错误'
  return new PlatformError(message, fallbackCode)
}

/** Electron IPC 仅保留 Error.message，结构化错误码编码进 message */
export function serializePlatformErrorForIpc(error: unknown): Error {
  const platformError = toPlatformError(error)
  const payload: PlatformIpcError = {
    message: platformError.message,
    errorCode: platformError.errorCode
  }
  return new Error(`${IPC_ERROR_MARKER}${JSON.stringify(payload)}`)
}

export function parsePlatformErrorFromIpc(error: unknown): PlatformIpcError {
  if (!(error instanceof Error)) {
    return { message: '未知错误', errorCode: 'UNKNOWN' }
  }

  if (!error.message.startsWith(IPC_ERROR_MARKER)) {
    return { message: error.message, errorCode: 'UNKNOWN' }
  }

  try {
    const parsed = JSON.parse(error.message.slice(IPC_ERROR_MARKER.length)) as PlatformIpcError
    if (parsed.message && parsed.errorCode) {
      return parsed
    }
  } catch {
    // fall through
  }

  return { message: error.message, errorCode: 'UNKNOWN' }
}
