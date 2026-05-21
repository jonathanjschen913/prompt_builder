import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Tag } from '@shared/types';
import { useAppStore } from '../store';
import { nextAutoTemplateName, validateTemplateName } from '../lib/validate';
import { ConfirmDialog, Modal } from './Modal';
import { DragIcon, PlusIcon, XIcon } from './icons';
import { toast } from './toast';

export interface TemplateEditorProps {
  open: boolean;
  mode: 'create' | 'edit';
  templateId?: string | null;
  onClose: () => void;
}

interface Row {
  rowId: string;
  tagId: string;
}

let rowSeq = 1;
function newRow(tagId: string): Row {
  return { rowId: `row-${rowSeq++}`, tagId };
}

export function TemplateEditor({ open, mode, templateId, onClose }: TemplateEditorProps) {
  const tags = useAppStore((s) => s.tags);
  const templates = useAppStore((s) => s.templates);
  const createTemplate = useAppStore((s) => s.createTemplate);
  const updateTemplate = useAppStore((s) => s.updateTemplate);
  const selectTemplate = useAppStore((s) => s.selectTemplate);

  const editingOriginal = useMemo(
    () => (mode === 'edit' && templateId ? templates.find((t) => t.id === templateId) ?? null : null),
    [mode, templateId, templates]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revertOpen, setRevertOpen] = useState(false);
  const [pickerTagId, setPickerTagId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && editingOriginal) {
      setName(editingOriginal.name);
      setDescription(editingOriginal.description);
      setRows(editingOriginal.tagIds.map((tid) => newRow(tid)));
    } else {
      setName('');
      setDescription('');
      setRows([]);
    }
    setError(null);
    setPickerTagId('');
  }, [open, mode, editingOriginal]);

  const visibleTags = useMemo(() => tags.filter((t) => !t.isHidden), [tags]);
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((rs) => {
      const from = rs.findIndex((r) => r.rowId === active.id);
      const to = rs.findIndex((r) => r.rowId === over.id);
      if (from < 0 || to < 0) return rs;
      return arrayMove(rs, from, to);
    });
  }

  function addTag() {
    if (!pickerTagId) return;
    setRows((rs) => [...rs, newRow(pickerTagId)]);
    setPickerTagId('');
  }

  function removeRow(rowId: string) {
    setRows((rs) => rs.filter((r) => r.rowId !== rowId));
  }

  function handleSave() {
    const otherNames = templates
      .filter((t) => t.id !== editingOriginal?.id)
      .map((t) => t.name);
    const trimmed = name.trim();
    let finalName: string;
    if (!trimmed) {
      finalName = nextAutoTemplateName(otherNames);
    } else {
      const v = validateTemplateName(trimmed, otherNames);
      if (!v.ok) {
        setError(v.error ?? 'Invalid name');
        return;
      }
      finalName = trimmed;
    }
    const tagIds = rows.map((r) => r.tagId);
    if (mode === 'create') {
      const tpl = createTemplate({ name: finalName, description, tagIds });
      toast(`Created "${tpl.name}"`, 'success');
    } else if (editingOriginal) {
      updateTemplate(editingOriginal.id, { name: finalName, description, tagIds });
      selectTemplate(editingOriginal.id);
      toast(`Saved "${finalName}"`, 'success');
    }
    onClose();
  }

  function performRevert() {
    if (mode === 'edit' && editingOriginal) {
      setName(editingOriginal.name);
      setDescription(editingOriginal.description);
      setRows(editingOriginal.tagIds.map((tid) => newRow(tid)));
      setError(null);
      toast('Reverted to last saved state', 'info');
    }
    setRevertOpen(false);
  }

  const hasUnsavedChanges = useMemo(() => {
    if (mode !== 'edit' || !editingOriginal) return false;
    if (name !== editingOriginal.name) return true;
    if (description !== editingOriginal.description) return true;
    const currentIds = rows.map((r) => r.tagId);
    if (currentIds.length !== editingOriginal.tagIds.length) return true;
    for (let i = 0; i < currentIds.length; i++) {
      if (currentIds[i] !== editingOriginal.tagIds[i]) return true;
    }
    return false;
  }, [mode, editingOriginal, name, description, rows]);

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'New Template' : `Edit "${editingOriginal?.name ?? ''}"`}
      onClose={onClose}
      widthClass="max-w-2xl"
      footer={
        <>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => setRevertOpen(true)}
              disabled={!hasUnsavedChanges}
              className="mr-auto rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Discard unsaved changes and reload from last save"
            >
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Name <span className="font-normal text-slate-400">(optional — auto-named if blank)</span>
          </span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder={
              mode === 'create'
                ? nextAutoTemplateName(templates.map((t) => t.name))
                : 'e.g., Research Brief'
            }
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Description (optional)
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this template is for."
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Tags (drag to reorder)
            </span>
            <span className="text-xs text-slate-500">
              {rows.length} {rows.length === 1 ? 'tag' : 'tags'}
            </span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={rows.map((r) => r.rowId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/50">
                {rows.length === 0 && (
                  <li className="px-2 py-3 text-center text-sm text-slate-500">
                    No tags yet. Add one below.
                  </li>
                )}
                {rows.map((row) => {
                  const tag = tagsById.get(row.tagId);
                  return (
                    <SortableRow
                      key={row.rowId}
                      rowId={row.rowId}
                      tag={tag}
                      onRemove={() => removeRow(row.rowId)}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="mt-3 flex items-center gap-2">
            <select
              value={pickerTagId}
              onChange={(e) => setPickerTagId(e.target.value)}
              className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select a tag to add…</option>
              {visibleTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addTag}
              disabled={!pickerTagId}
              className="inline-flex items-center gap-1.5 rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
            >
              <PlusIcon /> Add
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={revertOpen}
        title="Discard unsaved changes?"
        message={
          <>
            This will reload the template from the last saved state. Any unsaved edits in this
            modal will be lost.
          </>
        }
        confirmLabel="Discard changes"
        destructive
        onCancel={() => setRevertOpen(false)}
        onConfirm={performRevert}
      />
    </Modal>
  );
}

function SortableRow({
  rowId,
  tag,
  onRemove,
}: {
  rowId: string;
  tag: Tag | undefined;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded bg-white px-2 py-1.5 shadow-sm dark:bg-slate-900"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        {...attributes}
        {...listeners}
        aria-label="Drag handle"
      >
        <DragIcon />
      </button>
      <span className="font-mono text-sm">
        {tag?.name ?? <span className="text-rose-600">(missing tag)</span>}
      </span>
      {tag?.description && (
        <span className="truncate text-xs text-slate-500">{tag.description}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-auto rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
        aria-label="Remove"
        title="Remove"
      >
        <XIcon />
      </button>
    </li>
  );
}
