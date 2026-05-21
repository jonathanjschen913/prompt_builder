import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store';
import { applyTheme, watchSystemTheme } from './lib/theme';
import { generatePrompt } from './lib/generate';
import { useKeyboardShortcuts } from './lib/shortcuts';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { TagManager } from './components/TagManager';
import { TemplateEditor } from './components/TemplateEditor';
import { SavedPrompts } from './components/SavedPrompts';
import { Settings } from './components/Settings';
import { ToastHost } from './components/ToastHost';
import { toast } from './components/toast';

type TemplateEditorState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; templateId: string };

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const theme = useAppStore((s) => s.theme);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    applyTheme(theme);
    if (theme === 'system') return watchSystemTheme(() => applyTheme('system'));
    return undefined;
  }, [theme]);

  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [templateEditor, setTemplateEditor] = useState<TemplateEditorState>({ open: false });
  const [savedPromptsOpen, setSavedPromptsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const anyModalOpen =
    tagManagerOpen || templateEditor.open || savedPromptsOpen || settingsOpen;

  const openNewTemplate = useCallback(() => {
    setTemplateEditor({ open: true, mode: 'create' });
  }, []);
  const openEditCurrentTemplate = useCallback(() => {
    const active = useAppStore.getState().activeTemplateId;
    if (!active) return;
    setTemplateEditor({ open: true, mode: 'edit', templateId: active });
  }, []);

  const handleGenerate = useCallback(async () => {
    const s = useAppStore.getState();
    const tpl = s.templates.find((t) => t.id === s.activeTemplateId);
    if (!tpl) return;
    const tagsById = new Map(s.tags.map((t) => [t.id, t]));
    const drafts = s.drafts[tpl.id] ?? {};
    const { output } = generatePrompt(tpl, tagsById, drafts);
    if (!output) {
      toast('Nothing to copy — fill in at least one field.', 'warn');
      return;
    }
    try {
      await window.api.writeClipboard(output);
      toast('Copied to clipboard', 'success');
    } catch (err) {
      console.error(err);
      toast('Copy failed', 'error');
    }
  }, []);

  const handleClearAll = useCallback(() => {
    const s = useAppStore.getState();
    if (!s.activeTemplateId) return;
    s.clearDrafts(s.activeTemplateId);
  }, []);

  const handleUndo = useCallback(() => {
    const entry = useAppStore.getState().undo();
    if (entry) toast(`Undid: ${entry.description}`, 'info');
  }, []);

  const handleRedo = useCallback(() => {
    const entry = useAppStore.getState().redo();
    if (entry) toast(`Redid: ${entry.description}`, 'info');
  }, []);

  useKeyboardShortcuts({
    enabled: !anyModalOpen,
    onGenerate: handleGenerate,
    onNewTemplate: openNewTemplate,
    onClearAll: handleClearAll,
    onOpenTagManager: () => setTagManagerOpen(true),
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  const editorMemoizedOpen = useMemo(() => openEditCurrentTemplate, [openEditCurrentTemplate]);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        onNewTemplate={openNewTemplate}
        onManageTags={() => setTagManagerOpen(true)}
        onOpenSavedPrompts={() => setSavedPromptsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <Editor onEditTemplateTags={editorMemoizedOpen} />

      <TagManager open={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />
      <SavedPrompts open={savedPromptsOpen} onClose={() => setSavedPromptsOpen(false)} />
      <TemplateEditor
        open={templateEditor.open}
        mode={templateEditor.open ? templateEditor.mode : 'create'}
        templateId={templateEditor.open && templateEditor.mode === 'edit' ? templateEditor.templateId : null}
        onClose={() => setTemplateEditor({ open: false })}
      />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ToastHost />
    </div>
  );
}
