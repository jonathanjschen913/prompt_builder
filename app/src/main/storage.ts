import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { AppData } from '@shared/types';
import { SCHEMA_VERSION } from '@shared/types';
import { buildDefaultAppData } from '@shared/defaults';

const DATA_FILE_NAME = 'data.json';
const TMP_FILE_NAME = 'data.json.tmp';
const SAVE_DEBOUNCE_MS = 500;

function dataPath(): string {
  return join(app.getPath('userData'), DATA_FILE_NAME);
}

function tmpPath(): string {
  return join(app.getPath('userData'), TMP_FILE_NAME);
}

function brokenPath(timestamp: number): string {
  return join(app.getPath('userData'), `data.json.broken.${timestamp}`);
}

function isValidAppData(obj: unknown): obj is AppData {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (typeof o['version'] !== 'number') return false;
  if (!Array.isArray(o['tags'])) return false;
  if (!Array.isArray(o['templates'])) return false;
  if (!o['preferences'] || typeof o['preferences'] !== 'object') return false;
  return true;
}

function normalize(data: AppData): AppData {
  if (data.version !== SCHEMA_VERSION) {
    data.version = SCHEMA_VERSION;
  }
  if (!data.preferences.drafts || typeof data.preferences.drafts !== 'object') {
    data.preferences.drafts = {};
  }
  if (data.preferences.lastTemplateId === undefined) {
    data.preferences.lastTemplateId = null;
  }
  if (data.preferences.windowBounds === undefined) {
    data.preferences.windowBounds = null;
  }
  if (!data.preferences.theme) {
    data.preferences.theme = 'system';
  }
  return data;
}

let inMemory: AppData | null = null;
let pendingSaveTimer: NodeJS.Timeout | null = null;
let saveChain: Promise<void> = Promise.resolve();

async function backupCorruptFile(): Promise<void> {
  try {
    const ts = Date.now();
    await fs.copyFile(dataPath(), brokenPath(ts));
    console.warn(`[storage] backed up corrupt data file to data.json.broken.${ts}`);
  } catch (err) {
    console.warn('[storage] failed to back up corrupt data file:', err);
  }
}

export async function loadAppData(): Promise<AppData> {
  try {
    const text = await fs.readFile(dataPath(), 'utf8');
    const parsed = JSON.parse(text);
    if (!isValidAppData(parsed)) {
      throw new Error('schema validation failed');
    }
    inMemory = normalize(parsed);
    return inMemory;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      inMemory = buildDefaultAppData();
      await writeNow(inMemory);
      return inMemory;
    }
    console.error('[storage] failed to load data, reseeding defaults:', err);
    await backupCorruptFile();
    inMemory = buildDefaultAppData();
    await writeNow(inMemory);
    return inMemory;
  }
}

async function writeNow(data: AppData): Promise<void> {
  const tmp = tmpPath();
  const final = dataPath();
  const text = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, text, 'utf8');
  await fs.rename(tmp, final);
}

export function scheduleSave(data: AppData): void {
  inMemory = data;
  if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = null;
    const snapshot = inMemory;
    if (!snapshot) return;
    saveChain = saveChain
      .then(() => writeNow(snapshot))
      .catch((err) => console.error('[storage] debounced save failed:', err));
  }, SAVE_DEBOUNCE_MS);
}

export async function flushPendingSave(): Promise<void> {
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer);
    pendingSaveTimer = null;
    if (inMemory) {
      saveChain = saveChain
        .then(() => writeNow(inMemory!))
        .catch((err) => console.error('[storage] flush save failed:', err));
    }
  }
  await saveChain;
}

export function getInMemoryData(): AppData | null {
  return inMemory;
}

export async function exportRawJson(): Promise<string> {
  await flushPendingSave();
  const data = inMemory ?? (await loadAppData());
  return JSON.stringify(data, null, 2);
}

export async function importRawJson(text: string): Promise<AppData> {
  const parsed = JSON.parse(text);
  if (!isValidAppData(parsed)) {
    throw new Error('Imported file is not a valid Prompt Builder data file.');
  }
  const normalized = normalize(parsed);
  inMemory = normalized;
  await writeNow(normalized);
  return normalized;
}

export function getDataPath(): string {
  return dataPath();
}
