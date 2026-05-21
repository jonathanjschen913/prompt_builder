import { useEffect } from 'react';

export interface ShortcutHandlers {
  onGenerate?: () => void;
  onNewTemplate?: () => void;
  onClearAll?: () => void;
  onOpenTagManager?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    if (handlers.enabled === false) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        if (isEditableTarget(e.target)) return;
        if (handlers.onUndo) {
          e.preventDefault();
          handlers.onUndo();
        }
        return;
      }

      if (key === 'y') {
        if (isEditableTarget(e.target)) return;
        if (handlers.onRedo) {
          e.preventDefault();
          handlers.onRedo();
        }
        return;
      }

      if (key === 'enter') {
        if (handlers.onGenerate) {
          e.preventDefault();
          handlers.onGenerate();
        }
      } else if (key === 'n') {
        if (handlers.onNewTemplate) {
          e.preventDefault();
          handlers.onNewTemplate();
        }
      } else if (key === 'l') {
        if (handlers.onClearAll) {
          e.preventDefault();
          handlers.onClearAll();
        }
      } else if (e.key === ',') {
        if (handlers.onOpenTagManager) {
          e.preventDefault();
          handlers.onOpenTagManager();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    handlers.onGenerate,
    handlers.onNewTemplate,
    handlers.onClearAll,
    handlers.onOpenTagManager,
    handlers.onUndo,
    handlers.onRedo,
    handlers.enabled,
  ]);
}
