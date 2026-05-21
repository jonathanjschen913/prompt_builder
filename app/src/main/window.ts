import { BrowserWindow, screen, shell, app } from 'electron';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { WindowBounds } from '@shared/types';
import { getInMemoryData, scheduleSave } from './storage';

function resolveIconPath(): string | undefined {
  // Packaged build: icon is embedded in the exe by electron-builder.
  // Dev build: load resources/icon.ico from the repo so the taskbar
  // and Alt-Tab tile show the gear during `npm run dev`.
  if (app.isPackaged) return undefined;
  const devIcon = resolve(__dirname, '../../resources/icon.ico');
  return existsSync(devIcon) ? devIcon : undefined;
}

const DEFAULT_BOUNDS: WindowBounds = {
  x: -1,
  y: -1,
  width: 1100,
  height: 750,
  maximized: false,
};

function clampBoundsToDisplays(b: WindowBounds): WindowBounds {
  const displays = screen.getAllDisplays();
  const isVisible = displays.some((d) => {
    const a = d.workArea;
    return (
      b.x + b.width > a.x &&
      b.x < a.x + a.width &&
      b.y + b.height > a.y &&
      b.y < a.y + a.height
    );
  });
  if (isVisible) return b;
  return { ...DEFAULT_BOUNDS };
}

export function createMainWindow(): BrowserWindow {
  const data = getInMemoryData();
  const saved = data?.preferences.windowBounds ?? null;
  const bounds = saved ? clampBoundsToDisplays(saved) : { ...DEFAULT_BOUNDS };

  const opts: Electron.BrowserWindowConstructorOptions = {
    width: bounds.width,
    height: bounds.height,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    title: 'Prompt Builder',
    backgroundColor: '#0f172a',
    icon: resolveIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
  if (bounds.x >= 0 && bounds.y >= 0) {
    opts.x = bounds.x;
    opts.y = bounds.y;
  }

  const win = new BrowserWindow(opts);

  if (bounds.maximized) win.maximize();

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const persistBounds = () => {
    const current = getInMemoryData();
    if (!current) return;
    const isMax = win.isMaximized();
    const rect = isMax ? win.getNormalBounds() : win.getBounds();
    const next: WindowBounds = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      maximized: isMax,
    };
    if (boundsEqual(current.preferences.windowBounds, next)) return;
    current.preferences.windowBounds = next;
    scheduleSave(current);
  };

  win.on('resize', persistBounds);
  win.on('move', persistBounds);
  win.on('maximize', persistBounds);
  win.on('unmaximize', persistBounds);
  win.on('close', persistBounds);

  const isDev = !app.isPackaged;
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

function boundsEqual(a: WindowBounds | null, b: WindowBounds): boolean {
  if (!a) return false;
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.maximized === b.maximized
  );
}
