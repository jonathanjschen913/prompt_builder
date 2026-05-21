import { clipboard, dialog, ipcMain, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import type { AppData } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import {
  exportRawJson,
  getInMemoryData,
  importRawJson,
  loadAppData,
  scheduleSave,
} from './storage';

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.DataLoad, async (): Promise<AppData> => {
    const cached = getInMemoryData();
    if (cached) return cached;
    return loadAppData();
  });

  ipcMain.handle(IPC.DataSave, (_evt, data: AppData): void => {
    const current = getInMemoryData();
    const merged: AppData = {
      ...data,
      preferences: {
        ...data.preferences,
        windowBounds: current?.preferences.windowBounds ?? data.preferences.windowBounds ?? null,
      },
    };
    scheduleSave(merged);
  });

  ipcMain.handle(IPC.ClipboardWrite, (_evt, text: string): void => {
    clipboard.writeText(text);
  });

  ipcMain.handle(IPC.DataExport, async (event): Promise<boolean> => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (!sender) return false;
    const result = await dialog.showSaveDialog(sender, {
      title: 'Export Prompt Builder data',
      defaultPath: 'prompt-builder-data.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return false;
    const text = await exportRawJson();
    await fs.writeFile(result.filePath, text, 'utf8');
    return true;
  });

  ipcMain.handle(IPC.DataImport, async (event): Promise<AppData | null> => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (!sender) return null;
    const result = await dialog.showOpenDialog(sender, {
      title: 'Import Prompt Builder data',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const text = await fs.readFile(result.filePaths[0]!, 'utf8');
    try {
      return await importRawJson(text);
    } catch (err) {
      await dialog.showMessageBox(sender, {
        type: 'error',
        title: 'Import failed',
        message: 'The selected file could not be imported.',
        detail: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  });
}
