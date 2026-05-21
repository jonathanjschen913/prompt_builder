import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Template } from '@shared/types';
import { useAppStore } from '../store';
import { validateTemplateName } from '../lib/validate';
import { DragIcon, PencilIcon, PlusIcon, SettingsIcon } from './icons';
import { toast } from './toast';

interface SidebarProps {
  onNewTemplate: () => void;
  onManageTags: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onNewTemplate, onManageTags, onOpenSettings }: SidebarProps) {
  const templates = useAppStore((s) => s.templates);
  const activeId = useAppStore((s) => s.activeTemplateId);
  const selectTemplate = useAppStore((s) => s.selectTemplate);
  const reorderTemplates = useAppStore((s) => s.reorderTemplates);
  const updateTemplate = useAppStore((s) => s.updateTemplate);

  const [renamingId, setRenamingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderTemplates(String(active.id), String(over.id));
  }

  function handleCommitRename(id: string, newName: string) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) {
      setRenamingId(null);
      return;
    }
    const trimmed = newName.trim();
    if (!trimmed || trimmed === tpl.name) {
      setRenamingId(null);
      return;
    }
    const otherNames = templates.filter((t) => t.id !== id).map((t) => t.name);
    const v = validateTemplateName(trimmed, otherNames);
    if (!v.ok) {
      toast(v.error ?? 'Invalid name', 'error');
      return;
    }
    updateTemplate(id, { name: trimmed });
    toast(`Renamed to "${trimmed}"`, 'success');
    setRenamingId(null);
  }

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight">Prompt Builder</h1>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </header>
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={templates.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-0.5">
              {templates.map((tpl) => (
                <SortableTemplateRow
                  key={tpl.id}
                  template={tpl}
                  active={tpl.id === activeId}
                  renaming={renamingId === tpl.id}
                  onSelect={() => selectTemplate(tpl.id)}
                  onStartRename={() => setRenamingId(tpl.id)}
                  onCommitRename={(name) => handleCommitRename(tpl.id, name)}
                  onCancelRename={() => setRenamingId(null)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </nav>
      <footer className="flex flex-col gap-1 border-t border-slate-200 p-2 dark:border-slate-800">
        <button
          type="button"
          onClick={onNewTemplate}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <PlusIcon /> New Template
        </button>
        <button
          type="button"
          onClick={onManageTags}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Manage Tags
        </button>
      </footer>
    </aside>
  );
}

interface SortableTemplateRowProps {
  template: Template;
  active: boolean;
  renaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
}

function SortableTemplateRow({
  template,
  active,
  renaming,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
}: SortableTemplateRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: template.id,
    disabled: renaming,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <li ref={setNodeRef} style={style} className="group flex items-stretch">
      {!renaming && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={`flex shrink-0 cursor-grab touch-none items-center rounded-l px-1.5 text-slate-300 hover:bg-slate-200 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400 ${
            active ? 'text-slate-400 dark:text-slate-500' : ''
          }`}
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <DragIcon width={12} height={12} />
        </button>
      )}
      {renaming ? (
        <RenameField
          initial={template.name}
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={onSelect}
            className={`group flex min-w-0 flex-1 items-center justify-between px-2 py-1.5 text-left text-sm transition ${
              active
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <span className="truncate">{template.name}</span>
            {template.isBuiltIn && (
              <span className="ml-2 shrink-0 rounded-sm bg-slate-300 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                built-in
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className={`flex shrink-0 items-center rounded-r px-1.5 transition ${
              active
                ? 'text-blue-500/60 hover:bg-blue-200 hover:text-blue-800 dark:text-blue-300/60 dark:hover:bg-blue-900/60 dark:hover:text-blue-100'
                : 'text-slate-300 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
            title="Rename template"
            aria-label="Rename template"
          >
            <PencilIcon width={12} height={12} />
          </button>
        </>
      )}
    </li>
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
      className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500 dark:bg-slate-900"
    />
  );
}
