import type { ThemePreference } from '@shared/types';

export function applyTheme(pref: ThemePreference): void {
  const root = document.documentElement;
  const resolved = resolveTheme(pref);
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}

export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
