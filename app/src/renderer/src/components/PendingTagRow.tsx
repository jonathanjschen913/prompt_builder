import { useEffect, useMemo, useRef, useState } from 'react';
import type { Tag } from '@shared/types';
import { TAG_NAME_PATTERN } from '@shared/types';
import { useAppStore } from '../store';
import { PlusIcon, XIcon } from './icons';

interface PendingTagRowProps {
  onCommit: (name: string) => void;
  onCancel: () => void;
}

type PickerItem =
  | { kind: 'create'; name: string; valid: boolean; error: string | null }
  | { kind: 'existing'; tag: Tag };

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (!TAG_NAME_PATTERN.test(trimmed)) {
    return 'Lowercase letters, digits, underscores only.';
  }
  return null;
}

function computeDefaultHighlight(items: PickerItem[]): number {
  if (items.length === 0) return 0;
  if (items[0]?.kind === 'create' && items.length > 1) {
    const firstExisting = items.findIndex((i) => i.kind === 'existing');
    return firstExisting >= 0 ? firstExisting : 0;
  }
  return 0;
}

export function PendingTagRow({ onCommit, onCancel }: PendingTagRowProps) {
  const tags = useAppStore((s) => s.tags);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  const items = useMemo<PickerItem[]>(() => {
    const q = query.trim().toLowerCase();
    const visibleTags = tags.filter((t) => !t.isHidden);
    const sorted = [...visibleTags].sort((a, b) => a.name.localeCompare(b.name));
    const filtered = q ? sorted.filter((t) => t.name.toLowerCase().includes(q)) : sorted;
    const trimmedQ = query.trim();
    const exactMatch = q ? visibleTags.find((t) => t.name.toLowerCase() === q) : null;

    const result: PickerItem[] = [];
    if (trimmedQ && !exactMatch) {
      const err = validateName(trimmedQ);
      result.push({ kind: 'create', name: trimmedQ, valid: err === null, error: err });
    }
    filtered.forEach((tag) => result.push({ kind: 'existing', tag }));
    return result;
  }, [tags, query]);

  useEffect(() => {
    setHighlightIndex(computeDefaultHighlight(items));
  }, [items]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${highlightIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const selectAt = (idx: number) => {
    const item = items[idx];
    if (!item) return;
    if (item.kind === 'create') {
      if (!item.valid) return;
      onCommit(item.name);
    } else {
      onCommit(item.tag.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length === 0) return;
      setHighlightIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length === 0) return;
      setHighlightIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectAt(highlightIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <section
      ref={containerRef}
      className="overflow-hidden rounded-md border border-blue-400 bg-white shadow-md dark:border-blue-500 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 p-2 dark:border-slate-800">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tags or type a new name…"
          className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onCancel();
          }}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Cancel"
          aria-label="Cancel"
        >
          <XIcon />
        </button>
      </div>

      <ul ref={listRef} className="max-h-72 overflow-y-auto py-1">
        {items.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-500">
            No tags match. Type a valid name to create one.
          </li>
        )}
        {items.map((item, idx) => {
          const isHighlighted = idx === highlightIndex;
          if (item.kind === 'create') {
            return (
              <li key="__create__">
                <button
                  type="button"
                  data-idx={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (item.valid) selectAt(idx);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  disabled={!item.valid}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                    !item.valid
                      ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : isHighlighted
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40'
                  }`}
                >
                  <PlusIcon width={14} height={14} />
                  <span className="truncate">
                    Create new tag:{' '}
                    <span className="font-mono font-semibold">{item.name}</span>
                  </span>
                  {item.error && (
                    <span
                      className={`ml-auto truncate text-xs ${
                        isHighlighted ? 'text-white/80' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.error}
                    </span>
                  )}
                </button>
              </li>
            );
          }
          return (
            <li key={item.tag.id}>
              <button
                type="button"
                data-idx={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectAt(idx);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm ${
                  isHighlighted
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="shrink-0 font-mono">{item.tag.name}</span>
                {item.tag.description && (
                  <span
                    className={`min-w-0 truncate text-xs ${
                      isHighlighted
                        ? 'text-blue-700/80 dark:text-blue-200/70'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.tag.description}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-slate-200 px-3 py-1 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <kbd>↑</kbd>/<kbd>↓</kbd> navigate · <kbd>Enter</kbd> select · <kbd>Esc</kbd> cancel
      </div>
    </section>
  );
}
