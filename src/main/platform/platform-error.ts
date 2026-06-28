import type { PlatformErrorCode } from '../../shared/types/platform'

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
