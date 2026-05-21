import { create } from 'zustand';
import type { AppData, SavedPrompt, Tag, Template, ThemePreference } from '@shared/types';
import { generatePrompt } from './lib/generate';

let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 250;
const UNDO_LIMIT = 50;

function uuid(): string {
  return crypto.randomUUID();
}

interface CreateTagInput {
  name: string;
  description: string;
  placeholder: string;
}

interface CreateTemplateInput {
  name: string;
  description: string;
  tagIds: string[];
}

interface UpdateTemplateInput {
  name?: string;
  description?: string;
  tagIds?: string[];
}

interface DeleteTagResult {
  templatesAffected: { id: string; name: string }[];
}

interface UndoEntry {
  description: string;
  templateId: string;
  snapshot: {
    tagIds: string[];
    drafts: Record<string, string>;
    tags: Tag[];
  };
}

export interface AttachByNameResult {
  tag: Tag;
  created: boolean;
}

export type LoadSavedPromptResult =
  | { kind: 'restored'; prompt: SavedPrompt }
  | { kind: 'template_missing'; prompt: SavedPrompt }
  | { kind: 'not_found' };

export interface AppState {
  ready: boolean;
  tags: Tag[];
  templates: Template[];
  activeTemplateId: string | null;
  drafts: Record<string, Record<string, string>>;
  theme: ThemePreference;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  savedPrompts: SavedPrompt[];

  hydrate: () => Promise<void>;
  selectTemplate: (id: string) => void;
  setDraft: (templateId: string, positionIndex: number, text: string) => void;
  clearDrafts: (templateId: string) => void;
  setTheme: (theme: ThemePreference) => void;

  createTag: (input: CreateTagInput) => Tag;
  updateTag: (id: string, patch: Partial<CreateTagInput>) => void;
  deleteTag: (id: string) => DeleteTagResult;
  setTagHidden: (id: string, hidden: boolean) => void;

  createTemplate: (input: CreateTemplateInput) => Template;
  updateTemplate: (id: string, patch: UpdateTemplateInput) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => Template | null;

  attachTagByNameToTemplate: (templateId: string, name: string) => AttachByNameResult | null;
  removeTagFromTemplatePosition: (templateId: string, positionIndex: number) => void;
  reorderTagInTemplate: (templateId: string, fromIndex: number, toIndex: number) => void;
  reorderTemplates: (fromId: string, toId: string) => void;

  saveCurrentPrompt: () => SavedPrompt | null;
  renameSavedPrompt: (id: string, name: string) => void;
  deleteSavedPrompt: (id: string) => void;
  loadSavedPrompt: (id: string) => LoadSavedPromptResult;

  undo: () => UndoEntry | null;
  redo: () => UndoEntry | null;
  replaceAll: (data: AppData) => void;
}

function snapshotForPersist(state: AppState): AppData {
  return {
    version: 1,
    tags: state.tags,
    templates: state.templates,
    preferences: {
      lastTemplateId: state.activeTemplateId,
      drafts: state.drafts,
      windowBounds: null,
      theme: state.theme,
    },
    savedPrompts: state.savedPrompts,
  };
}

function defaultSavedPromptName(templateName: string, existing: SavedPrompt[]): string {
  let n = 1;
  const taken = new Set(existing.map((p) => p.name.toLowerCase()));
  while (taken.has(`${templateName.toLowerCase()} ${n}`)) n++;
  return `${templateName} ${n}`;
}

function schedulePersist(getState: () => AppState): void {
  if (!getState().ready) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const s = getState();
    const data = snapshotForPersist(s);
    void window.api.saveData(data).catch((err) => {
      console.error('[store] saveData failed:', err);
    });
  }, PERSIST_DEBOUNCE_MS);
}

function mapOldToNewPosition(oldPos: number, from: number, to: number): number {
  if (oldPos === from) return to;
  if (from < to && oldPos > from && oldPos <= to) return oldPos - 1;
  if (from > to && oldPos >= to && oldPos < from) return oldPos + 1;
  return oldPos;
}

