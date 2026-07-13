import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../lib/data';
import { ACCENT, CAT_COLOR, CAT_SHORT, days, eur, n, pct } from '../lib/fmt';
import { Card, Pill, SecHead, Tip } from '../components/ui';

export function Compliance() {
  const { A, cat } = useStore();
  if (!A) return null;
  const c = A.compliance;
  const dev = c.active_deviations.map(d => ({ ...d, short: d.desc.length > 34 ? d.desc.slice(0, 32) + '…' : d.desc }));

  return (
    <div>
      <SecHead title="Compliance & rework">
        Two questions. Do the matching-type controls actually hold? And where does the process deviate
        and rework in ways that cost time and money?
      </SecHead>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Enforced controls" hint="matching-type rules, checked case by case">
          {c.enforced_controls.map(x => (
            <div key={x.control} className="flex items-center justify-between gap-3 py-2.5 border-b border-line/50 last:border-0">
              <div>
                <div className="text-[12.5px]">{x.desc}</div>
                <div className="text-ink3 text-[11px] mt-0.5">{n(x.eligible_cases)} eligible · {x.violations} violations</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-good text-base">{pct(x.conformance)}</div>
                <div className="text-ink3 text-[10px]">conformance</div>
              </div>
            </div>
          ))}
          <p className="text-ink2 text-xs mt-3 leading-relaxed">
            A clean result is itself the finding: the ERP hard-enforces matching-type ordering — zero
            out-of-sequence receipts or invoices across {n(A.overview.cases)} cases.
          </p>
        </Card>

        <Card title="Active deviations" hint={`${pct(c.deviation_rate_overall)} of cases deviate`}
          table={
            <table className="w-full text-xs">
              <thead><tr className="text-ink3 text-left"><th className="py-1">Pattern</th><th className="text-right">Cases</th><th className="text-right">Spend</th></tr></thead>
              <tbody>{dev.map(x => (
                <tr key={x.flag} className="border-t border-line/50"><td className="py-1">{x.desc}</td>
                  <td className="text-right font-mono">{n(x.cases)}</td><td className="text-right font-mono">{eur(x.spend_exposed_eur)}</td></tr>))}</tbody>
            </table>
          }>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dev} layout="vertical" margin={{ left: 8, right: 28 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="short" width={190} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#ffffff08' }} content={<Tip render={p => {
                const row = p[0]?.payload as { desc?: string; cases?: number; share?: number; spend_exposed_eur?: number | null; median_cycle_days?: number | null } | undefined;
                return (<><b>{row?.desc}</b>
                  <div className="font-mono text-ink2">{n(row?.cases)} cases ({pct(row?.share)})</div>
                  <div className="font-mono text-ink2">{eur(row?.spend_exposed_eur)} exposed · median {days(row?.median_cycle_days)}</div></>);
              }} />} />
              <Bar dataKey="cases" radius={[0, 4, 4, 0]} barSize={16}>
                {dev.map((_, i) => <Cell key={i} fill={ACCENT} fillOpacity={0.9 - i * 0.12} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Deviation & rework by matching type">
        <table className="w-full text-xs">
          <thead><tr className="text-ink3 text-left">
            <th className="py-1.5">Matching type</th><th className="text-right">Cases</th>
            <th className="text-right">Deviation</th><th className="text-right">Rework</th><th className="text-right">Median cycle</th>
          </tr></thead>
          <tbody>
            {c.by_category.map(b => (
              <tr key={b.category} className={`border-t border-line/50 ${cat && cat !== b.category ? 'opacity-40' : ''}`}>
                <td className="py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLOR[b.category] }} />
                  {CAT_SHORT[b.category]}
                </td>
                <td className="text-right font-mono">{n(b.cases)}</td>
                <td className="text-right"><Pill tone={b.deviation_rate > 35 ? 'bad' : b.deviation_rate > 15 ? 'warn' : 'good'}>{pct(b.deviation_rate)}</Pill></td>
                <td className="text-right"><Pill tone={b.rework_rate > 30 ? 'bad' : b.rework_rate > 10 ? 'warn' : 'good'}>{pct(b.rework_rate)}</Pill></td>
                <td className="text-right font-mono">{days(b.median_cycle_days)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Worst vendors" hint="by delay burden = cases × median cycle">
        <table className="w-full text-xs">
          <thead><tr className="text-ink3 text-left">
            <th className="py-1.5">Vendor</th><th className="text-right">Cases</th>
            <th className="text-right">Median cycle</th><th className="text-right">Rework</th><th className="text-right">Spend</th>
          </tr></thead>
          <tbody>
            {A.segmentation.worst_vendors.slice(0, 10).map(v => (
              <tr key={v.vendor} className="border-t border-line/50">
                <td className="py-1.5 font-mono">{v.vendor}</td>
                <td className="text-right font-mono">{n(v.cases)}</td>
                <td className="text-right font-mono">{days(v.median_cycle_days)}</td>
                <td className="text-right"><Pill tone={(v.rework_rate ?? 0) > 40 ? 'bad' : (v.rework_rate ?? 0) > 20 ? 'warn' : undefined}>{pct(v.rework_rate)}</Pill></td>
                <td className="text-right font-mono">{eur(v.spend_eur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
