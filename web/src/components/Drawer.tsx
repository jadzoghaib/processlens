import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { MILESTONES, REWORK } from '../lib/fmt';

export function Drawer({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />
          <motion.aside
            className="fixed top-0 right-0 h-full w-[580px] max-w-[94vw] bg-panel2 border-l border-line z-50 flex flex-col shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="font-semibold text-sm">{title}</h3>
              <button onClick={onClose} className="text-ink2 hover:text-ink text-xl leading-none cursor-pointer">×</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* Animated event-trace timeline: milestones green, rework red. */
export function Trace({ trace }: { trace: string[] }) {
  return (
    <div>
      {trace.map((a, i) => {
        const mil = MILESTONES.has(a), rw = REWORK.has(a);
        return (
          <motion.div key={i} className="grid grid-cols-[26px_1fr] gap-2.5"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.6) }}>
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${mil ? 'bg-good' : rw ? 'bg-bad' : 'bg-cat1'}`} />
              {i < trace.length - 1 && <div className="w-0.5 flex-1 bg-line" />}
            </div>
            <div className="pb-3.5 text-[12.5px]">
              <span className="text-ink3 font-mono text-[10px] mr-2">{String(i + 1).padStart(2, '0')}</span>
              {a}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