function shiftDraftsDown(
  drafts: Record<string, string>,
  removedPosition: number
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(drafts)) {
    const idx = Number(k);
    if (idx < removedPosition) next[k] = v;
    else if (idx > removedPosition) next[String(idx - 1)] = v;
  }
  return next;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  tags: [],
  templates: [],
  activeTemplateId: null,
  drafts: {},
  theme: 'system',
  undoStack: [],
  redoStack: [],
  savedPrompts: [],

  async hydrate() {
    const data = await window.api.loadData();
    set({
      tags: data.tags,
      templates: data.templates,
      activeTemplateId: pickInitialTemplateId(data),
      drafts: data.preferences.drafts ?? {},
      theme: data.preferences.theme ?? 'system',
      undoStack: [],
      redoStack: [],
      savedPrompts: data.savedPrompts ?? [],
      ready: true,
    });
  },

  selectTemplate(id) {
    set({ activeTemplateId: id });
    schedulePersist(get);
  },

  setDraft(templateId, positionIndex, text) {
    set((s) => {
      const perTemplate = { ...(s.drafts[templateId] ?? {}) };
      const key = String(positionIndex);
      if (text === '') delete perTemplate[key];
      else perTemplate[key] = text;
      const drafts = { ...s.drafts };
      if (Object.keys(perTemplate).length === 0) delete drafts[templateId];
      else drafts[templateId] = perTemplate;
      return { drafts };
    });
    schedulePersist(get);
  },

  clearDrafts(templateId) {
    const s = get();
    const existing = s.drafts[templateId];
    if (!existing || Object.keys(existing).length === 0) return;
    const tpl = s.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const undoSnapshot = {
      tagIds: [...tpl.tagIds],
      drafts: { ...existing },
      tags: s.tags,
    };
    set((st) => {
      const drafts = { ...st.drafts };
      delete drafts[templateId];
      return {
        drafts,
        undoStack: pushUndoEntry(st.undoStack, {
          description: `Clear all in "${tpl.name}"`,
          templateId,
          snapshot: undoSnapshot,
        }),
        redoStack: [],
      };
    });
    schedulePersist(get);
  },

  setTheme(theme) {
    set({ theme });
    schedulePersist(get);
  },

  createTag(input) {
    const tag: Tag = {
      id: uuid(),
      name: input.name.trim(),
      description: input.description,
      placeholder: input.placeholder,
      isBuiltIn: false,
      isHidden: false,
    };
    set((s) => ({ tags: [...s.tags, tag], undoStack: [], redoStack: [] }));
    schedulePersist(get);
    return tag;
  },

  updateTag(id, patch) {
    set((s) => ({
      tags: s.tags.map((t) =>
        t.id === id
          ? {
              ...t,
              name: patch.name !== undefined ? patch.name.trim() : t.name,
              description: patch.description !== undefined ? patch.description : t.description,
              placeholder: patch.placeholder !== undefined ? patch.placeholder : t.placeholder,
            }
          : t
      ),
      undoStack: [],
      redoStack: [],
    }));
    schedulePersist(get);
  },

  deleteTag(id) {
    const state = get();
    const affected = state.templates
      .filter((tpl) => tpl.tagIds.includes(id))
      .map((tpl) => ({ id: tpl.id, name: tpl.name }));
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      templates: s.templates.map((tpl) =>
        tpl.tagIds.includes(id)
          ? { ...tpl, tagIds: tpl.tagIds.filter((tid) => tid !== id) }
          : tpl
      ),
      drafts: pruneDraftsForRemovedTagPositions(s.drafts, s.templates, id),
      undoStack: [],
      redoStack: [],
    }));
    schedulePersist(get);
    return { templatesAffected: affected };
  },

  setTagHidden(id, hidden) {
    set((s) => ({
      tags: s.tags.map((t) => (t.id === id ? { ...t, isHidden: hidden } : t)),
      undoStack: [],
      redoStack: [],
    }));
    schedulePersist(get);
  },

  createTemplate(input) {
    const tpl: Template = {
      id: uuid(),
      name: input.name.trim(),
      description: input.description,
      tagIds: [...input.tagIds],
      isBuiltIn: false,
    };
    set((s) => ({
      templates: [...s.templates, tpl],
      activeTemplateId: tpl.id,
    }));
    schedulePersist(get);
    return tpl;
  },

  updateTemplate(id, patch) {
    set((s) => {
      const next = s.templates.map((tpl) => {
        if (tpl.id !== id) return tpl;
        const newTpl: Template = {
          ...tpl,
          name: patch.name !== undefined ? patch.name.trim() : tpl.name,
          description: patch.description !== undefined ? patch.description : tpl.description,
          tagIds: patch.tagIds !== undefined ? [...patch.tagIds] : tpl.tagIds,
        };
        return newTpl;
      });
      let drafts = s.drafts;
      if (patch.tagIds !== undefined && s.drafts[id]) {
        const oldTpl = s.templates.find((t) => t.id === id);
        if (oldTpl) {
          drafts = remapDraftsForReorder(s.drafts, id, oldTpl.tagIds, patch.tagIds);
        }
      }
      return {
        templates: next,
        drafts,
        undoStack: patch.tagIds !== undefined ? s.undoStack.filter((e) => e.templateId !== id) : s.undoStack,
        redoStack: patch.tagIds !== undefined ? s.redoStack.filter((e) => e.templateId !== id) : s.redoStack,
      };
    });
    schedulePersist(get);
  },

  deleteTemplate(id) {
    set((s) => {
      const target = s.templates.find((t) => t.id === id);
      if (!target || target.isBuiltIn) return s;
      const templates = s.templates.filter((t) => t.id !== id);
      const drafts = { ...s.drafts };
      delete drafts[id];
      let activeTemplateId = s.activeTemplateId;
      if (activeTemplateId === id) {
        activeTemplateId = templates[0]?.id ?? null;
      }
      return {
        templates,
        drafts,
        activeTemplateId,
        undoStack: s.undoStack.filter((e) => e.templateId !== id),
        redoStack: s.redoStack.filter((e) => e.templateId !== id),
      };
    });
    schedulePersist(get);
  },

  duplicateTemplate(id) {
    const src = get().templates.find((t) => t.id === id);
    if (!src) return null;
    const copy: Template = {
      id: uuid(),
      name: `${src.name} (copy)`,
      description: src.description,
      tagIds: [...src.tagIds],
      isBuiltIn: false,
    };
    set((s) => ({
      templates: [...s.templates, copy],
      activeTemplateId: copy.id,
    }));
    schedulePersist(get);
    return copy;
  },

  attachTagByNameToTemplate(templateId, name) {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const s = get();
    const tpl = s.templates.find((t) => t.id === templateId);
    if (!tpl) return null;
    if (tpl.isBuiltIn) return null;

    const existing = s.tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    const undoSnapshot = {
      tagIds: [...tpl.tagIds],
      drafts: { ...(s.drafts[templateId] ?? {}) },
      tags: s.tags,
    };

    let resolved: Tag;
    let created: boolean;
    if (existing) {
      resolved = existing;
      created = false;
      set((st) => ({
        templates: st.templates.map((t) =>
          t.id === templateId ? { ...t, tagIds: [...t.tagIds, existing.id] } : t
        ),
        undoStack: pushUndoEntry(st.undoStack, {
          description: `Add "${existing.name}"`,
          templateId,
          snapshot: undoSnapshot,
        }),
        redoStack: [],
      }));
    } else {
      const newTag: Tag = {
        id: uuid(),
        name: trimmed,
        description: '',
        placeholder: '',
        isBuiltIn: false,
        isHidden: false,
      };
      resolved = newTag;
      created = true;
      set((st) => ({
        tags: [...st.tags, newTag],
        templates: st.templates.map((t) =>
          t.id === templateId ? { ...t, tagIds: [...t.tagIds, newTag.id] } : t
        ),
        undoStack: pushUndoEntry(st.undoStack, {
          description: `Add "${newTag.name}"`,
          templateId,
          snapshot: undoSnapshot,
        }),
        redoStack: [],
      }));
    }
    schedulePersist(get);
    return { tag: resolved, created };
  },

  removeTagFromTemplatePosition(templateId, positionIndex) {
    const s = get();
    const tpl = s.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (tpl.isBuiltIn) return;
    if (positionIndex < 0 || positionIndex >= tpl.tagIds.length) return;

    const removedTagId = tpl.tagIds[positionIndex]!;
    const removedTag = s.tags.find((t) => t.id === removedTagId);
    const undoSnapshot = {
      tagIds: [...tpl.tagIds],
      drafts: { ...(s.drafts[templateId] ?? {}) },
      tags: s.tags,
    };

    set((st) => {
      const newTagIds = tpl.tagIds.filter((_, i) => i !== positionIndex);
      const perTpl = st.drafts[templateId];
      const drafts = { ...st.drafts };
      if (perTpl) {
        const shifted = shiftDraftsDown(perTpl, positionIndex);
        if (Object.keys(shifted).length === 0) delete drafts[templateId];
        else drafts[templateId] = shifted;
      }
      return {
        templates: st.templates.map((t) =>
          t.id === templateId ? { ...t, tagIds: newTagIds } : t
        ),
        drafts,
        undoStack: pushUndoEntry(st.undoStack, {
          description: removedTag ? `Remove "${removedTag.name}"` : 'Remove tag',
          templateId,
          snapshot: undoSnapshot,
        }),
        redoStack: [],
      };
    });
    schedulePersist(get);
  },

  reorderTagInTemplate(templateId, fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const s = get();
    const tpl = s.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (tpl.isBuiltIn) return;
    if (fromIndex < 0 || fromIndex >= tpl.tagIds.length) return;
    if (toIndex < 0 || toIndex >= tpl.tagIds.length) return;

    const movedTagId = tpl.tagIds[fromIndex]!;
    const movedTag = s.tags.find((t) => t.id === movedTagId);
    const undoSnapshot = {
      tagIds: [...tpl.tagIds],
      drafts: { ...(s.drafts[templateId] ?? {}) },
      tags: s.tags,
    };

    set((st) => {
      const newTagIds = [...tpl.tagIds];
      const [moved] = newTagIds.splice(fromIndex, 1);
      if (!moved) return st;
      newTagIds.splice(toIndex, 0, moved);

      const perTpl = st.drafts[templateId];
      const drafts = { ...st.drafts };
      if (perTpl) {
        const remapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(perTpl)) {
          const oldPos = Number(k);
          const newPos = mapOldToNewPosition(oldPos, fromIndex, toIndex);
          remapped[String(newPos)] = v;
        }
        if (Object.keys(remapped).length === 0) delete drafts[templateId];
        else drafts[templateId] = remapped;
      }

      return {
        templates: st.templates.map((t) =>
          t.id === templateId ? { ...t, tagIds: newTagIds } : t
        ),
        drafts,
        undoStack: pushUndoEntry(st.undoStack, {
          description: movedTag ? `Reorder "${movedTag.name}"` : 'Reorder tag',
          templateId,
          snapshot: undoSnapshot,
        }),
        redoStack: [],
      };
    });
    schedulePersist(get);
  },

  reorderTemplates(fromId, toId) {
    if (fromId === toId) return;
    set((s) => {
      const fromIdx = s.templates.findIndex((t) => t.id === fromId);
      const toIdx = s.templates.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return s;
      const next = [...s.templates];
      const [moved] = next.splice(fromIdx, 1);
      if (!moved) return s;
      next.splice(toIdx, 0, moved);
      return { templates: next };
    });
    schedulePersist(get);
  },

  undo() {
    const s0 = get();
    const stack = s0.undoStack;
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1]!;
    const tpl = s0.templates.find((t) => t.id === entry.templateId);
    if (!tpl) {
      set({ undoStack: stack.slice(0, -1) });
      return null;
    }
    const inverseEntry: UndoEntry = {
      description: entry.description,
      templateId: entry.templateId,
      snapshot: {
        tagIds: [...tpl.tagIds],
        drafts: { ...(s0.drafts[entry.templateId] ?? {}) },
        tags: s0.tags,
      },
    };

    set((s) => {
      const drafts = { ...s.drafts };
      if (Object.keys(entry.snapshot.drafts).length === 0) {
        delete drafts[entry.templateId];
      } else {
        drafts[entry.templateId] = entry.snapshot.drafts;
      }
      return {
        tags: entry.snapshot.tags,
        templates: s.templates.map((t) =>
          t.id === entry.templateId ? { ...t, tagIds: [...entry.snapshot.tagIds] } : t
        ),
        drafts,
        activeTemplateId: entry.templateId,
        undoStack: stack.slice(0, -1),
        redoStack: pushUndoEntry(s.redoStack, inverseEntry),
      };
    });
    schedulePersist(get);
    return entry;
  },

  redo() {
    const s0 = get();
    const stack = s0.redoStack;
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1]!;
    const tpl = s0.templates.find((t) => t.id === entry.templateId);
    if (!tpl) {
      set({ redoStack: stack.slice(0, -1) });
      return null;
    }
    const inverseEntry: UndoEntry = {
      description: entry.description,
      templateId: entry.templateId,
      snapshot: {
        tagIds: [...tpl.tagIds],
        drafts: { ...(s0.drafts[entry.templateId] ?? {}) },
        tags: s0.tags,
      },
    };

    set((s) => {
      const drafts = { ...s.drafts };
      if (Object.keys(entry.snapshot.drafts).length === 0) {
        delete drafts[entry.templateId];
      } else {
        drafts[entry.templateId] = entry.snapshot.drafts;
      }
      return {
        tags: entry.snapshot.tags,
        templates: s.templates.map((t) =>
          t.id === entry.templateId ? { ...t, tagIds: [...entry.snapshot.tagIds] } : t
        ),
        drafts,
        activeTemplateId: entry.templateId,
        undoStack: pushUndoEntry(s.undoStack, inverseEntry),
        redoStack: stack.slice(0, -1),
      };
    });
    schedulePersist(get);
    return entry;
  },

  saveCurrentPrompt() {
    const s = get();
    if (!s.activeTemplateId) return null;
    const tpl = s.templates.find((t) => t.id === s.activeTemplateId);
    if (!tpl) return null;
    const tagsById = new Map(s.tags.map((t) => [t.id, t]));
    const perTpl = s.drafts[tpl.id] ?? {};
    const { output } = generatePrompt(tpl, tagsById, perTpl);
    if (!output) return null;
    const now = Date.now();
    const prompt: SavedPrompt = {
      id: uuid(),
      name: defaultSavedPromptName(tpl.name, s.savedPrompts),
      templateId: tpl.id,
      templateName: tpl.name,
      drafts: { ...perTpl },
      output,
      createdAt: now,
      updatedAt: now,
    };
    set((st) => ({ savedPrompts: [...st.savedPrompts, prompt] }));
    schedulePersist(get);
    return prompt;
  },

  renameSavedPrompt(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      savedPrompts: s.savedPrompts.map((p) =>
        p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p
      ),
    }));
    schedulePersist(get);
  },

  deleteSavedPrompt(id) {
    set((s) => ({ savedPrompts: s.savedPrompts.filter((p) => p.id !== id) }));
    schedulePersist(get);
  },

  loadSavedPrompt(id) {
    const s = get();
    const prompt = s.savedPrompts.find((p) => p.id === id);
    if (!prompt) return { kind: 'not_found' };
    const tpl = s.templates.find((t) => t.id === prompt.templateId);
    if (!tpl) return { kind: 'template_missing', prompt };
    set((st) => {
      const drafts = { ...st.drafts };
      if (Object.keys(prompt.drafts).length === 0) delete drafts[tpl.id];
      else drafts[tpl.id] = { ...prompt.drafts };
      return {
        activeTemplateId: tpl.id,
        drafts,
        undoStack: st.undoStack.filter((e) => e.templateId !== tpl.id),
        redoStack: st.redoStack.filter((e) => e.templateId !== tpl.id),
      };
    });
    schedulePersist(get);
    return { kind: 'restored', prompt };
  },

  replaceAll(data) {
    set({
      tags: data.tags,
      templates: data.templates,
      activeTemplateId: pickInitialTemplateId(data),
      drafts: data.preferences.drafts ?? {},
      theme: data.preferences.theme ?? 'system',
      undoStack: [],
      redoStack: [],
      savedPrompts: data.savedPrompts ?? [],
    });
    schedulePersist(get);
  },
}));

