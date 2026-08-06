"""Report a thermal-fit stack: results, generated term lists, workbook comparison.

The thermal-fit archetype generates its checks (``tolerance_stack.thermal``), so
unlike every other stack in this repo the term lists are *not* readable in the
JSON. That is a real cost -- the repo's central safety property is that a human
can read every sign and weight -- and this tool is how it is paid back: it prints
the expanded terms alongside the results, and the worksheet pastes the output.

Usage:
    venv-win\\Scripts\\python.exe tests\\debug_report_thermal_fit.py
    venv-win\\Scripts\\python.exe tests\\debug_report_thermal_fit.py --terms
    venv-win\\Scripts\\python.exe tests\\debug_report_thermal_fit.py --compare
    venv-win\\Scripts\\python.exe tests\\debug_report_thermal_fit.py --markdown

Written 2026-08-05 by handoff ``hub_bearing_thermal_stack``. Not imported from
drawing-checker -- nothing there corresponds to it.

Sign convention: **interference positive**, the opposite of the workbook's fit
rows. A negative number is a CLEARANCE and therefore a failure.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tolerance_stack.thermal import (  # noqa: E402
    expanded_terms_table,
    load_materials,
    load_thermal_fit_stack,
    workbook_corner,
)

STACKS_DIR = Path(__file__).resolve().parent.parent / "docs" / "tolerance_stacks"
THERMAL_STACKS = ("stack_hub_bearing_thermal_fit_m2.json",
                  "stack_hub_bearing_thermal_fit_m1.json")


def load_all():
    materials = load_materials(STACKS_DIR / "materials.json")
    out = []
    for name in THERMAL_STACKS:
        path = STACKS_DIR / name
        if path.exists():
            out.append(load_thermal_fit_stack(path, materials))
    return out


def report_results(stack, markdown: bool) -> None:
    bar = "|" if markdown else " "
    if markdown:
        print(f"\n### `{stack.id}`\n")
        print("| check | nominal | WC min (loosest) | WC max (tightest) | RSS center | RSS ± | verdict |")
        print("|---|---:|---:|---:|---:|---:|---|")
    else:
        print(f"\n=== {stack.id} ===")
        print(f"{'check_id':52} {'nominal':>10} {'wc_min':>10} {'wc_max':>10} "
              f"{'rss_ctr':>10} {'rss_half':>9}  verdict")
    for result in stack.all_checks():
        i = result.interval
        cells = [
            f"`{result.check_id}`" if markdown else f"{result.check_id:52}",
            f"{i.nominal:.5f}", f"{i.min:.5f}", f"{i.max:.5f}",
            f"{i.rss_center:.5f}", f"{i.rss_half:.5f}", result.verdict,
        ]
        if markdown:
            print("| " + " | ".join(cells) + " |")
        else:
            print(f"{cells[0]} {float(cells[1]):10.5f} {float(cells[2]):10.5f} "
                  f"{float(cells[3]):10.5f} {float(cells[4]):10.5f} "
                  f"{float(cells[5]):9.5f}  {cells[6]}")
    del bar


def report_terms(stack, markdown: bool) -> None:
    rows = expanded_terms_table(stack)
    if markdown:
        print(f"\n### Expanded terms — `{stack.id}`\n")
        print("| check | element | sign | coefficient | weight | element min | element max |")
        print("|---|---|---:|---:|---:|---:|---:|")
        for r in rows:
            print(f"| `{r['check_id']}` | `{r['element']}` | {r['sign']:+d} | "
                  f"{r['coefficient']:.9f} | {r['weight']:+.9f} | "
                  f"{r['min']:.4f} | {r['max']:.4f} |")
        return
    print(f"\n=== {stack.id}: expanded terms ({len(rows)} total) ===")
    print(f"{'check_id':52} {'element':22} {'sign':>5} {'coefficient':>13} {'weight':>14}")
    for r in rows:
        print(f"{r['check_id']:52} {r['element']:22} {r['sign']:>+5d} "
              f"{r['coefficient']:13.9f} {r['weight']:+14.9f}")


def report_compare(stack, markdown: bool) -> None:
    """This stack's worst-case fold against the workbook's coherent corners."""
    spec = stack.thermal_fit
    if markdown:
        print(f"\n### Worst-case fold vs the workbook's coherent corners — `{stack.id}`\n")
        print("| chain | stage | temperature | workbook LMC (loose) | fold WC min | delta "
              "| workbook MMC (tight) | fold WC max | delta |")
        print("|---|---|---|---:|---:|---:|---:|---:|---:|")
    else:
        print(f"\n=== {stack.id}: worst case vs workbook coherent corners ===")
        print(f"{'chain':12} {'stage':18} {'temp':6} {'wb_lmc':>11} {'fold_min':>11} "
              f"{'delta':>10} {'wb_mmc':>11} {'fold_max':>11} {'delta':>10}")
    worst = 0.0
    for chain in spec.chains:
        for stage in ("hub_to_sleeve", "sleeve_to_bearing"):
            for group in spec.groups_by_temperature:
                result = stack.check(f"{chain.id}__{stage}__{group}")
                lmc = workbook_corner(stack, chain.id, stage, group, "lmc")
                mmc = workbook_corner(stack, chain.id, stage, group, "mmc")
                d_lo = result.interval.min - lmc
                d_hi = result.interval.max - mmc
                worst = max(worst, abs(d_lo), abs(d_hi))
                if markdown:
                    print(f"| {chain.id} | {stage} | {group} | {lmc:+.7f} | "
                          f"{result.interval.min:+.7f} | {d_lo:+.7f} | {mmc:+.7f} | "
                          f"{result.interval.max:+.7f} | {d_hi:+.7f} |")
                else:
                    print(f"{chain.id:12} {stage:18} {group:6} {lmc:+11.7f} "
                          f"{result.interval.min:+11.7f} {d_lo:+10.7f} {mmc:+11.7f} "
                          f"{result.interval.max:+11.7f} {d_hi:+10.7f}")
    print(f"\nlargest |delta| between the fold and a workbook corner: {worst:.7f} mm")


def report_nominal_compare(stack, markdown: bool) -> None:
    """The workbook's nominal column against the fold's nominal."""
    spec = stack.thermal_fit
    header = f"\n=== {stack.id}: nominal column ==="
    if markdown:
        print(f"\n### Nominal column — `{stack.id}`\n")
        print("| chain | stage | temperature | workbook nominal | fold nominal | delta |")
        print("|---|---|---|---:|---:|---:|")
    else:
        print(header)
        print(f"{'chain':12} {'stage':18} {'temp':6} {'wb_nom':>12} {'fold_nom':>12} {'delta':>11}")
    for chain in spec.chains:
        for stage in ("hub_to_sleeve", "sleeve_to_bearing"):
            for group in spec.groups_by_temperature:
                result = stack.check(f"{chain.id}__{stage}__{group}")
                nom = workbook_corner(stack, chain.id, stage, group, "nom")
                delta = result.interval.nominal - nom
                if markdown:
                    print(f"| {chain.id} | {stage} | {group} | {nom:+.7f} | "
                          f"{result.interval.nominal:+.7f} | {delta:+.7f} |")
                else:
                    print(f"{chain.id:12} {stage:18} {group:6} {nom:+12.7f} "
                          f"{result.interval.nominal:+12.7f} {delta:+11.7f}")


# The workbook's own cached cells, by (stack id, chain, stage) -> row, and by
# temperature group -> column. Rows: 19/25 are the lower seat's two fit rows,
# 37/43 the upper seat's. See tests/test_hub_bearing_rederivation.py.
WORKBOOK_SHEET = {"hub_bearing_thermal_fit_m2": "M2", "hub_bearing_thermal_fit_m1": "M1"}
WORKBOOK_ROW = {
    ("lower_seat", "hub_to_sleeve"): 19,
    ("lower_seat", "sleeve_to_bearing"): 25,
    ("upper_seat", "hub_to_sleeve"): 37,
    ("upper_seat", "sleeve_to_bearing"): 43,
}
WORKBOOK_COLUMN = {
    ("room", "nom"): "C", ("room", "lmc"): "D", ("room", "mmc"): "E",
    ("hot", "nom"): "G", ("hot", "lmc"): "H", ("hot", "mmc"): "I",
    ("cold", "nom"): "K", ("cold", "lmc"): "L", ("cold", "mmc"): "M",
}


def report_workbook_cells(stack, markdown: bool) -> None:
    """This stack against the workbook's actual cached cells, sign flipped.

    Distinct from ``--compare``, which reproduces the workbook's *method* using
    this stack's own element values. This one reads the spreadsheet's real
    numbers, so it is where a value divergence shows up: the lower seat's wall
    drift (workbook 1.18 vs 214955-004's 1.190) and the lower bearing's nominal
    (workbook 199.98 vs the drawing's basic 200.000).
    """
    from tests.test_hub_bearing_rederivation import CACHED  # noqa: PLC0415

    tag = WORKBOOK_SHEET[stack.id]
    spec = stack.thermal_fit
    if markdown:
        print(f"\n### Against the workbook's cached cells — `{stack.id}` (sheet {tag})\n")
        print("| cell | chain / stage / temp / corner | workbook (fit, neg = inx) | "
              "workbook negated (= interference) | this stack | delta |")
        print("|---|---|---:|---:|---:|---:|")
    else:
        print(f"\n=== {stack.id} vs the workbook's cached cells (sheet {tag}) ===")
        print(f"{'cell':7} {'chain/stage/temp/corner':46} {'wb_fit':>12} {'wb_inx':>12} "
              f"{'stack':>12} {'delta':>12}")
    worst = 0.0
    for chain in spec.chains:
        for stage in ("hub_to_sleeve", "sleeve_to_bearing"):
            row = WORKBOOK_ROW[(chain.id, stage)]
            result = stack.check(f"{chain.id}__{stage}__{spec.hottest}")
            del result
            for group in spec.groups_by_temperature:
                res = stack.check(f"{chain.id}__{stage}__{group}")
                for corner, attr in (("nom", "nominal"), ("lmc", "min"), ("mmc", "max")):
                    letter = WORKBOOK_COLUMN[(group, corner)]
                    wb_fit = CACHED[tag][row][letter]
                    wb_inx = -wb_fit
                    mine = getattr(res.interval, attr)
                    delta = mine - wb_inx
                    worst = max(worst, abs(delta))
                    where = f"{chain.id}/{stage}/{group}/{corner}"
                    if markdown:
                        print(f"| `{tag}!{letter}{row}` | {where} | {wb_fit:+.7f} | "
                              f"{wb_inx:+.7f} | {mine:+.7f} | {delta:+.7f} |")
                    else:
                        print(f"{letter}{row:<6} {where:46} {wb_fit:+12.7f} {wb_inx:+12.7f} "
                              f"{mine:+12.7f} {delta:+12.7f}")
    print(f"\nlargest |delta| against a workbook cell: {worst:.7f} mm")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--terms", action="store_true", help="print the expanded term lists")
    ap.add_argument("--compare", action="store_true",
                    help="fold worst case vs the workbook's coherent LMC/MMC corners, "
                         "both computed from this stack's element values")
    ap.add_argument("--workbook", action="store_true",
                    help="this stack against the workbook's actual cached cells")
    ap.add_argument("--nominal", action="store_true", help="nominal column comparison")
    ap.add_argument("--markdown", action="store_true", help="emit markdown tables")
    args = ap.parse_args()

    stacks = load_all()
    if not stacks:
        print("no thermal-fit stacks found in docs/tolerance_stacks/")
        return 1
    for stack in stacks:
        if args.terms:
            report_terms(stack, args.markdown)
        elif args.compare:
            report_compare(stack, args.markdown)
        elif args.workbook:
            report_workbook_cells(stack, args.markdown)
        elif args.nominal:
            report_nominal_compare(stack, args.markdown)
        else:
            report_results(stack, args.markdown)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
