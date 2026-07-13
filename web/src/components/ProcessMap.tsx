import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Dfg } from '../types';
import { MILESTONES, n, shortAct } from '../lib/fmt';

/* Interactive directly-follows map. Hovering a node dims everything except its
   incident edges; hovering an edge shows freq + median hand-off wait. Layout:
   x = mean relative position of the activity in traces, y = frequency order. */
export function ProcessMap({ dfg, accent }: { dfg: Dfg; accent: string }) {
  const [hover, setHover] = useState<string | null>(null);      // node
  const [edgeTip, setEdgeTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { nodes, edges, pos, W, H, maxFreq } = useMemo(() => {
    const nodes = dfg.nodes.slice(0, 14);
    const names = new Set(nodes.map(nd => nd.activity));
    const edges = dfg.edges
      .filter(e => names.has(e.from) && names.has(e.to) && e.from !== e.to)
      .slice(0, 26);
    const NCOL = 7, colW = 196, rowH = 66, NW = 162;
    const byCol: typeof nodes[] = Array.from({ length: NCOL }, () => []);
    nodes.forEach(nd => byCol[Math.min(NCOL - 1, Math.round(nd.rank * (NCOL - 1)))].push(nd));
    const pos: Record<string, { x: number; y: number }> = {};
    let maxRows = 1;
    byCol.forEach((col, ci) => {
      col.sort((a, b) => b.freq - a.freq);
      maxRows = Math.max(maxRows, col.length);
      col.forEach((nd, ri) => { pos[nd.activity] = { x: 20 + ci * colW, y: 30 + ri * rowH }; });
    });
    return {
      nodes, edges, pos,
      W: NCOL * colW + 40, H: 30 + maxRows * rowH + 24,
      maxFreq: Math.max(...edges.map(e => e.freq), 1), NW,
    };
  }, [dfg]);

  const NW = 162, NH = 36;
  const edgeKey = (e: { from: string; to: string }) => `${e.from}→${e.to}`;
  const active = (e: { from: string; to: string }) =>
    hover === null || e.from === hover || e.to === hover;

  return (
    <div className="overflow-x-auto rounded-lg relative" onMouseLeave={() => { setHover(null); setEdgeTip(null); }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        {edges.map(e => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
          const back = x2 < x1;
          const mx = (x1 + x2) / 2;
          const dPath = back
            ? `M ${x1} ${y1} C ${x1 + 44} ${y1 - 34}, ${x2 - 44} ${y2 - 34}, ${x2} ${y2}`
            : `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          const sw = 1 + (e.freq / maxFreq) * 5;
          const hot = e.median_hours != null && e.median_hours > 240;
          const wait = e.median_hours == null ? '—'
            : e.median_hours >= 24 ? `${(e.median_hours / 24).toFixed(1)}d` : `${e.median_hours.toFixed(0)}h`;
          return (
            <motion.path
              key={edgeKey(e)}
              d={dPath} fill="none"
              stroke={hot ? '#f5a623' : '#33405a'}
              strokeWidth={sw}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, opacity: active(e) ? 0.85 : 0.12 }}
              transition={{ pathLength: { duration: 0.7, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
              style={{ cursor: 'pointer' }}
              onMouseMove={ev => {
                const r = (ev.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setEdgeTip({ x: ev.clientX - r.left, y: ev.clientY - r.top,
                  text: `${shortAct(e.from)} → ${shortAct(e.to)} · ${n(e.freq)}× · median wait ${wait}` });
              }}
              onMouseLeave={() => setEdgeTip(null)}
            />
          );
        })}
        {nodes.map(nd => {
          const p = pos[nd.activity];
          const mil = MILESTONES.has(nd.activity);
          const dim = hover !== null && hover !== nd.activity &&
            !edges.some(e => (e.from === hover && e.to === nd.activity) || (e.to === hover && e.from === nd.activity));
          return (
            <motion.g key={nd.activity} transform={`translate(${p.x},${p.y})`}
              animate={{ opacity: dim ? 0.25 : 1 }} transition={{ duration: 0.15 }}
              onMouseEnter={() => setHover(nd.activity)}
              style={{ cursor: 'pointer' }}>
              <rect width={NW} height={NH} rx={7}
                fill="#17202f" stroke={mil ? '#34d399' : accent} strokeWidth={1.4} />
              <text x={9} y={15} className="fill-ink" fontSize={11}>{shortAct(nd.activity).slice(0, 22)}</text>
              <text x={9} y={28} fontSize={9.5} fontFamily="var(--font-mono)" className="fill-ink2">{n(nd.freq)}</text>
            </motion.g>
          );
        })}
      </svg>
      {edgeTip && (
        <div className="pointer-events-none absolute bg-panel2 border border-line rounded-lg px-2.5 py-1.5 text-[11px] font-mono shadow-xl"
          style={{ transform: `translate(${edgeTip.x + 14}px, ${edgeTip.y - 34}px)`, position: 'absolute', top: 0, left: 0 }}>
          {edgeTip.text}
        </div>
      )}
    </div>
  );
}
