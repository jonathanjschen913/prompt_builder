import { useMemo, useState } from 'react';
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
import type { Tag } from '@shared/types';
import { useAppStore } from '../store';
import { generatePrompt } from '../lib/generate';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { PreviewPanel } from './PreviewPanel';
import { TextareaSection } from './TextareaSection';
import { PendingTagRow } from './PendingTagRow';
import { PlusIcon } from './icons';
import { toast } from './toast';
import { ConfirmDialog } from './Modal';

interface EditorProps {
  onEditTemplateTags: () => void;
}

export function Editor({ onEditTemplateTags }: EditorProps) {
  const templates = useAppStore((s) => s.templates);
  const tags = useAppStore((s) => s.tags);
  const activeId = useAppStore((s) => s.activeTemplateId);
  const draftsByTemplate = useAppStore((s) => s.drafts);
  const setDraft = useAppStore((s) => s.setDraft);
  const clearDrafts = useAppStore((s) => s.clearDrafts);
  const duplicateTemplate = useAppStore((s) => s.duplicateTemplate);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const attachTagByNameToTemplate = useAppStore((s) => s.attachTagByNameToTemplate);
  const removeTagFromTemplatePosition = useAppStore((s) => s.removeTagFromTemplatePosition);
  const reorderTagInTemplate = useAppStore((s) => s.reorderTagInTemplate);
  const saveCurrentPrompt = useAppStore((s) => s.saveCurrentPrompt);
  const undoAction = useAppStore((s) => s.undo);
  const redoAction = useAppStore((s) => s.redo);
  const undoStack = useAppStore((s) => s.undoStack);
  const redoStack = useAppStore((s) => s.redoStack);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [flashPositions, setFlashPositions] = useState<number[]>([]);
  const [flashToken, setFlashToken] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingTagOpen, setPendingTagOpen] = useState(false);

  const template = useMemo(
    () => templates.find((t) => t.id === activeId) ?? null,
    [templates, activeId]
  );
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const drafts = template ? (draftsByTemplate[template.id] ?? {}) : {};

  const liveOutput = useMemo(() => {
    if (!template) return '';
    return generatePrompt(template, tagsById, drafts).output;
  }, [template, tagsById, drafts]);

  if (!template) {
    return (
      <main className="flex h-full flex-1 items-center justify-center text-sm text-slate-500">
        No template selected. Use “+ New Template” in the sidebar.
      </main>
    );
  }

  const isUserTemplate = !template.isBuiltIn;
  const lastUndo = undoStack[undoStack.length - 1] ?? null;
  const lastRedo = redoStack[redoStack.length - 1] ?? null;

  const handleGenerate = async () => {
    const { output, contributingPositions } = generatePrompt(template, tagsById, drafts);
    if (!output) {
      toast('Nothing to copy — fill in at least one field.', 'warn');
      return;
    }
    try {
      await window.api.writeClipboard(output);
      toast('Copied to clipboard', 'success');
      setFlashPositions(contributingPositions);
      setFlashToken((t) => t + 1);
    } catch (err) {
      console.error(err);
      toast('Copy failed', 'error');
    }
  };

  const handleClear = () => {
    clearDrafts(template.id);
  };

  const handleDuplicate = () => {
    const copy = duplicateTemplate(template.id);
    if (copy) toast(`Duplicated as “${copy.name}”`, 'success');
  };

  const handleRequestDelete = () => {
    if (template.isBuiltIn) {
      toast('Built-in templates cannot be deleted.', 'warn');
      return;
    }
    setConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    setConfirmDelete(false);
    const name = template.name;
    deleteTemplate(template.id);
    toast(`Deleted “${name}”`, 'info');
  };

  const handleAddTagClick = () => {
    if (!isUserTemplate) return;
    setPendingTagOpen(true);
  };

  const handleCommitPending = (name: string) => {
    const result = attachTagByNameToTemplate(template.id, name);
    setPendingTagOpen(false);
    if (!result) {
      toast('Could not add tag', 'error');
      return;
    }
    if (result.created) {
      toast(`Created and added “${result.tag.name}”`, 'success');
    } else {
      toast(`Added “${result.tag.name}”`, 'success');
    }
  };

  const handleRemoveTagAt = (positionIndex: number) => {
    if (!isUserTemplate) return;
    removeTagFromTemplatePosition(template.id, positionIndex);
  };

  const handleUndo = () => {
    const entry = undoAction();
    if (entry) toast(`Undid: ${entry.description}`, 'info');
  };

  const handleRedo = () => {
    const entry = redoAction();
    if (entry) toast(`Redid: ${entry.description}`, 'info');
  };

  const handleSavePrompt = () => {
    const prompt = saveCurrentPrompt();
    if (!prompt) {
      toast('Nothing to save — fill in at least one field.', 'warn');
      return;
    }
    toast(`Saved as "${prompt.name}"`, 'success');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(String(active.id).replace('pos-', ''));
    const to = Number(String(over.id).replace('pos-', ''));
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    reorderTagInTemplate(template.id, from, to);
  };

  const sortableIds = template.tagIds.map((_, idx) => `pos-${idx}`);

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden">
      <EditorHeader
        template={template}
        onEditTags={onEditTemplateTags}
        onDuplicate={handleDuplicate}
        onDelete={handleRequestDelete}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        undoLabel={lastUndo?.description ?? null}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        redoLabel={lastRedo?.description ?? null}
      />
      <PreviewPanel open={previewOpen} output={liveOutput} />
      <div className="flex-1 overflow-y-auto px-6 pb-4 pt-4">
        {template.tagIds.length === 0 && !pendingTagOpen ? (
          <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            This template has no tags yet.{' '}
            {isUserTemplate ? (
              <button
                type="button"
                onClick={handleAddTagClick}
                className="text-blue-600 underline hover:text-blue-700"
              >
                Add a tag
              </button>
            ) : (
              <button
                type="button"
                onClick={onEditTemplateTags}
                className="text-blue-600 underline hover:text-blue-700"
              >
                Edit tags
              </button>
            )}
            .
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {template.tagIds.map((tagId, idx) => {
                  const tag = tagsById.get(tagId);
                  if (!tag) return null;
                  const value = drafts[String(idx)] ?? '';
                  const flash = flashPositions.includes(idx) && flashToken > 0;
                  return (
                    <SortableTextareaSection
                      key={`${tagId}-${idx}-${flashToken}`}
                      sortableId={`pos-${idx}`}
                      sortable={isUserTemplate}
                      tag={tag}
                      positionIndex={idx}
                      value={value}
                      onChange={(text) => setDraft(template.id, idx, text)}
                      flash={flash}
                      onRemove={isUserTemplate ? () => handleRemoveTagAt(idx) : undefined}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
            {pendingTagOpen && (
              <PendingTagRow
                onCommit={handleCommitPending}
                onCancel={() => setPendingTagOpen(false)}
              />
            )}
            {isUserTemplate && !pendingTagOpen && (
              <button
                type="button"
                onClick={handleAddTagClick}
                className="inline-flex w-fit items-center gap-1.5 self-start rounded border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
              >
                <PlusIcon /> Add Tag
              </button>
            )}
          </div>
        )}
      </div>
      <EditorToolbar
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((p) => !p)}
        onGenerate={handleGenerate}
        onClear={handleClear}
        onSavePrompt={handleSavePrompt}
        canSavePrompt={liveOutput.length > 0}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete template"
        message={
          <>
            Delete <strong>{template.name}</strong>? This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}

interface SortableTextareaSectionProps {
  sortableId: string;
  sortable: boolean;
  tag: Tag;
  positionIndex: number;
  value: string;
  onChange: (text: string) => void;
  flash: boolean;
  onRemove?: () => void;
}

function SortableTextareaSection({
  sortableId,
  sortable,
  tag,
  positionIndex,
  value,
  onChange,
  flash,
  onRemove,
}: SortableTextareaSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled: !sortable,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style}>
      <TextareaSection
        tag={tag}
        positionIndex={positionIndex}
        value={value}
        onChange={onChange}
        flash={flash}
        onRemove={onRemove}
        dragHandle={
          sortable
            ? {
                attributes: attributes as unknown as Record<string, unknown>,
                listeners: listeners as Record<string, unknown> | undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
