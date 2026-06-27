import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { ResumeParsedData } from '../../shared/types/resume'
import { isE2eMode } from '../env/e2e'
import {
  getPrimaryResume,
  updatePrimaryResume,
  uploadResumeFromPath
} from '../services/resume.service'

function getDialogParentWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

export function registerResumeIpc(): void {
  ipcMain.handle('resume:get', () => {
    return getPrimaryResume()
  })

  ipcMain.handle('resume:upload', async () => {
    const parentWindow = getDialogParentWindow()
    const dialogOptions = {
      title: '选择简历文件',
      properties: ['openFile'] as Array<'openFile'>,
      filters: [
        { name: '简历文件', extensions: ['pdf', 'doc', 'docx'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    }

    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return uploadResumeFromPath(result.filePaths[0])
  })

  ipcMain.handle('resume:update', (_event, parsedData: ResumeParsedData) => {
    return updatePrimaryResume(parsedData)
  })

  if (isE2eMode()) {
    ipcMain.handle('resume:uploadFromPath', (_event, filePath: string) => {
      return uploadResumeFromPath(filePath)
    })
  }
}
