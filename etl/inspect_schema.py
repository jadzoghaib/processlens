"""Schema probe for the raw BPI Challenge 2019 CSV.

Confirms the published shape (1,595,923 events / 251,734 cases / 42 activities /
76,349 purchase documents) and surveys the attribute columns we'll model, so the
ETL is written against the real data rather than assumptions.
"""
import sys
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parent / "data" / "BPI_Challenge_2019.csv"

# The CSV is ~527 MB; read only what each question needs.
CASE_KEY = "case concept:name"        # case = purchase document + item
ACT = "event concept:name"
TS = "event time:timestamp"

CATEGORICAL = [
    "case Spend area text", "case Company", "case Document Type",
    "case Sub spend area text", "case Purch. Doc. Category name",
    "case Item Type", "case Item Category", "case Spend classification text",
    "case Source", "case GR-Based Inv. Verif.", "case Goods Receipt",
]


def main() -> int:
    print(f"reading {DATA.name} ({DATA.stat().st_size/1e6:.0f} MB)")
    # Full read of the low-cardinality columns; the free-text Literal columns are skipped.
    usecols = [CASE_KEY, ACT, TS, "case Vendor", "case Purchasing Document",
               "event User", "event Cumulative net worth (EUR)"] + CATEGORICAL
    df = pd.read_csv(DATA, usecols=usecols, dtype=str, engine="c",
                     encoding="latin-1", on_bad_lines="warn")
    n = len(df)
    print(f"\nrows (events): {n:,}")
    print(f"cases (case concept:name): {df[CASE_KEY].nunique():,}")
    print(f"activities (event concept:name): {df[ACT].nunique():,}")
    print(f"purchase documents: {df['case Purchasing Document'].nunique():,}")
    print(f"vendors: {df['case Vendor'].nunique():,}")
    print(f"users: {df['event User'].nunique():,}")

    print("\n=== activities ===")
    for a, c in df[ACT].value_counts().items():
        print(f"  {c:>9,}  {a}")

    print("\n=== categorical cardinalities + top values ===")
    for col in CATEGORICAL:
        vc = df[col].value_counts(dropna=False)
        top = "; ".join(f"{k}={v:,}" for k, v in vc.head(5).items())
        print(f"  {col}: {vc.shape[0]} distinct | {top}")

    print("\n=== timestamp sanity (the 1948 anonymization quirk) ===")
    ts = pd.to_datetime(df[TS], format="%d-%m-%Y %H:%M:%S.%f", errors="coerce")
    print(f"  parse failures: {ts.isna().sum():,}")
    yr = ts.dt.year.value_counts().sort_index()
    print("  events by year:")
    for y, c in yr.items():
        print(f"    {int(y)}: {c:,}")

    # net worth signal
    nw = pd.to_numeric(df["event Cumulative net worth (EUR)"], errors="coerce")
    print(f"\nnet worth (EUR): min={nw.min():,.0f} max={nw.max():,.0f} "
          f"median={nw.median():,.0f} nonnull={nw.notna().sum():,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
