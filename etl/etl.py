"""ProcessLens ETL — BPI Challenge 2019 event log -> analytics artifacts.

One pass over the 1.6M-event purchase-to-pay log produces the compact JSON the
static cockpit renders. Everything downstream (process maps, throughput,
conformance, opportunity ranking) is computed here so the UI ships zero
analytics code and can run on GitHub Pages.

Design notes:
- The case notion is the challenge's own: purchase document + item
  (`case concept:name`). 251,734 cases.
- The four `case Item Category` values ARE the matching types and drive four
  distinct expected process models — conformance is evaluated per category, not
  against one global model.
- Timestamps are anonymized; a handful of events carry absurd years (1948, 1993,
  2001, 2020). Real activity is 2018-2019. We keep every event for ordering but
  clamp case-duration metrics to a sane window so a single 1948 "Vendor creates
  invoice" event doesn't report a 70-year cycle time.
- `event Cumulative net worth (EUR)` gives per-case spend, so opportunity ranking
  weighs delay by money at stake, not just case count.

Usage: uv run python src/etl.py
Output: docs/artifacts/*.json
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "BPI_Challenge_2019.csv"
OUT = ROOT / "docs" / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)

CASE = "case concept:name"
ACT = "event concept:name"
TS = "event time:timestamp"
CAT = "case Item Category"
VENDOR = "case Vendor"
DOC = "case Purchasing Document"
NW = "event Cumulative net worth (EUR)"

ATTRS = ["case Spend area text", "case Company", "case Document Type",
         "case Item Type", CAT, "case Spend classification text",
         "case GR-Based Inv. Verif.", VENDOR, DOC]

# Canonical P2P milestones used across throughput + conformance.
GR = "Record Goods Receipt"
IR = "Record Invoice Receipt"
PAY = "Clear Invoice"
PO = "Create Purchase Order Item"

# Activities that signal genuine rework / friction. Deliberately excludes
# "Change Approval for Purchase Order" and "Change Delivery Indicator" — those
# are standard control steps for framework/EC order types (every 2-way case has
# an approval change), so counting them would inflate rework to a meaningless
# 100% on that category.
REWORK_ACTS = {
    "Cancel Invoice Receipt", "Cancel Goods Receipt", "Cancel Subsequent Invoice",
    "Change Price", "Change Quantity", "Set Payment Block", "Remove Payment Block",
    "Delete Purchase Order Item", "Reactivate Purchase Order Item",
    "Block Purchase Order Item",
}

# Valid activity window for duration metrics (the log's real operating period).
WIN_LO = pd.Timestamp("2017-06-01")
WIN_HI = pd.Timestamp("2019-12-31")


def load() -> pd.DataFrame:
    print(f"reading {DATA.name} ({DATA.stat().st_size/1e6:.0f} MB)…")
    df = pd.read_csv(
        DATA, usecols=[CASE, ACT, TS, NW] + ATTRS,
        dtype=str, engine="c", encoding="latin-1", on_bad_lines="warn")
    df[TS] = pd.to_datetime(df[TS], format="%d-%m-%Y %H:%M:%S.%f", errors="coerce")
    df[NW] = pd.to_numeric(df[NW], errors="coerce")
    df = df.sort_values([CASE, TS], kind="stable").reset_index(drop=True)
    print(f"  {len(df):,} events, {df[CASE].nunique():,} cases")
    return df


def dump(name: str, obj) -> None:
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False,
                               default=_json_default), encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size/1024:.0f} KB)")


def _json_default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return None if np.isnan(o) else round(float(o), 3)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    raise TypeError(str(type(o)))


def r(x, d=1):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), d)


# ---------------------------------------------------------------------------

def build_case_table(df: pd.DataFrame) -> pd.DataFrame:
    """One row per case: attributes + trace + derived metrics."""
    g = df.groupby(CASE, sort=False)
    # first attribute value per case (attributes are case-level, constant)
    first = g[ATTRS].first()
    trace = g[ACT].apply(list).rename("trace")
    n_events = g.size().rename("n_events")
    t_start = g[TS].min().rename("t_start")
    t_end = g[TS].max().rename("t_end")
    net_worth = g[NW].max().rename("net_worth")   # cumulative -> max is case total

    case = pd.concat([first, trace, n_events, t_start, t_end, net_worth], axis=1)

    # duration only when both ends fall in the real operating window
    valid = (case["t_start"].between(WIN_LO, WIN_HI) &
             case["t_end"].between(WIN_LO, WIN_HI))
    dur_days = (case["t_end"] - case["t_start"]).dt.total_seconds() / 86400
    case["cycle_days"] = np.where(valid & (dur_days >= 0), dur_days, np.nan)

    case["variant"] = case["trace"].apply(lambda t: " → ".join(t))
    case["rework_count"] = case["trace"].apply(
        lambda t: sum(1 for a in t if a in REWORK_ACTS))
    case["has_rework"] = case["rework_count"] > 0
    # repeated core milestones = a stronger rework signal
    case["repeat_ir"] = case["trace"].apply(lambda t: t.count(IR) > 1)
    case["repeat_gr"] = case["trace"].apply(lambda t: t.count(GR) > 1)
    return case


def milestone_times(df: pd.DataFrame) -> pd.DataFrame:
    """First timestamp of each P2P milestone per case, for segment throughput."""
    sub = df[df[ACT].isin([PO, GR, IR, PAY])]
    piv = (sub.groupby([CASE, ACT])[TS].min().unstack(ACT))
    for col in [PO, GR, IR, PAY]:
        if col not in piv:
            piv[col] = pd.NaT
    return piv


def seg_days(a: pd.Series, b: pd.Series) -> pd.Series:
    d = (b - a).dt.total_seconds() / 86400
    ok = a.between(WIN_LO, WIN_HI) & b.between(WIN_LO, WIN_HI) & (d >= 0)
    return d.where(ok)


def pct_summary(s: pd.Series) -> dict:
    s = s.dropna()
    if s.empty:
        return {"n": 0}
    return {"n": int(s.shape[0]), "mean": r(s.mean()), "median": r(s.median()),
            "p90": r(s.quantile(0.90)), "p95": r(s.quantile(0.95)), "max": r(s.max())}


# ---------------------------------------------------------------------------

def artifact_overview(df, case):
    yr = df[TS].dt.year.value_counts().sort_index()
    acts = df[ACT].value_counts()
    dump("overview", {
        "events": int(len(df)),
        "cases": int(case.shape[0]),
        "activities": int(df[ACT].nunique()),
        "documents": int(df[DOC].nunique()),
        "vendors": int(df[VENDOR].nunique()),
        "spend_total_eur": r(case["net_worth"].sum(), 0),
        "median_cycle_days": r(case["cycle_days"].median()),
        "rework_rate": r(case["has_rework"].mean() * 100),
        "activity_freq": [{"activity": a, "count": int(c)} for a, c in acts.items()],
        "events_by_year": [{"year": int(y), "count": int(c)} for y, c in yr.items()],
        "categories": [
            {"category": k, "cases": int(v)}
            for k, v in case[CAT].value_counts().items()],
        "source": "BPI Challenge 2019 — 4TU.ResearchData, doi:10.4121/uuid:d06aff4b-79f0-45e6-8ec8-e19730c248f1",
    })


def artifact_dfg(df, case):
    """Directly-follows graph per item category: edge frequency + median hours.
    Only real-window transitions contribute to timing."""
    out = {}
    cat_of = case[CAT]
    df = df.copy()
    df["cat"] = df[CASE].map(cat_of)
    # average position of each activity within a case (0..1) -> a stable left-to-right
    # rank for laying the process map out without a full topological sort in the UI.
    pos = df.groupby(CASE, sort=False).cumcount()
    csize = df.groupby(CASE, sort=False)[ACT].transform("size")
    df["relpos"] = np.where(csize > 1, pos / (csize - 1), 0.0)
    rank_of = df.groupby(ACT)["relpos"].mean()
    df["next_act"] = df.groupby(CASE, sort=False)[ACT].shift(-1)
    df["next_ts"] = df.groupby(CASE, sort=False)[TS].shift(-1)
    df["edge_hours"] = (df["next_ts"] - df[TS]).dt.total_seconds() / 3600
    df.loc[~(df[TS].between(WIN_LO, WIN_HI) &
             df["next_ts"].between(WIN_LO, WIN_HI) & (df["edge_hours"] >= 0)),
           "edge_hours"] = np.nan
    edges = df.dropna(subset=["next_act"])

    for cat, grp in edges.groupby("cat"):
        agg = grp.groupby([ACT, "next_act"]).agg(
            freq=("edge_hours", "size"),
            median_hours=("edge_hours", "median")).reset_index()
        agg = agg.sort_values("freq", ascending=False)
        node_freq = df[df["cat"] == cat][ACT].value_counts()
        out[cat] = {
            "nodes": [{"activity": a, "freq": int(c), "rank": r(rank_of.get(a, 0.5), 3)}
                      for a, c in node_freq.items()],
            "edges": [{"from": e[ACT], "to": e["next_act"], "freq": int(e["freq"]),
                       "median_hours": r(e["median_hours"])}
                      for _, e in agg.iterrows()],
            "cases": int((cat_of == cat).sum()),
        }
    dump("dfg", out)


def artifact_variants(df, case):
    def top_variants(sub, k=12):
        vc = sub["variant"].value_counts()
        total = int(vc.sum())
        rows = []
        for v, c in vc.head(k).items():
            m = sub[sub["variant"] == v]
            rows.append({
                "variant": v.split(" → "),
                "cases": int(c),
                "share": r(c / total * 100, 2),
                "median_cycle_days": r(m["cycle_days"].median()),
                "rework_rate": r(m["has_rework"].mean() * 100),
            })
        return {"distinct_variants": int(vc.shape[0]), "total_cases": total, "top": rows}

    out = {"overall": top_variants(case)}
    for cat, grp in case.groupby(CAT):
        out[cat] = top_variants(grp)
    dump("variants", out)


def artifact_throughput(df, case):
    ms = milestone_times(df)
    ms = ms.join(case[[CAT]], how="left")
    ms["po_to_gr"] = seg_days(ms[PO], ms[GR])
    ms["gr_to_ir"] = seg_days(ms[GR], ms[IR])
    ms["ir_to_pay"] = seg_days(ms[IR], ms[PAY])
    ms["po_to_pay"] = seg_days(ms[PO], ms[PAY])

    def block(frame):
        return {seg: pct_summary(frame[seg])
                for seg in ["po_to_gr", "gr_to_ir", "ir_to_pay", "po_to_pay"]}

    out = {"overall": block(ms),
           "by_category": {cat: block(grp) for cat, grp in ms.groupby(CAT)}}
    dump("throughput", out)
    return ms


def artifact_compliance(df, case, ms):
    """Deviation flags evaluated against each matching type's expected flow."""
    c = case
    trace = c["trace"]
    has = lambda act: trace.apply(lambda t: act in t)
    idx = lambda act: trace.apply(lambda t: t.index(act) if act in t else -1)

    gr_i, ir_i = idx(GR), idx(IR)
    is_3way_after = c[CAT] == "3-way match, invoice after GR"
    is_3way_before = c[CAT] == "3-way match, invoice before GR"
    is_2way = c[CAT] == "2-way match"
    is_consign = c[CAT] == "Consignment"

    # --- Enforced controls: matching-type rules the ERP should uphold. Their
    #     violation counts come out to zero across 251K cases, which is the
    #     finding — the three-way/two-way/consignment ordering is hard-enforced. ---
    controls = {
        "gr_before_invoice_on_3way_after": {
            "desc": "3-way (invoice-after-GR) items: goods receipt precedes invoice",
            "eligible": (is_3way_after & has(GR) & has(IR)),
            "violation": (is_3way_after & has(GR) & has(IR) & (ir_i < gr_i)),
        },
        "no_gr_on_2way": {
            "desc": "2-way match items carry no goods receipt",
            "eligible": is_2way,
            "violation": (is_2way & has(GR)),
        },
        "no_standard_invoice_on_consignment": {
            "desc": "Consignment items carry no standard invoice receipt",
            "eligible": is_consign,
            "violation": (is_consign & has(IR)),
        },
    }
    control_rows = []
    for name, d in controls.items():
        elig = int(d["eligible"].sum())
        viol = int(d["violation"].sum())
        control_rows.append({
            "control": name, "desc": d["desc"], "eligible_cases": elig,
            "violations": viol,
            "conformance": r((1 - viol / elig) * 100, 3) if elig else None,
        })

    # --- Active deviations: patterns that actually occur and cost money. ---
    flags = pd.DataFrame(index=c.index)
    needs_pay = is_3way_after | is_3way_before | is_2way
    flags["no_payment"] = needs_pay & has(IR) & ~has(PAY)
    flags["payment_block"] = trace.apply(lambda t: "Remove Payment Block" in t)
    flags["cancellation"] = trace.apply(
        lambda t: any(a.startswith("Cancel") for a in t))
    flags["repeat_invoice"] = c["repeat_ir"]
    flags["price_qty_change"] = trace.apply(
        lambda t: "Change Price" in t or "Change Quantity" in t)

    c = c.join(flags)
    # keep the control-violation booleans on the case table for worst-case flags
    for name, d in controls.items():
        c[name + "__viol"] = d["violation"]
    c["deviation"] = flags.any(axis=1)

    flag_defs = {
        "no_payment": "Invoice received but never cleared (open item)",
        "payment_block": "Payment block had to be manually removed",
        "cancellation": "A goods-receipt / invoice step was cancelled",
        "repeat_invoice": "Invoice receipt recorded more than once",
        "price_qty_change": "Price or quantity changed after the PO",
    }
    summary = []
    for f, desc in flag_defs.items():
        sel = c[c[f]]
        summary.append({
            "flag": f, "desc": desc, "cases": int(c[f].sum()),
            "share": r(c[f].mean() * 100, 2),
            "spend_exposed_eur": r(sel["net_worth"].sum(), 0),
            "median_cycle_days": r(sel["cycle_days"].median()),
        })
    summary.sort(key=lambda x: x["cases"], reverse=True)

    by_cat = []
    for cat, grp in c.groupby(CAT):
        by_cat.append({
            "category": cat, "cases": int(grp.shape[0]),
            "deviation_rate": r(grp["deviation"].mean() * 100, 2),
            "rework_rate": r(grp["has_rework"].mean() * 100, 2),
            "median_cycle_days": r(grp["cycle_days"].median()),
        })

    dump("compliance", {
        "enforced_controls": control_rows,
        "active_deviations": summary,
        "by_category": by_cat,
        "deviation_rate_overall": r(c["deviation"].mean() * 100, 2),
    })
    return c


