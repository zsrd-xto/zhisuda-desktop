import { registerPlatformIpc } from './platform.ipc'
import { registerPreferencesIpc } from './preferences.ipc'
import { registerResumeIpc } from './resume.ipc'
import { registerUserIpc } from './user.ipc'

export function registerIpcHandlers(): void {
  registerUserIpc()
  registerResumeIpc()
  registerPreferencesIpc()
  registerPlatformIpc()
}
