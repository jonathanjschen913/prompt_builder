import { contextBridge, ipcRenderer } from 'electron';
import type { AppData } from '@shared/types';
import { IPC } from '@shared/ipc-channels';

const api = {
  loadData: (): Promise<AppData> => ipcRenderer.invoke(IPC.DataLoad),
  saveData: (data: AppData): Promise<void> => ipcRenderer.invoke(IPC.DataSave, data),
  writeClipboard: (text: string): Promise<void> => ipcRenderer.invoke(IPC.ClipboardWrite, text),
  exportData: (): Promise<boolean> => ipcRenderer.invoke(IPC.DataExport),
  importData: (): Promise<AppData | null> => ipcRenderer.invoke(IPC.DataImport),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