def artifact_segmentation(df, case):
    def seg(col, k=12, min_cases=30):
        g = case.groupby(col)
        agg = g.agg(cases=("cycle_days", "size"),
                    median_cycle=("cycle_days", "median"),
                    rework_rate=("has_rework", "mean"),
                    deviation_rate=("deviation", "mean"),
                    spend=("net_worth", "sum")).reset_index()
        agg = agg[agg["cases"] >= min_cases]
        rows = []
        for _, x in agg.sort_values("cases", ascending=False).head(k).iterrows():
            rows.append({
                "key": str(x[col]), "cases": int(x["cases"]),
                "median_cycle_days": r(x["median_cycle"]),
                "rework_rate": r(x["rework_rate"] * 100, 1),
                "deviation_rate": r(x["deviation_rate"] * 100, 1),
                "spend_eur": r(x["spend"], 0),
            })
        return rows

    # worst vendors by delay burden = cases × median cycle (only real volume)
    gv = case.groupby(VENDOR).agg(
        cases=("cycle_days", "size"), median_cycle=("cycle_days", "median"),
        rework=("has_rework", "mean"), spend=("net_worth", "sum")).reset_index()
    gv = gv[gv["cases"] >= 50]
    gv["delay_burden"] = gv["cases"] * gv["median_cycle"].fillna(0)
    worst_vendors = [{
        "vendor": x[VENDOR], "cases": int(x["cases"]),
        "median_cycle_days": r(x["median_cycle"]),
        "rework_rate": r(x["rework"] * 100, 1), "spend_eur": r(x["spend"], 0),
        "delay_burden": r(x["delay_burden"], 0),
    } for _, x in gv.sort_values("delay_burden", ascending=False).head(15).iterrows()]

    dump("segmentation", {
        "spend_area": seg("case Spend area text"),
        "item_type": seg("case Item Type"),
        "document_type": seg("case Document Type"),
        "company": seg("case Company", min_cases=1),
        "worst_vendors": worst_vendors,
    })


