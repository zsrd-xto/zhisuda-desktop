import { ipcMain } from 'electron'
import type { JobPreferencesInput } from '../../shared/types/preferences'
import { getPreferencesOrDefault, savePreferences } from '../services/preferences.service'

export function registerPreferencesIpc(): void {
  ipcMain.handle('preferences:get', () => {
    return getPreferencesOrDefault()
  })

  ipcMain.handle('preferences:save', (_event, input: JobPreferencesInput) => {
    return savePreferences(input)
  })
}
