import { useEffect, useMemo, useRef, useState } from 'react';
import type { SavedPrompt } from '@shared/types';
import { useAppStore } from '../store';
import { ConfirmDialog, Modal } from './Modal';
import { CopyIcon, PencilIcon, TrashIcon } from './icons';
import { toast } from './toast';

interface SavedPromptsProps {
  open: boolean;
  onClose: () => void;
}

export function SavedPrompts({ open, onClose }: SavedPromptsProps) {
  const savedPrompts = useAppStore((s) => s.savedPrompts);
  const templates = useAppStore((s) => s.templates);
  const renameSavedPrompt = useAppStore((s) => s.renameSavedPrompt);
  const deleteSavedPrompt = useAppStore((s) => s.deleteSavedPrompt);
  const loadSavedPrompt = useAppStore((s) => s.loadSavedPrompt);

  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedPrompt | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRenamingId(null);
      setPendingDelete(null);
      setExpandedId(null);
      setSearch('');
    }
  }, [open]);

  const templateExistsById = useMemo(() => {
    const ids = new Set(templates.map((t) => t.id));
    return (id: string) => ids.has(id);
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...savedPrompts].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.templateName.toLowerCase().includes(q) ||
        p.output.toLowerCase().includes(q)
    );
  }, [savedPrompts, search]);

  function handleCommitRename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    renameSavedPrompt(id, trimmed);
    setRenamingId(null);
  }

  function handleLoad(prompt: SavedPrompt) {
    const result = loadSavedPrompt(prompt.id);
    if (result.kind === 'restored') {
      toast(`Loaded "${prompt.name}"`, 'success');
      onClose();
    } else if (result.kind === 'template_missing') {
      void window.api.writeClipboard(prompt.output).then(
        () => toast(`Template was deleted — copied output of "${prompt.name}" to clipboard`, 'warn'),
        () => toast('Template was deleted and copy failed', 'error')
      );
    } else {
      toast('Saved prompt not found', 'error');
    }
  }

  async function handleCopy(prompt: SavedPrompt) {
    try {
      await window.api.writeClipboard(prompt.output);
      toast(`Copied "${prompt.name}" to clipboard`, 'success');
    } catch (err) {
      console.error(err);
      toast('Copy failed', 'error');
    }
  }

  function handleRequestDelete(prompt: SavedPrompt) {
    setPendingDelete(prompt);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    deleteSavedPrompt(id);
    toast(`Deleted "${name}"`, 'info');
    setPendingDelete(null);
  }

  return (
    <>
      <Modal open={open} title="Saved Prompts" onClose={onClose} widthClass="max-w-3xl">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, template, or content…"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {search.trim()
              ? `${filtered.length} of ${savedPrompts.length} prompt${savedPrompts.length === 1 ? '' : 's'} matching "${search.trim()}"`
              : `${savedPrompts.length} saved prompt${savedPrompts.length === 1 ? '' : 's'}. Click Load to restore one to the editor.`}
          </p>

          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                {savedPrompts.length === 0
                  ? 'No saved prompts yet. Use Save Prompt in the editor toolbar to capture one.'
                  : 'No saved prompts match your search.'}
              </li>
            )}
            {filtered.map((prompt) => {
              const exists = templateExistsById(prompt.templateId);
              const expanded = expandedId === prompt.id;
              return (
                <li key={prompt.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      {renamingId === prompt.id ? (
                        <RenameField
                          initial={prompt.name}
                          onCommit={(v) => handleCommitRename(prompt.id, v)}
                          onCancel={() => setRenamingId(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {prompt.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRenamingId(prompt.id)}
                            title="Rename"
                            aria-label="Rename"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <PencilIcon width={12} height={12} />
                          </button>
                          {!exists && (
                            <span className="rounded-sm bg-amber-100 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                              template gone
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{prompt.templateName}</span>
                        <span aria-hidden> · </span>
                        <span>{formatRelativeTime(prompt.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleLoad(prompt)}
                        disabled={!exists}
                        title={exists ? 'Restore drafts into the editor' : 'Original template was deleted'}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Load
                      </button>
                      <IconButton title="Copy output to clipboard" onClick={() => void handleCopy(prompt)}>
                        <CopyIcon />
                      </IconButton>
                      <IconButton title="Delete" destructive onClick={() => handleRequestDelete(prompt)}>
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : prompt.id)}
                    className="mt-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {expanded ? 'Hide preview' : 'Show preview'}
                  </button>
                  {expanded && (
                    <pre className="mt-2 max-h-48 overflow-auto rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      {prompt.output}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete saved prompt"
        destructive
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        message={
          pendingDelete ? (
            <p>
              Delete <strong>{pendingDelete.name}</strong>? This cannot be undone.
            </p>
          ) : null
        }
      />
    </>
  );
}

interface RenameFieldProps {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

function RenameField({ initial, onCommit, onCancel }: RenameFieldProps) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit(value)}
      className="w-full rounded border border-blue-400 bg-white px-2 py-1 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500 dark:bg-slate-900"
    />
  );
}

function IconButton({
  title,
  onClick,
  destructive,
  children,
}: {
  title: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded p-1.5 ${
        destructive
          ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const d = new Date(ts);
  return d.toLocaleDateString();
}
