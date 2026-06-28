import type { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

export function getMainWindow(): BrowserWindow {
  if (!mainWindow) {
    throw new Error('主窗口尚未初始化')
  }
  return mainWindow
}
