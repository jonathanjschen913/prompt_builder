import { useEffect, useRef, useState } from 'react';
import type { Template } from '@shared/types';
import { useAppStore } from '../store';
import { validateTemplateName } from '../lib/validate';
import { MoreIcon, PencilIcon, RedoIcon, UndoIcon } from './icons';
import { toast } from './toast';

interface EditorHeaderProps {
  template: Template;
  onEditTags: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  canUndo: boolean;
  undoLabel: string | null;
  onRedo: () => void;
  canRedo: boolean;
  redoLabel: string | null;
}

export function EditorHeader({
  template,
  onEditTags,
  onDuplicate,
  onDelete,
  onUndo,
  canUndo,
  undoLabel,
  onRedo,
  canRedo,
  redoLabel,
}: EditorHeaderProps) {
  const updateTemplate = useAppStore((s) => s.updateTemplate);
  const allTemplates = useAppStore((s) => s.templates);

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(template.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(template.name);
    setRenaming(false);
  }, [template.id, template.name]);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function commitRename() {
    const v = validateTemplateName(
      draftName,
      allTemplates.map((t) => t.name),
      template.name
    );
    if (!v.ok) {
      toast(v.error ?? 'Invalid name', 'error');
      setDraftName(template.name);
      setRenaming(false);
      return;
    }
    if (draftName.trim() !== template.name) {
      updateTemplate(template.id, { name: draftName.trim() });
    }
    setRenaming(false);
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-3 dark:border-slate-800">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {renaming ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitRename();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraftName(template.name);
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-lg font-semibold dark:border-slate-700 dark:bg-slate-900"
          />
        ) : (
          <>
            <h2 className="truncate text-lg font-semibold tracking-tight">{template.name}</h2>
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Rename"
              aria-label="Rename template"
            >
              <PencilIcon />
            </button>
            {template.isBuiltIn && (
              <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                built-in
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={canUndo ? `Undo: ${undoLabel ?? ''} (Ctrl+Z)` : 'Nothing to undo'}
          aria-label="Undo"
          className="rounded p-1.5 text-slate-500 enabled:hover:bg-slate-100 enabled:hover:text-slate-800 disabled:opacity-40 dark:enabled:hover:bg-slate-800 dark:enabled:hover:text-slate-200"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title={canRedo ? `Redo: ${redoLabel ?? ''} (Ctrl+Y)` : 'Nothing to redo'}
          aria-label="Redo"
          className="rounded p-1.5 text-slate-500 enabled:hover:bg-slate-100 enabled:hover:text-slate-800 disabled:opacity-40 dark:enabled:hover:bg-slate-800 dark:enabled:hover:text-slate-200"
        >
          <RedoIcon />
        </button>
      </div>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Template actions"
        >
          <MoreIcon />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <MenuItem
              label="Rename"
              onClick={() => {
                setMenuOpen(false);
                setRenaming(true);
              }}
            />
            <MenuItem
              label="Edit Tags"
              onClick={() => {
                setMenuOpen(false);
                onEditTags();
              }}
            />
            <MenuItem
              label="Duplicate"
              onClick={() => {
                setMenuOpen(false);
                onDuplicate();
              }}
            />
            <MenuItem
              label="Delete"
              disabled={template.isBuiltIn}
              destructive
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({
  label,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full px-3 py-1.5 text-left text-sm ${
        disabled
          ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
          : destructive
            ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
}
