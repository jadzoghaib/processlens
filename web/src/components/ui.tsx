import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CAT_COLOR, CAT_ORDER, CAT_SHORT } from '../lib/fmt';
import { useStore } from '../lib/data';

/* ---------- animated KPI tile (rAF count-up, ease-out) ---------- */
export function Kpi({ value, label, sub, tone, format }: {
  value: number; label: string; sub?: string;
  tone?: 'good' | 'warn' | 'bad';
  format: (v: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const t0 = performance.now(), dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setDisplay(value * (1 - Math.pow(1 - p, 3)));   // cubic ease-out
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // settle guard: throttled/hidden tabs and reduced-motion environments never
    // tick rAF — always land on the true value.
    const settle = window.setTimeout(() => setDisplay(value), dur + 300);
    return () => { cancelAnimationFrame(raf.current); window.clearTimeout(settle); };
  }, [value]);
  const color = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="bg-panel border border-line rounded-xl px-4 py-3.5">
      <div className={`text-2xl font-bold tracking-tight ${color}`}>{format(display)}</div>
      <div className="text-ink2 text-[11px] uppercase tracking-wider mt-1.5">{label}</div>
      {sub && <div className="text-ink3 text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}

/* ---------- card with optional table-view toggle (a11y: a table always exists) ---------- */
export function Card({ title, hint, children, table }: {
  title: string; hint?: string; children: ReactNode; table?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="bg-panel border border-line rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-[1.4px] text-ink2">
          {title} {hint && <span className="normal-case tracking-normal text-ink3 font-normal ml-1">{hint}</span>}
        </h3>
        {table && (
          <button onClick={() => setShowTable(s => !s)}
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-line text-ink3 hover:text-ink hover:border-ink3 cursor-pointer">
            {showTable ? 'chart' : 'table'}
          </button>
        )}
      </div>
      {table && showTable ? table : children}
    </div>
  );
}

/* ---------- pill ---------- */
export function Pill({ children, tone }: { children: ReactNode; tone?: 'good' | 'warn' | 'bad' | 'info' }) {
  const c = tone === 'good' ? 'text-good border-good' : tone === 'warn' ? 'text-warn border-warn'
    : tone === 'bad' ? 'text-bad border-bad bg-bad/10' : tone === 'info' ? 'text-cat4 border-cat4' : 'text-ink2 border-line';
  return <span className={`inline-block text-[10px] font-mono px-1.5 py-px rounded border ${c}`}>{children}</span>;
}

/* ---------- global matching-type filter (cross-filters every section) ---------- */
export function CategoryFilter() {
  const { A, cat, setCat } = useStore();
  if (!A) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button onClick={() => setCat(null)}
        className={`text-[11px] font-mono px-3 py-1 rounded-full border cursor-pointer transition-colors ${cat === null ? 'border-ink2 text-ink bg-panel2' : 'border-line text-ink3 hover:text-ink'}`}>
        All types
      </button>
      {CAT_ORDER.map(c => (
        <button key={c} onClick={() => setCat(cat === c ? null : c)}
          className={`text-[11px] font-mono px-3 py-1 rounded-full border cursor-pointer transition-colors flex items-center gap-1.5 ${cat === c ? 'text-ink bg-panel2' : 'border-line text-ink3 hover:text-ink'}`}
          style={cat === c ? { borderColor: CAT_COLOR[c] } : undefined}>
          <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLOR[c] }} />
          {CAT_SHORT[c]}
        </button>
      ))}
    </div>
  );
}

/* ---------- section header ---------- */
export function SecHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-ink2 mt-1.5 max-w-3xl leading-relaxed">{children}</p>
    </div>
  );
}

/* ---------- recharts tooltip shell ---------- */
export function Tip({ active, payload, label, render }: {
  active?: boolean; payload?: { name?: string; value?: number; payload?: Record<string, unknown> }[]; label?: string;
  render: (payload: NonNullable<{ name?: string; value?: number; payload?: Record<string, unknown> }[]>, label?: string) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel2 border border-line rounded-lg px-3 py-2 text-xs shadow-xl">
      {render(payload, label)}
    </div>
  );
}
