# Methodology & definitions

Precise definitions behind every number in the cockpit, so the analysis is auditable.

## Event log

- **Case** = `case concept:name` = purchase document + item (the challenge's own case notion). 251,734 cases.
- **Activity** = `event concept:name`. 42 activity types.
- **Timestamp** = `event time:timestamp`, parsed `%d-%m-%Y %H:%M:%S.%f`.
- Events are sorted by (case, timestamp); order within a case defines the trace.

### Timestamp anonymization

The published log is time-anonymized. A small number of `Vendor creates invoice` events carry placeholder years (1948, 1993, 2001, 2008, 2017, 2020); real activity is 2018 (1,550,468 events) and 2019 (45,135). **Duration metrics are computed only when both endpoints fall in `[2017-06-01, 2019-12-31]`** — this prevents a single placeholder event from producing a decades-long cycle time, at the cost of leaving a small fraction of cases without a duration (reported as `n` on each metric).

## Derived case fields

| Field | Definition |
|---|---|
| `cycle_days` | (last event − first event) in days, only within the valid window |
| `variant` | the ordered activity sequence, joined |
| `net_worth` | `max(event Cumulative net worth (EUR))` over the case — cumulative, so the max is the case total |
| `rework_count` | count of events in the rework set |
| `has_rework` | any rework event present |
| `repeat_ir` / `repeat_gr` | invoice/goods-receipt milestone recorded more than once |

### Rework set

`Cancel Invoice Receipt`, `Cancel Goods Receipt`, `Cancel Subsequent Invoice`, `Change Price`, `Change Quantity`, `Set Payment Block`, `Remove Payment Block`, `Delete Purchase Order Item`, `Reactivate Purchase Order Item`, `Block Purchase Order Item`.

**Deliberately excluded:** `Change Approval for Purchase Order` and `Change Delivery Indicator`. These are standard control steps for framework / EC order types — every 2-way-match case carries an approval change — so including them would report a meaningless 100% rework rate on that category rather than genuine friction.

## Process maps (directly-follows graphs)

Per matching type. Nodes are activities (sized by frequency); edges are directly-follows transitions with **frequency** and **median hand-off wait** (only in-window transitions contribute to timing). Node horizontal rank = mean relative position of the activity across traces (0 = always first, 1 = always last), giving a stable left-to-right layout without a full topological sort.

## Throughput segments

First-timestamp of each milestone per case, then segment durations (in-window only):

- **PO → GR**: `Create Purchase Order Item` → `Record Goods Receipt`
- **GR → Invoice**: `Record Goods Receipt` → `Record Invoice Receipt`
- **Invoice → Payment**: `Record Invoice Receipt` → `Clear Invoice`
- **End to end**: `Create Purchase Order Item` → `Clear Invoice`

Reported as mean / median / p90 / p95 / max with the contributing `n`.

## Conformance — enforced controls

Checked per matching type; conformance = 1 − violations / eligible.

| Control | Eligible | Violation |
|---|---|---|
| GR before invoice on 3-way (invoice-after-GR) | cases in that category with both GR and IR | IR occurs before GR |
| No goods receipt on 2-way match | all 2-way cases | any GR present |
| No standard invoice on consignment | all consignment cases | any IR present |

All three return **zero violations** — the finding is that the ERP hard-enforces these.

## Active deviations

| Flag | Definition |
|---|---|
| `payment_block` | `Remove Payment Block` present (a block had to be manually cleared) |
| `no_payment` | invoice received but `Clear Invoice` never occurs (open item) |
| `cancellation` | any `Cancel …` activity |
| `repeat_invoice` | `Record Invoice Receipt` recorded more than once |
| `price_qty_change` | `Change Price` or `Change Quantity` after the PO |

A case is a **deviation** if any active flag fires (~34% overall).

## Opportunity impact score

Transparent prioritization heuristic (not a hard savings estimate):

```
impact = (cases / total_cases) × (1 + median_excess_cycle_days) × log10(max(spend_exposed, 10))
```

where `median_excess_cycle_days` is the median of `(case cycle − overall median cycle)` clipped at 0 for the theme's cases. It orders themes by where **volume, delay, and money** concentrate; every component ships alongside the score so the ranking is inspectable.

## Segmentation

Grouped medians/rates by spend area, item type, document type, company, and vendor, with a minimum case threshold (≥30, or ≥50 for vendors) to keep small-n groups out of the rankings. Worst vendors are ordered by **delay burden = cases × median cycle**.