def artifact_opportunities(df, case):
    """Rank improvement themes by an impact score that blends how many cases are
    affected, how slow/deviant they are, and the spend exposed. Deliberately
    transparent — the score components ship with each row."""
    ops = []

    def opp(name, sel, lever):
        sel = sel.dropna(subset=["net_worth"])
        n = int(sel.shape[0])
        if n == 0:
            return
        med = case["cycle_days"].median()
        excess = float((sel["cycle_days"] - med).clip(lower=0).median() or 0)
        spend = float(sel["net_worth"].sum())
        # impact: normalized volume × excess-delay × log-spend
        score = (n / len(case)) * (1 + excess) * np.log10(max(spend, 10))
        ops.append({
            "theme": name, "lever": lever, "cases": n,
            "share": r(n / len(case) * 100, 2),
            "excess_cycle_days": r(excess),
            "spend_exposed_eur": r(spend, 0),
            "impact_score": r(score, 2),
        })

    opp("Invoice-before-goods-receipt on 3-way items",
        case[(case[CAT] == "3-way match, invoice after GR") &
             case["trace"].apply(lambda t: IR in t and GR in t and t.index(IR) < t.index(GR))],
        "Enforce GR-before-invoice posting; hold invoices until receipt is booked")
    opp("Payment blocks requiring manual release",
        case[case["trace"].apply(lambda t: "Remove Payment Block" in t)],
        "Root-cause the block reasons (price/quantity mismatch) upstream at PO")
    opp("Invoice cancellations & re-entry",
        case[case["trace"].apply(lambda t: "Cancel Invoice Receipt" in t)],
        "Improve invoice data quality / vendor master to cut re-keying")
    opp("Duplicate invoice receipts",
        case[case["repeat_ir"]],
        "Add duplicate-invoice detection before posting")
    opp("Received but never cleared (open invoices)",
        case[case["trace"].apply(lambda t: IR in t and PAY not in t)],
        "Chase aged open invoices; tighten clearing SLA")
    opp("Price / quantity changes after PO",
        case[case["trace"].apply(
            lambda t: "Change Price" in t or "Change Quantity" in t)],
        "Tighten PO accuracy to avoid downstream amendments")

    ops.sort(key=lambda x: x["impact_score"], reverse=True)
    dump("opportunities", {"ranked": ops})


