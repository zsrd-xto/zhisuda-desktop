import { ipcMain } from 'electron'
import type { GetBatchJobsInput, ListBatchesInput } from '../../shared/types/jobs'
import { getBatchJobs, getLatestFetchBatch, listFetchBatches } from '../services/job-listing.service'

export function registerJobsIpc(): void {
  ipcMain.handle('jobs:listBatches', (_event, input?: ListBatchesInput) => {
    return listFetchBatches(input)
  })

  ipcMain.handle('jobs:getLatestBatch', () => {
    return getLatestFetchBatch()
  })

  ipcMain.handle('jobs:getBatchJobs', (_event, input: GetBatchJobsInput) => {
    return getBatchJobs(input)
  })
}
