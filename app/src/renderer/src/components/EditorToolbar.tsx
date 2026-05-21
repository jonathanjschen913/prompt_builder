import { BookmarkIcon, CopyIcon } from './icons';

interface EditorToolbarProps {
  previewOpen: boolean;
  onTogglePreview: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onSavePrompt: () => void;
  canSavePrompt: boolean;
  disabled?: boolean;
}

export function EditorToolbar({
  previewOpen,
  onTogglePreview,
  onGenerate,
  onClear,
  onSavePrompt,
  canSavePrompt,
  disabled,
}: EditorToolbarProps) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePreview}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {previewOpen ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSavePrompt}
          disabled={disabled || !canSavePrompt}
          title={canSavePrompt ? 'Save current prompt' : 'Fill in at least one field to save'}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <BookmarkIcon /> Save Prompt
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          title="Generate & Copy (Ctrl+Enter)"
        >
          <CopyIcon /> Generate & Copy
        </button>
      </div>
    </div>
  );
}
