import { useMemo, useState } from 'react';
import type { Tag } from '@shared/types';
import { useAppStore } from '../store';
import { validateTagName } from '../lib/validate';
import { Modal, ConfirmDialog } from './Modal';
import { EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, TrashIcon } from './icons';
import { toast } from './toast';

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
}

interface EditState {
  mode: 'create' | 'edit';
  id?: string;
  name: string;
  description: string;
  placeholder: string;
  error: string | null;
}

function emptyForm(): EditState {
  return { mode: 'create', name: '', description: '', placeholder: '', error: null };
}

export function TagManager({ open, onClose }: TagManagerProps) {
  const tags = useAppStore((s) => s.tags);
  const templates = useAppStore((s) => s.templates);
  const createTag = useAppStore((s) => s.createTag);
  const updateTag = useAppStore((s) => s.updateTag);
  const deleteTag = useAppStore((s) => s.deleteTag);
  const setTagHidden = useAppStore((s) => s.setTagHidden);

  const [form, setForm] = useState<EditState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    tag: Tag;
    affected: { id: string; name: string }[];
  } | null>(null);
  const [search, setSearch] = useState('');

  const allNames = useMemo(() => tags.map((t) => t.name), [tags]);

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, search]);

  function startCreate() {
    setForm(emptyForm());
  }
  function startEdit(tag: Tag) {
    setForm({
      mode: 'edit',
      id: tag.id,
      name: tag.name,
      description: tag.description,
      placeholder: tag.placeholder,
      error: null,
    });
  }
  function cancelForm() {
    setForm(null);
  }
  function submitForm() {
    if (!form) return;
    const validation = validateTagName(
      form.name,
      allNames,
      form.mode === 'edit'
        ? tags.find((t) => t.id === form.id)?.name
        : undefined
    );
    if (!validation.ok) {
      setForm({ ...form, error: validation.error ?? 'Invalid name' });
      return;
    }
    if (form.mode === 'create') {
      createTag({
        name: form.name,
        description: form.description,
        placeholder: form.placeholder,
      });
      toast(`Created tag "${form.name.trim()}"`, 'success');
    } else if (form.id) {
      updateTag(form.id, {
        name: form.name,
        description: form.description,
        placeholder: form.placeholder,
      });
      toast(`Updated tag "${form.name.trim()}"`, 'success');
    }
    setForm(null);
  }

  function requestDelete(tag: Tag) {
    const affected = templates
      .filter((tpl) => tpl.tagIds.includes(tag.id))
      .map((tpl) => ({ id: tpl.id, name: tpl.name }));
    setPendingDelete({ tag, affected });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const { tag } = pendingDelete;
    deleteTag(tag.id);
    toast(`Deleted "${tag.name}"`, 'info');
    setPendingDelete(null);
  }

  return (
    <>
      <Modal open={open} title="Manage Tags" onClose={onClose} widthClass="max-w-3xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags by name…"
              className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon /> New Tag
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {search.trim()
              ? `${filteredTags.length} of ${tags.length} tag${tags.length === 1 ? '' : 's'} matching "${search.trim()}"`
              : `${tags.length} tag${tags.length === 1 ? '' : 's'} · built-ins can be hidden but not deleted.`}
          </p>

          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {filteredTags.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                {tags.length === 0 ? 'No tags yet.' : 'No tags match your search.'}
              </li>
            )}
            {filteredTags.map((tag) => (
              <li key={tag.id} className="flex items-start gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{tag.name}</span>
                    {tag.isBuiltIn && (
                      <span className="rounded-sm bg-slate-200 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        built-in
                      </span>
                    )}
                    {tag.isHidden && (
                      <span className="rounded-sm bg-amber-100 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        hidden
                      </span>
                    )}
                  </div>
                  {tag.description && (
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {tag.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <IconButton title="Edit" onClick={() => startEdit(tag)}>
                    <PencilIcon />
                  </IconButton>
                  {tag.isBuiltIn ? (
                    <IconButton
                      title={tag.isHidden ? 'Show' : 'Hide'}
                      onClick={() => setTagHidden(tag.id, !tag.isHidden)}
                    >
                      {tag.isHidden ? <EyeIcon /> : <EyeOffIcon />}
                    </IconButton>
                  ) : (
                    <IconButton title="Delete" destructive onClick={() => requestDelete(tag)}>
                      <TrashIcon />
                    </IconButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      {form && (
        <Modal
          open={true}
          title={form.mode === 'create' ? 'New Tag' : 'Edit Tag'}
          onClose={cancelForm}
          widthClass="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitForm}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                {form.mode === 'create' ? 'Create' : 'Save'}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, error: null })}
                placeholder="lowercase_underscored"
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                autoFocus
              />
              <p className="mt-1 text-xs text-slate-500">
                Lowercase letters, digits, and underscores. Must start with a letter.
              </p>
              {form.error && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{form.error}</p>
              )}
            </Field>
            <Field label="Description (optional)">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Helper text shown near the input."
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
            <Field label="Placeholder (optional)">
              <textarea
                value={form.placeholder}
                onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
                placeholder="Shown inside the empty input."
                rows={3}
                className="w-full resize-y rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete tag"
        destructive
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        message={
          pendingDelete ? (
            <>
              <p>
                Delete <strong>{pendingDelete.tag.name}</strong>?
              </p>
              {pendingDelete.affected.length > 0 && (
                <>
                  <p className="mt-2">It is used in:</p>
                  <ul className="mt-1 list-inside list-disc text-slate-600 dark:text-slate-400">
                    {pendingDelete.affected.map((t) => (
                      <li key={t.id}>{t.name}</li>
                    ))}
                  </ul>
                  <p className="mt-2">It will be removed from those templates.</p>
                </>
              )}
            </>
          ) : null
        }
      />
    </>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}
