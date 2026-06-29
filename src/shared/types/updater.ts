export type UpdaterPhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateInfoPayload {
  version: string
  releaseNotes?: string
}

export interface UpdaterStatusEvent {
  phase: UpdaterPhase
  currentVersion: string
  updateInfo?: UpdateInfoPayload
  progress?: number
  message?: string
}

export interface UpdaterCheckResult {
  phase: 'available' | 'not-available' | 'error'
  currentVersion: string
  updateInfo?: UpdateInfoPayload
  message?: string
}
