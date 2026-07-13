export interface Overview {
  events: number; cases: number; activities: number; documents: number;
  vendors: number; spend_total_eur: number; median_cycle_days: number;
  rework_rate: number;
  activity_freq: { activity: string; count: number }[];
  events_by_year: { year: number; count: number }[];
  categories: { category: string; cases: number }[];
  source: string;
}

export interface DfgNode { activity: string; freq: number; rank: number }
export interface DfgEdge { from: string; to: string; freq: number; median_hours: number | null }
export interface Dfg { nodes: DfgNode[]; edges: DfgEdge[]; cases: number }

export interface Variant {
  variant: string[]; cases: number; share: number;
  median_cycle_days: number | null; rework_rate: number | null;
}
export interface VariantBlock { distinct_variants: number; total_cases: number; top: Variant[] }

export interface SegStat { n: number; mean?: number; median?: number; p90?: number; p95?: number; max?: number }
export interface ThroughputBlock { po_to_gr: SegStat; gr_to_ir: SegStat; ir_to_pay: SegStat; po_to_pay: SegStat }

export interface Control { control: string; desc: string; eligible_cases: number; violations: number; conformance: number | null }
export interface Deviation { flag: string; desc: string; cases: number; share: number; spend_exposed_eur: number | null; median_cycle_days: number | null }
export interface CatCompliance { category: string; cases: number; deviation_rate: number; rework_rate: number; median_cycle_days: number | null }
export interface Compliance { enforced_controls: Control[]; active_deviations: Deviation[]; by_category: CatCompliance[]; deviation_rate_overall: number }

export interface SegRow { key: string; cases: number; median_cycle_days: number | null; rework_rate: number | null; deviation_rate: number | null; spend_eur: number | null }
export interface VendorRow { vendor: string; cases: number; median_cycle_days: number | null; rework_rate: number | null; spend_eur: number | null; delay_burden: number | null }
export interface Segmentation { spend_area: SegRow[]; item_type: SegRow[]; document_type: SegRow[]; company: SegRow[]; worst_vendors: VendorRow[] }

export interface Opportunity { theme: string; lever: string; cases: number; share: number; excess_cycle_days: number | null; spend_exposed_eur: number | null; impact_score: number }
export interface WorstCase {
  case: string; category: string; vendor: string; spend_area: string; item_type: string;
  net_worth_eur: number | null; cycle_days: number | null; n_events: number;
  rework_count: number; flags: string[]; trace: string[];
}

export interface Artifacts {
  overview: Overview;
  dfg: Record<string, Dfg>;
  variants: Record<string, VariantBlock> & { overall: VariantBlock };
  throughput: { overall: ThroughputBlock; by_category: Record<string, ThroughputBlock> };
  compliance: Compliance;
  segmentation: Segmentation;
  opportunities: { ranked: Opportunity[] };
  worst_cases: { cases: WorstCase[] };
}
