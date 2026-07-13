import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { useStore } from '../lib/data';
import { CAT_COLOR, CAT_ORDER, CAT_SHORT, days, n } from '../lib/fmt';
import { Card, SecHead, Tip } from '../components/ui';

const SEGS = [
  ['po_to_gr', 'PO → Goods receipt'],
  ['gr_to_ir', 'Goods receipt → Invoice'],
  ['ir_to_pay', 'Invoice → Payment'],
] as const;

export function Performance() {
  const { A, cat } = useStore();
  if (!A) return null;
  const t = cat ? A.throughput.by_category[cat] : A.throughput.overall;
  const scope = cat ? CAT_SHORT[cat] : 'all matching types';
  const maxMed = Math.max(...SEGS.map(([k]) => t[k].median ?? 0), 1);

  // grouped comparison across categories (categorical palette, legend required)
  const compare = SEGS.map(([k, label]) => {
    const row: Record<string, number | string | null> = { seg: label.replace(' → ', '→') };
    for (const c of CAT_ORDER) row[CAT_SHORT[c]] = A.throughput.by_category[c]?.[k]?.median ?? null;
    return row;
  });

  return (
    <div>
      <SecHead title="Performance & throughput">
        Where the {days(t.po_to_pay.median)} median order-to-pay time goes for <b>{scope}</b>. The
        invoice-to-payment leg dominates everywhere — the classic accounts-payable bottleneck the challenge asks about.
      </SecHead>

      <Card title="Order-to-pay, decomposed" hint="median days per hand-off · bar length ∝ median">
        <div className="flex flex-col gap-2.5">
          {SEGS.map(([k, label], i) => {
            const s = t[k];
            return (
              <div key={k} className="grid grid-cols-[170px_1fr_230px] gap-3 items-center max-md:grid-cols-1">
                <div className="text-xs">{label}</div>
                <div className="h-7 bg-panel2 rounded-md overflow-hidden">
                  <motion.div className="h-full rounded-md flex items-center pl-2.5 font-mono text-[12px] font-semibold text-white"
                    style={{ background: 'linear-gradient(90deg,#2b4a80,#4c86e8)' }}
                    initial={{ width: 0 }} animate={{ width: `${Math.max(7, (s.median ?? 0) / maxMed * 100)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}>
                    {days(s.median)}
                  </motion.div>
                </div>
                <div className="font-mono text-[11px] text-ink2">p90 {days(s.p90)} · p95 {days(s.p95)} · n={n(s.n)}</div>
              </div>
            );
          })}
          <div className="grid grid-cols-[170px_1fr_230px] gap-3 items-center border-t border-line pt-2.5 max-md:grid-cols-1">
            <div className="text-xs font-semibold">PO → Payment (end to end)</div>
            <div className="h-7 bg-panel2 rounded-md">
              <div className="h-full rounded-md flex items-center pl-2.5 font-mono text-[12px] font-semibold text-white w-full"
                style={{ background: 'linear-gradient(90deg,#233046,#4c86e8)' }}>
                {days(t.po_to_pay.median)}
              </div>
            </div>
            <div className="font-mono text-[11px] text-ink2">p90 {days(t.po_to_pay.p90)} · n={n(t.po_to_pay.n)}</div>
          </div>
        </div>
      </Card>

      <Card title="Median hand-off by matching type" hint="grouped comparison · one axis, days"
        table={
          <table className="w-full text-xs">
            <thead><tr className="text-ink3 text-left"><th className="py-1">Segment</th>{CAT_ORDER.map(c => <th key={c} className="text-right">{CAT_SHORT[c]}</th>)}</tr></thead>
            <tbody>{compare.map(r => (
              <tr key={String(r.seg)} className="border-t border-line/50">
                <td className="py-1">{String(r.seg)}</td>
                {CAT_ORDER.map(c => <td key={c} className="text-right font-mono">{days(r[CAT_SHORT[c]] as number | null)}</td>)}
              </tr>))}</tbody>
          </table>
        }>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={compare} margin={{ left: 0, right: 12, top: 4 }}>
            <XAxis dataKey="seg" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={36} unit="d" />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<Tip render={(p, label) => (
              <><b>{label}</b>{p.map(row => (
                <div key={row.name} className="font-mono text-ink2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: (row as { color?: string }).color }} />
                  {row.name}: {days(row.value as number)}
                </div>))}</>
            )} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {CAT_ORDER.map(c => (
              <Bar key={c} dataKey={CAT_SHORT[c]} fill={CAT_COLOR[c]} radius={[4, 4, 0, 0]} barSize={16}
                opacity={cat === null || cat === c ? 1 : 0.25} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-ink2 text-xs mt-2">
          The invoice→payment leg is the largest and most variable in every matching type — the highest-leverage
          place to compress working-capital cycle time. Active filter dims the other series rather than repainting them.
        </p>
      </Card>
    </div>
  );
}
