import { motion } from 'framer-motion';
import { DataProvider, useStore } from './lib/data';
import { CategoryFilter } from './components/ui';
import { Overview } from './sections/Overview';
import { ProcessFlow } from './sections/ProcessFlow';
import { Performance } from './sections/Performance';
import { Compliance } from './sections/Compliance';
import { Opportunities } from './sections/Opportunities';

const SECTIONS = [
  ['overview', '01', 'Overview'],
  ['process', '02', 'Process flow'],
  ['performance', '03', 'Performance'],
  ['compliance', '04', 'Compliance & rework'],
  ['opportunities', '05', 'Opportunities'],
] as const;

function Shell() {
  const { A, error, section, go } = useStore();

  if (error) return (
    <div className="h-full grid place-items-center text-ink2 text-sm p-8 text-center">
      Failed to load analytics artifacts ({error}).<br />Serve the built site over HTTP — file:// blocks fetch.
    </div>
  );
  if (!A) return (
    <div className="h-full grid place-items-center text-ink2 text-sm">
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }}>
        Loading analytics…
      </motion.div>
    </div>
  );

  const Body = { overview: Overview, process: ProcessFlow, performance: Performance,
    compliance: Compliance, opportunities: Opportunities }[section] ?? Overview;

  return (
    <div className="grid grid-cols-[232px_1fr] h-full max-md:grid-cols-1">
      <aside className="bg-panel border-r border-line flex flex-col max-md:hidden">
        <div className="px-5 py-5 border-b border-line">
          <h1 className="font-mono font-semibold text-[17px] tracking-wide">ProcessLens</h1>
          <div className="text-ink2 text-[10.5px] mt-1.5 leading-relaxed">
            Purchase-to-Pay process intelligence · BPI Challenge 2019
          </div>
        </div>
        <nav className="p-2.5 flex-1">
          {SECTIONS.map(([id, num, label]) => (
            <button key={id} onClick={() => go(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer mb-0.5 transition-colors
                ${section === id ? 'bg-cat1/10 text-cat1' : 'text-ink2 hover:bg-panel2 hover:text-ink'}`}>
              <span className={`font-mono text-[11px] font-semibold ${section === id ? 'text-cat1' : 'text-ink3'}`}>{num}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-line text-[10.5px] text-ink3 leading-relaxed">
          Public benchmark data, energy-sector framing.<br />
          Data: <a className="text-ink2 hover:text-cat1" target="_blank" rel="noreferrer"
            href="https://data.4tu.nl/articles/dataset/BPI_Challenge_2019/12715853">BPI Challenge 2019</a> · 4TU
        </div>
      </aside>

      <div className="overflow-y-auto">
        <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line px-7 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-[10px] uppercase tracking-[1.6px] text-ink3">Cross-filter</span>
          <CategoryFilter />
        </header>
        <main className="px-7 py-6 max-w-[1240px]">
          {/* enter-only transition: an exit-wait would block section switches in
              throttled tabs (rAF suspended) and under prefers-reduced-motion */}
          <motion.div key={section}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}>
            <Body />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <DataProvider><Shell /></DataProvider>;
}
