import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Artifacts } from '../types';

const NAMES = ['overview', 'dfg', 'variants', 'throughput', 'compliance',
  'segmentation', 'opportunities', 'worst_cases'] as const;

interface Store {
  A: Artifacts | null;
  error: string | null;
  /** global cross-filter: selected matching type (null = all) */
  cat: string | null;
  setCat: (c: string | null) => void;
  section: string;
  go: (s: string) => void;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

export function DataProvider({ children }: { children: ReactNode }) {
  const [A, setA] = useState<Artifacts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [section, setSection] = useState('overview');

  useEffect(() => {
    (async () => {
      try {
        const base = import.meta.env.BASE_URL;
        const entries = await Promise.all(NAMES.map(async k => {
          const r = await fetch(`${base}artifacts/${k}.json`);
          if (!r.ok) throw new Error(`${k}.json: HTTP ${r.status}`);
          return [k, await r.json()] as const;
        }));
        setA(Object.fromEntries(entries) as unknown as Artifacts);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const go = (s: string) => { setSection(s); window.scrollTo({ top: 0 }); };

  return <Ctx.Provider value={{ A, error, cat, setCat, section, go }}>{children}</Ctx.Provider>;
}
