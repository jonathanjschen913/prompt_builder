import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'warn' | 'error';
}

interface ToastStore {
  items: ToastItem[];
  push: (message: string, tone?: ToastItem['tone'], durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let counter = 1;

export const useToastStore = create<ToastStore>((set, get) => ({
  items: [],
  push(message, tone = 'success', durationMs = 2000) {
    const id = counter++;
    set((s) => ({ items: [...s.items, { id, message, tone }] }));
    setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },
}));

export function toast(
  message: string,
  tone: ToastItem['tone'] = 'success',
  durationMs = 2000
): void {
  useToastStore.getState().push(message, tone, durationMs);
}
