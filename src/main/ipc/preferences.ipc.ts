import { ipcMain } from 'electron'
import type { JobPreferenceInput } from '../../shared/types/preferences'
import {
  deletePreference,
  listPreferences,
  savePreference
} from '../services/preferences.service'

export function registerPreferencesIpc(): void {
  ipcMain.handle('preferences:list', () => {
    return listPreferences()
  })

  ipcMain.handle('preferences:save', (_event, input: JobPreferenceInput) => {
    return savePreference(input)
  })

  ipcMain.handle('preferences:delete', (_event, preferenceId: string) => {
    return deletePreference(preferenceId)
  })
}
