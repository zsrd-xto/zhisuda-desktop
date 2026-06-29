import { ipcMain } from 'electron'
import type {
  ApplyBatchInput,
  AppendBlacklistInput,
  DeliveryProgressEvent,
  GetDeliveryRecordsInput,
  ToggleStarInput
} from '../../shared/types/delivery'
import { serializePlatformErrorForIpc } from '../platform/platform-error'
import {
  applyDeliveryBatch,
  getDeliveredJobIds,
  getDeliveryRecords,
  getDeliveryStats,
  listStarredJobIds,
  resumeDeliveryQueue,
  toggleStarredJob
} from '../services/delivery.service'
import { appendBlacklistCompany } from '../services/preferences.service'
import { getMainWindow } from '../window/main-window'

function emitDeliveryProgress(event: DeliveryProgressEvent): void {
  const mainWindow = getMainWindow()
  mainWindow.webContents.send('delivery:progress', event)
}

export function registerDeliveryIpc(): void {
  ipcMain.handle('delivery:applyBatch', async (_event, input: ApplyBatchInput) => {
    try {
      return await applyDeliveryBatch(input, emitDeliveryProgress)
    } catch (error) {
      throw serializePlatformErrorForIpc(error)
    }
  })

  ipcMain.handle('delivery:resumeQueue', () => {
    return resumeDeliveryQueue()
  })

  ipcMain.handle('delivery:getRecords', (_event, input?: GetDeliveryRecordsInput) => {
    return getDeliveryRecords(input)
  })

  ipcMain.handle('delivery:getStats', () => {
    return getDeliveryStats()
  })

  ipcMain.handle('delivery:listStarred', () => {
    return listStarredJobIds()
  })

  ipcMain.handle('delivery:listDelivered', () => {
    return getDeliveredJobIds()
  })

  ipcMain.handle('delivery:toggleStar', (_event, input: ToggleStarInput) => {
    return toggleStarredJob(input)
  })

  ipcMain.handle('delivery:appendBlacklist', (_event, input: AppendBlacklistInput) => {
    return appendBlacklistCompany(input.preferenceId, input.companyName)
  })
}
