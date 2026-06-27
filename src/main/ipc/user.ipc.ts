import { ipcMain } from 'electron'
import { deleteAllResumeFiles } from '../services/resume.service'
import { clearAllData, getOrCreateProfile, updateNickname } from '../services/user.service'

export function registerUserIpc(): void {
  ipcMain.handle('user:getProfile', () => {
    return getOrCreateProfile()
  })

  ipcMain.handle('user:updateNickname', (_event, nickname: string) => {
    return updateNickname(nickname)
  })

  ipcMain.handle('user:clearAllData', () => {
    deleteAllResumeFiles()
    return clearAllData()
  })
}
