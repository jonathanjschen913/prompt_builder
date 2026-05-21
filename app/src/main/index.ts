import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';
import { flushPendingSave, loadAppData } from './storage';
import { registerIpcHandlers } from './ipc';

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
}

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    const w = wins[0]!;
    if (w.isMinimized()) w.restore();
    w.focus();
  }
});

app.whenReady().then(async () => {
  await loadAppData();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async (e) => {
  e.preventDefault();
  try {
    await flushPendingSave();
  } finally {
    app.exit(0);
  }
});
