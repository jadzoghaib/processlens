import { useState } from 'react';
import { useStore } from '../lib/data';
import { CAT_COLOR, CAT_ORDER, days, n, pct, shortAct, MILESTONES, REWORK } from '../lib/fmt';
import { Card, Pill, SecHead } from '../components/ui';
import { ProcessMap } from '../components/ProcessMap';
import { Drawer, Trace } from '../components/Drawer';
import type { Variant } from '../types';

export function ProcessFlow() {
  const { A, cat } = useStore();
  const [openVariant, setOpenVariant] = useState<Variant | null>(null);
  if (!A) return null;
  const activeCat = cat ?? CAT_ORDER[0];
  const dfg = A.dfg[activeCat];
  const variants = A.variants[activeCat];

  return (
    <div>
      <SecHead title="Process flow">
        The discovered directly-follows map and dominant path variants for
        {' '}<b style={{ color: CAT_COLOR[activeCat] }}>{activeCat}</b>{cat === null && ' (default — pick a type above to switch)'}.
        Hover nodes to isolate their hand-offs; hover edges for frequency and median wait. Amber edges wait &gt;10 days.
      </SecHead>

      <Card title="Directly-follows map" hint={`${n(dfg.cases)} cases · milestones ringed green`}>
        <ProcessMap dfg={dfg} accent={CAT_COLOR[activeCat]} />
      </Card>

      <Card title="Top variants" hint={`${n(variants.distinct_variants)} distinct paths — click a row for the full trace`}>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-ink3 text-left">
              <th className="py-1.5 pr-2">#</th><th>Path</th>
              <th className="text-right">Cases</th><th className="text-right">Share</th>
              <th className="text-right">Median cycle</th><th className="text-right">Rework</th>
            </tr>
          </thead>
          <tbody>
            {variants.top.map((v, i) => (
              <tr key={i} onClick={() => setOpenVariant(v)}
                className="border-t border-line/50 hover:bg-panel2/60 cursor-pointer">
                <td className="py-2 pr-2 font-mono text-ink3">{i + 1}</td>
                <td className="py-1.5 leading-6">
                  {v.variant.map((a, j) => (
                    <span key={j} className="mr-1">
                      <Pill tone={MILESTONES.has(a) ? 'good' : REWORK.has(a) ? 'bad' : undefined}>{shortAct(a)}</Pill>
                    </span>
                  ))}
                </td>
                <td className="text-right font-mono">{n(v.cases)}</td>
                <td className="text-right font-mono">{pct(v.share)}</td>
                <td className="text-right font-mono">{days(v.median_cycle_days)}</td>
                <td className="text-right font-mono">{pct(v.rework_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-ink2 text-xs mt-3">
          Green = milestone, red = rework step. A long tail of {n(variants.distinct_variants)} variants is the
          signature of an under-standardized process.
        </p>
      </Card>

      <Drawer open={!!openVariant} title={openVariant ? `Variant · ${n(openVariant.cases)} cases` : ''} onClose={() => setOpenVariant(null)}>
        {openVariant && (
          <>
            <p className="text-ink2 text-xs mb-4">
              {pct(openVariant.share)} of {activeCat} cases · median cycle {days(openVariant.median_cycle_days)} ·
              rework {pct(openVariant.rework_rate)}
            </p>
            <Trace trace={openVariant.variant} />
          </>
        )}
      </Drawer>
    </div>
  );
}
