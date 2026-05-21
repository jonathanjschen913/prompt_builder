interface PreviewPanelProps {
  open: boolean;
  output: string;
}

export function PreviewPanel({ open, output }: PreviewPanelProps) {
  if (!open) return null;
  return (
    <div className="mx-6 mb-3 mt-2 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Preview
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-xs leading-relaxed">
        {output ? <ColoredOutput text={output} /> : <span className="text-slate-400">(empty)</span>}
      </pre>
    </div>
  );
}

function ColoredOutput({ text }: { text: string }) {
  const parts: { kind: 'tag' | 'content'; value: string }[] = [];
  const re = /<\/?[a-z][a-z0-9_]*>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: 'content', value: text.slice(last, m.index) });
    parts.push({ kind: 'tag', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'content', value: text.slice(last) });
  return (
    <>
      {parts.map((p, i) =>
        p.kind === 'tag' ? (
          <span key={i} className="text-cyan-700 dark:text-cyan-300">
            {p.value}
          </span>
        ) : (
          <span key={i} className="text-slate-800 dark:text-slate-200">
            {p.value}
          </span>
        )
      )}
    </>
  );
}
