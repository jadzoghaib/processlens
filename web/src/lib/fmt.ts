export const n = (v: number | null | undefined) =>
  v == null ? '—' : Math.round(v).toLocaleString('en-US');

export const d1 = (v: number | null | undefined) =>
  v == null ? '—' : (Math.round(v * 10) / 10).toLocaleString('en-US');

export const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.round(v * 10) / 10}%`;

export const days = (v: number | null | undefined) =>
  v == null ? '—' : `${d1(v)}d`;

export const abbr = (v: number | null | undefined) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return Math.round(v).toString();
};
export const eur = (v: number | null | undefined) => (v == null ? '—' : '€' + abbr(v));

export const CAT_SHORT: Record<string, string> = {
  '3-way match, invoice before GR': '3-way · inv before GR',
  '3-way match, invoice after GR': '3-way · inv after GR',
  '2-way match': '2-way match',
  Consignment: 'Consignment',
};

/* Fixed categorical assignment (dataviz rule: color follows the entity, never
   its rank; assigned once, never cycled). Palette validated for dark mode. */
export const CAT_ORDER = [
  '3-way match, invoice before GR',
  '3-way match, invoice after GR',
  'Consignment',
  '2-way match',
];
export const CAT_COLOR: Record<string, string> = {
  '3-way match, invoice before GR': '#4c86e8',
  '3-way match, invoice after GR': '#17a88c',
  Consignment: '#bd8226',
  '2-way match': '#b06fe0',
};
export const ACCENT = '#4c86e8';

export const MILESTONES = new Set([
  'Create Purchase Order Item', 'Record Goods Receipt',
  'Record Invoice Receipt', 'Clear Invoice',
]);
export const REWORK = new Set([
  'Cancel Invoice Receipt', 'Cancel Goods Receipt', 'Cancel Subsequent Invoice',
  'Change Price', 'Change Quantity', 'Set Payment Block', 'Remove Payment Block',
  'Delete Purchase Order Item', 'Reactivate Purchase Order Item', 'Block Purchase Order Item',
]);

export const shortAct = (a: string) =>
  a.replace('Purchase Order', 'PO').replace('Purchase Requisition', 'PR')
    .replace('Record ', '').replace('Create ', '').replace('Vendor creates ', 'vendor ');
