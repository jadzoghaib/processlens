# ProcessLens Studio — Interactive Purchase-to-Pay Process Intelligence

**The interactive evolution of [ProcessLens](https://github.com/jadzoghaib/processlens): a React cockpit over the BPI Challenge 2019 purchase-to-pay event log — 1,595,923 events, 251,734 cases, €1.56B of observed spend — with cross-filtering, animated process maps, and case-level evidence drill-downs.**

> **🔗 Live: [jadzoghaib.github.io/processlens](https://jadzoghaib.github.io/processlens/)**

Public benchmark data, energy-sector framing: the purchase-to-pay backbone (matching logic, vendor handling, invoice clearing, compliance controls) is standard ERP process across utilities, industrials, and energy-transition supply chains.

## What's interactive

- **Global cross-filter.** The four matching types (`3-way inv-before-GR`, `3-way inv-after-GR`, `consignment`, `2-way`) are a persistent filter bar — selecting one re-scopes the process map, variant table, and throughput views, and *dims* (never repaints) the other series in comparisons.
- **Living process map.** The directly-follows graph draws itself in; hovering a node isolates its hand-offs, hovering an edge shows transition frequency and median wait. Edges waiting >10 days glow amber.
- **Evidence drawers.** Click a variant → its full event trace as an animated timeline (milestones green, rework red). Click an opportunity → the highest-impact real cases behind it → each case's complete trace.
- **Animated KPIs & charts** with hover tooltips throughout, plus a **table view toggle** on charts (accessibility: the data is never color-alone).

## Design system notes

The dark categorical palette (`#4c86e8 · #17a88c · #bd8226 · #b06fe0`) was **validated programmatically** — lightness band, chroma floor, colorblind-vision separation (ΔE 47+ worst adjacent pair), and contrast against the dark surface all pass. Colors are assigned to matching types in fixed order and never cycled; text always wears text tokens, never series color; single-series charts carry no redundant legend, the grouped comparison does.

## Architecture

```
etl/etl.py (pandas, one pass over the 527 MB CSV)
        ▼
web/public/artifacts/*.json     ← compact precomputed analytics
        ▼
web/ (React 19 + Vite + TypeScript + Tailwind 4 + Recharts + Framer Motion)
        ▼  npm run build:site
docs/  → GitHub Pages
```

All analytics are computed once in the ETL; the browser only renders. The five views and every number are identical to the [static original](https://github.com/jadzoghaib/processlens) — independently recounted against the source CSV.

## Reproduce

```bash
# analytics (optional — artifacts ship in the repo)
#   data: https://data.4tu.nl/articles/dataset/BPI_Challenge_2019/12715853 → etl/data/
cd etl && uv sync && uv run python etl.py

# app
cd web
npm install
npm run dev          # local dev
npm run build:site   # production build → ../docs (GitHub Pages)
```

## Findings (unchanged from the analysis)

Median order-to-pay **77 days** with the invoice→payment leg dominating (42d median, p90 97d) · matching-type controls at **100% conformance** across all eligible cases · **22% of cases** hit manual payment-block releases (€397M exposed) · worst vendor: 14,471 cases at 120-day median cycle and 55% rework · **13,881 distinct process variants** — an under-standardized process with clearly ranked levers.

Full metric definitions: [processlens/docs/METHODOLOGY.md](https://github.com/jadzoghaib/processlens/blob/main/docs/METHODOLOGY.md)

## Data & attribution

BPI Challenge 2019, Eindhoven University of Technology, 4TU.ResearchData ([dataset](https://data.4tu.nl/articles/dataset/BPI_Challenge_2019/12715853), doi:10.4121/uuid:d06aff4b-79f0-45e6-8ec8-e19730c248f1). Raw CSV not committed.