def artifact_worst_cases(df, case):
    """Highest-impact deviating cases, each with its full trace for evidence
    traversal in the UI (case -> its events -> the flag it tripped)."""
    dev = case[case["deviation"]].copy()
    dev["impact"] = dev["net_worth"].fillna(0) * (dev["cycle_days"].fillna(0) + 1)
    top = dev.sort_values("impact", ascending=False).head(40)
    flag_cols = ["no_payment", "payment_block", "cancellation", "repeat_invoice",
                 "price_qty_change"]
    rows = []
    for cid, x in top.iterrows():
        rows.append({
            "case": cid,
            "category": x[CAT], "vendor": x[VENDOR],
            "spend_area": x["case Spend area text"],
            "item_type": x["case Item Type"],
            "net_worth_eur": r(x["net_worth"], 0),
            "cycle_days": r(x["cycle_days"]),
            "n_events": int(x["n_events"]),
            "rework_count": int(x["rework_count"]),
            "flags": [f for f in flag_cols if bool(x[f])],
            "trace": x["trace"],
        })
    dump("worst_cases", {"cases": rows})


def main() -> int:
    df = load()
    print("building case table…")
    case = build_case_table(df)
    print("writing artifacts…")
    artifact_overview(df, case)
    artifact_dfg(df, case)
    artifact_variants(df, case)
    ms = artifact_throughput(df, case)
    case = artifact_compliance(df, case, ms)   # adds deviation columns
    artifact_segmentation(df, case)
    artifact_opportunities(df, case)
    artifact_worst_cases(df, case)
    print("done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
