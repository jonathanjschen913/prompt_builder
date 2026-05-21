export const SCHEMA_VERSION = 1;

export interface Tag {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  isBuiltIn: boolean;
  isHidden: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  tagIds: string[];
  isBuiltIn: boolean;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Preferences {
  lastTemplateId: string | null;
  drafts: Record<string, Record<string, string>>;
  windowBounds: WindowBounds | null;
  theme: ThemePreference;
}

export interface SavedPromptTagSnapshot {
  id: string;
  name: string;
  description: string;
  placeholder: string;
}

export interface SavedPrompt {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  templateDescription: string;
  tagSnapshots: SavedPromptTagSnapshot[];
  drafts: Record<string, string>;
  output: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  version: number;
  tags: Tag[];
  templates: Template[];
  preferences: Preferences;
  savedPrompts: SavedPrompt[];
}

export const TAG_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
