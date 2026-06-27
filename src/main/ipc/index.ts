import { registerResumeIpc } from './resume.ipc'
import { registerUserIpc } from './user.ipc'

export function registerIpcHandlers(): void {
  registerUserIpc()
  registerResumeIpc()
}
