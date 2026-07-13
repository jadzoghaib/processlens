import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { useStore } from '../lib/data';
import { abbr, ACCENT, CAT_COLOR, CAT_SHORT, d1, eur, n, pct, shortAct } from '../lib/fmt';
import { Card, Kpi, SecHead, Tip } from '../components/ui';

export function Overview() {
  const { A, setCat, go } = useStore();
  if (!A) return null;
  const o = A.overview;
  const acts = o.activity_freq.slice(0, 12).map(a => ({ ...a, short: shortAct(a.activity) }));

  return (
    <div>
      <SecHead title="Purchase-to-Pay, end to end">
        A multinational coatings manufacturer's procurement process, mined from its ERP event log —
        {' '}{n(o.events)} events across {n(o.cases)} purchase-order items. The same purchase-to-pay backbone
        (matching logic, vendor handling, invoice clearing, compliance controls) runs in every asset-heavy
        sector, so this reads as a transferable procurement-intelligence prototype.
      </SecHead>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <Kpi value={o.cases} label="Cases (PO items)" sub={`${n(o.documents)} documents`} format={v => n(v)} />
        <Kpi value={o.events} label="Events" sub={`${o.activities} activity types`} format={v => n(v)} />
        <Kpi value={o.spend_total_eur} label="Spend observed" sub="cumulative net worth" format={v => '€' + abbr(v)} />
        <Kpi value={o.median_cycle_days} label="Median cycle" sub="PO item → last event" tone="warn" format={v => d1(v) + ' d'} />
        <Kpi value={o.rework_rate} label="Rework rate" sub="cancel · change · block" tone="bad" format={v => d1(v) + '%'} />
        <Kpi value={o.vendors} label="Vendors" sub="4 subsidiaries" format={v => n(v)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Matching types" hint="the four processes hiding in one log — click to cross-filter">
          <div className="grid grid-cols-2 gap-2.5">
            {o.categories.map((c, i) => (
              <motion.button key={c.category}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => { setCat(c.category); go('process'); }}
                className="text-left bg-panel2/60 border border-line rounded-lg p-3 cursor-pointer hover:bg-panel2 transition-colors"
                style={{ borderLeft: `3px solid ${CAT_COLOR[c.category]}` }}>
                <div className="font-semibold text-[13px]">{CAT_SHORT[c.category]}</div>
                <div className="text-xl font-bold mt-1.5">{n(c.cases)}</div>
                <div className="text-ink3 text-[11px] mt-0.5">{pct(c.cases / o.cases * 100)} of cases · open flow →</div>
              </motion.button>
            ))}
          </div>
          <p className="text-ink2 text-xs mt-3 leading-relaxed">
            Each matching type is a genuinely different process — the challenge organizers note at least four
            models are needed. ProcessLens mines each category separately rather than forcing one global map.
          </p>
        </Card>

        <Card title="Activity frequency" hint={`top 12 of ${o.activities}`}
          table={
            <table className="w-full text-xs">
              <thead><tr className="text-ink3 text-left"><th className="py-1">Activity</th><th className="text-right">Events</th></tr></thead>
              <tbody>{acts.map(a => (
                <tr key={a.activity} className="border-t border-line/50">
                  <td className="py-1">{a.activity}</td><td className="text-right font-mono">{n(a.count)}</td>
                </tr>))}</tbody>
            </table>
          }>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={acts} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="short" width={128} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#ffffff08' }} content={<Tip render={p => (
                <><b>{String(p[0]?.payload?.activity ?? '')}</b><div className="font-mono text-ink2">{n(p[0]?.value as number)} events</div></>
              )} />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                {acts.map((_, i) => <Cell key={i} fill={ACCENT} fillOpacity={0.9 - i * 0.045} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Reading note" hint="timestamp anonymization, handled honestly">
        <p className="text-ink2 text-xs leading-relaxed">
          The published log is time-anonymized: a handful of <code className="font-mono text-ink">Vendor creates invoice</code> events
          carry placeholder years (1948, 1993, 2001, 2020). Real activity sits in 2018–2019. Duration metrics are computed
          only within that window, so a single placeholder event never reports a 70-year cycle time. Full definitions in the
          repo's METHODOLOGY.
        </p>
      </Card>
    </div>
  );
}