function pushUndoEntry(stack: UndoEntry[], entry: UndoEntry): UndoEntry[] {
  const next = [...stack, entry];
  if (next.length > UNDO_LIMIT) next.shift();
  return next;
}

function pickInitialTemplateId(data: AppData): string | null {
  const preferred = data.preferences.lastTemplateId;
  if (preferred && data.templates.some((t) => t.id === preferred)) return preferred;
  return data.templates[0]?.id ?? null;
}

function pruneDraftsForRemovedTagPositions(
  drafts: Record<string, Record<string, string>>,
  templates: Template[],
  removedTagId: string
): Record<string, Record<string, string>> {
  const next: Record<string, Record<string, string>> = {};
  for (const tpl of templates) {
    const perTpl = drafts[tpl.id];
    if (!perTpl) continue;
    const oldTagIds = tpl.tagIds;
    const newTagIds = oldTagIds.filter((tid) => tid !== removedTagId);
    if (newTagIds.length === oldTagIds.length) {
      next[tpl.id] = perTpl;
      continue;
    }
    const remapped: Record<string, string> = {};
    let newIdx = 0;
    for (let oldIdx = 0; oldIdx < oldTagIds.length; oldIdx++) {
      if (oldTagIds[oldIdx] === removedTagId) continue;
      const v = perTpl[String(oldIdx)];
      if (v !== undefined) remapped[String(newIdx)] = v;
      newIdx++;
    }
    if (Object.keys(remapped).length > 0) next[tpl.id] = remapped;
  }
  for (const [tplId, perTpl] of Object.entries(drafts)) {
    if (!(tplId in next) && !templates.some((t) => t.id === tplId)) {
      next[tplId] = perTpl;
    }
  }
  return next;
}

function remapDraftsForReorder(
  drafts: Record<string, Record<string, string>>,
  templateId: string,
  oldTagIds: string[],
  newTagIds: string[]
): Record<string, Record<string, string>> {
  const perTpl = drafts[templateId];
  if (!perTpl) return drafts;
  const oldByIdx: { idx: number; tagId: string; value: string }[] = [];
  oldTagIds.forEach((tid, idx) => {
    const v = perTpl[String(idx)];
    if (v !== undefined) oldByIdx.push({ idx, tagId: tid, value: v });
  });
  if (oldByIdx.length === 0) return drafts;
  const consumed = new Array<boolean>(oldByIdx.length).fill(false);
  const remapped: Record<string, string> = {};
  newTagIds.forEach((tid, newIdx) => {
    const matchIdx = oldByIdx.findIndex((o, i) => !consumed[i] && o.tagId === tid);
    if (matchIdx >= 0) {
      remapped[String(newIdx)] = oldByIdx[matchIdx]!.value;
      consumed[matchIdx] = true;
    }
  });
  const next = { ...drafts };
  if (Object.keys(remapped).length > 0) next[templateId] = remapped;
  else delete next[templateId];
  return next;
}
