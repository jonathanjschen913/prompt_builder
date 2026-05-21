import { useToastStore } from './toast';

const toneClasses: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  info: 'bg-slate-700 text-white',
  warn: 'bg-amber-500 text-white',
  error: 'bg-rose-600 text-white',
};

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md px-4 py-2 text-sm font-medium shadow-lg ${
            toneClasses[t.tone] ?? toneClasses['info']
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
