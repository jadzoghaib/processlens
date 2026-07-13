import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../lib/data';
import { days, eur, n, pct, CAT_SHORT } from '../lib/fmt';
import { Pill, SecHead } from '../components/ui';
import { Drawer, Trace } from '../components/Drawer';
import type { WorstCase } from '../types';

const THEME_FLAG: Record<string, (c: WorstCase) => boolean> = {
  'Payment blocks requiring manual release': c => c.flags.includes('payment_block'),
  'Price / quantity changes after PO': c => c.flags.includes('price_qty_change'),
  'Invoice cancellations & re-entry': c => c.flags.includes('cancellation'),
  'Duplicate invoice receipts': c => c.flags.includes('repeat_invoice'),
  'Received but never cleared (open invoices)': c => c.flags.includes('no_payment'),
};

export function Opportunities() {
  const { A } = useStore();
  const [theme, setTheme] = useState<string | null>(null);
  const [openCase, setOpenCase] = useState<string | null>(null);
  if (!A) return null;
  const ops = A.opportunities.ranked;
  const maxScore = Math.max(...ops.map(o => o.impact_score), 1);
  const cases = theme ? A.worst_cases.cases.filter(THEME_FLAG[theme] ?? (() => true)).slice(0, 12) : [];

  return (
    <div>
      <SecHead title="Opportunities">
        Improvement themes ranked by an explicit impact score — normalized case volume × excess cycle time ×
        log-spend exposed. Each is a concrete operational lever. Click a theme to inspect the highest-impact
        cases behind it, down to the individual event trace.
      </SecHead>

      {ops.map((o, i) => (
        <motion.button key={o.theme}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
          onClick={() => setTheme(o.theme)}
          className="block w-full text-left bg-panel border border-line rounded-xl p-4 mb-3 cursor-pointer hover:bg-panel2 transition-colors border-l-[3px] border-l-warn">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-semibold text-sm">{o.theme}</div>
            <div className="font-mono font-bold text-warn text-lg whitespace-nowrap">{o.impact_score}</div>
          </div>
          <div className="h-1.5 bg-panel2 rounded-full mt-2 overflow-hidden">
            <motion.div className="h-full rounded-full bg-warn/70"
              initial={{ width: 0 }} animate={{ width: `${(o.impact_score / maxScore * 100).toFixed(0)}%` }}
              transition={{ duration: 0.7, delay: i * 0.07 + 0.2 }} />
          </div>
          <div className="text-ink2 text-xs mt-2.5">{o.lever}</div>
          <div className="flex gap-6 mt-3 flex-wrap">
            <div><div className="text-ink3 text-[10px] uppercase tracking-wide">Cases</div>
              <b className="font-mono">{n(o.cases)}</b> <span className="text-ink3 text-[10px]">({pct(o.share)})</span></div>
            <div><div className="text-ink3 text-[10px] uppercase tracking-wide">Excess cycle</div>
              <b className="font-mono">{days(o.excess_cycle_days)}</b> <span className="text-ink3 text-[10px]">vs median</span></div>
            <div><div className="text-ink3 text-[10px] uppercase tracking-wide">Spend exposed</div>
              <b className="font-mono">{eur(o.spend_exposed_eur)}</b></div>
            <div className="ml-auto self-center text-ink3 text-[10px]">inspect cases →</div>
          </div>
        </motion.button>
      ))}
      <p className="text-ink2 text-xs mt-2">
        The impact score is a transparent prioritization heuristic, not a savings estimate — it orders themes by
        where volume, delay, and money concentrate. In a live Celonis deployment these become monitored KPIs with
        automated action flows.
      </p>

      <Drawer open={!!theme} title={theme ?? ''} onClose={() => { setTheme(null); setOpenCase(null); }}>
        <p className="text-ink2 text-xs mb-4">
          Highest-impact cases (spend × cycle) exhibiting this pattern. Click a case to expand its full event trace.
        </p>
        {cases.length === 0 && <p className="text-ink3 text-xs">No individual cases captured for this theme in the top-impact sample.</p>}
        {cases.map(c => (
          <div key={c.case}
            className="bg-panel border border-line rounded-lg p-3 mb-2.5 cursor-pointer hover:border-ink3 transition-colors"
            onClick={() => setOpenCase(openCase === c.case ? null : c.case)}>
            <div className="flex justify-between gap-3">
              <div>
                <b className="font-mono text-[12px]">{c.case}</b>
                <div className="text-ink3 text-[10.5px] mt-0.5">{CAT_SHORT[c.category] ?? c.category} · {c.vendor} · {c.spend_area}</div>
              </div>
              <div className="text-right">
                <b className="font-mono">{eur(c.net_worth_eur)}</b>
                <div className="text-ink3 text-[10.5px]">{days(c.cycle_days)} · {c.n_events} events</div>
              </div>
            </div>
            <div className="mt-2 flex gap-1 flex-wrap">{c.flags.map(f => <Pill key={f} tone="bad">{f}</Pill>)}</div>
            {openCase === c.case && (
              <div className="mt-3 pt-3 border-t border-line"><Trace trace={c.trace} /></div>
            )}
          </div>
        ))}
      </Drawer>
    </div>
  );
}
