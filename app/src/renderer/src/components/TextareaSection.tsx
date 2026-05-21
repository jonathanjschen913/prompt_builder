import { useEffect, useRef } from 'react';
import type { Tag } from '@shared/types';
import { DragIcon, TrashIcon } from './icons';

interface DragHandleProps {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
}

interface TextareaSectionProps {
  tag: Tag;
  positionIndex: number;
  value: string;
  onChange: (text: string) => void;
  flash: boolean;
  onRemove?: () => void;
  dragHandle?: DragHandleProps;
}

export function TextareaSection({
  tag,
  positionIndex,
  value,
  onChange,
  flash,
  onRemove,
  dragHandle,
}: TextareaSectionProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flash) return;
    const node = flashRef.current;
    if (!node) return;
    node.classList.add('ring-2', 'ring-emerald-400', 'ring-offset-1');
    const id = setTimeout(() => {
      node.classList.remove('ring-2', 'ring-emerald-400', 'ring-offset-1');
    }, 700);
    return () => clearTimeout(id);
  }, [flash]);

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {dragHandle && (
          <button
            type="button"
            {...dragHandle.attributes}
            {...(dragHandle.listeners ?? {})}
            className="shrink-0 cursor-grab touch-none rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <DragIcon width={14} height={14} />
          </button>
        )}
        <label
          htmlFor={`textarea-${tag.id}-${positionIndex}`}
          className="flex min-w-0 flex-1 items-baseline gap-2"
        >
          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
            {tag.name}
          </span>
          {tag.description && (
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              {tag.description}
            </span>
          )}
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded p-1 text-slate-400 opacity-60 transition hover:bg-rose-50 hover:text-rose-600 hover:opacity-100 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            title={`Remove ${tag.name} from this template`}
            aria-label={`Remove ${tag.name}`}
          >
            <TrashIcon width={14} height={14} />
          </button>
        )}
      </div>
      <div ref={flashRef} className="rounded-md transition">
        <textarea
          id={`textarea-${tag.id}-${positionIndex}`}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tag.placeholder}
          rows={4}
          className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
    </section>
  );
}
