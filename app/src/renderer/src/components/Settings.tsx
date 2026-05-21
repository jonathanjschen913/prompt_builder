import type { ThemePreference } from '@shared/types';
import { useAppStore } from '../store';
import { Modal } from './Modal';
import { toast } from './toast';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Settings({ open, onClose }: SettingsProps) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const replaceAll = useAppStore((s) => s.replaceAll);

  async function handleExport() {
    try {
      const ok = await window.api.exportData();
      if (ok) toast('Exported data file', 'success');
    } catch (err) {
      console.error(err);
      toast('Export failed', 'error');
    }
  }

  async function handleImport() {
    try {
      const next = await window.api.importData();
      if (next) {
        replaceAll(next);
        toast('Imported data file', 'success');
      }
    } catch (err) {
      console.error(err);
      toast('Import failed', 'error');
    }
  }

  return (
    <Modal open={open} title="Settings" onClose={onClose} widthClass="max-w-md">
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Theme</h3>
          <div className="flex gap-1.5">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  theme === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-200'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Backup & Restore
          </h3>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Export your full tag and template library to JSON, or replace everything from a
            previously-exported file.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Export…
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Import…
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
