"""Dump an .xlsx sheet (formulas + cached values) using only the stdlib.

Why stdlib and not openpyxl: the one thing we need most here -- seeing Jeff's
*formulas* next to their *cached results* -- takes two passes with openpyxl
(data_only=False / True, and the second pass needs a file Excel has actually
recalculated). The raw sheet XML carries both on every cell, so a ~100-line
reader beats a new dependency. tolstack's requirements.txt keeps it that way.

Watch for **shared formulas**: a cell stored as ``<f t="shared" si="1"/>`` has no
formula text of its own (it shares an earlier cell's), so a naive reader reports
it as empty. ``H69`` in the seeded workbook is one.

Usage:
    venv-win\\Scripts\\python.exe tests\\debug_dump_tol_stack_xlsx.py \\
        data/inbox/tolerance_stacks/260729_sample_tol_stack.xlsx [--csv out.csv]

IMPORTED from drawing-checker at tolstack's founding (see PROVENANCE.md), verbatim
apart from this note. Stdlib only, so it runs under this repo's venv-win as-is.
The workbook it reads is gitignored data: if it is absent, re-copy it per
``data/inbox/tolerance_stacks/PROVENANCE.md``.
"""

from __future__ import annotations

import argparse
import re
import zipfile
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
_CELL_RE = re.compile(r"^([A-Z]+)(\d+)$")


def col_index(ref: str) -> int:
    """'A' -> 0, 'B' -> 1, ... 'AA' -> 26."""
    n = 0
    for ch in ref:
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return n - 1


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        raw = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(raw)
    out = []
    for si in root.findall("m:si", NS):
        out.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    return out


def sheet_paths(zf: zipfile.ZipFile) -> list[tuple[str, str]]:
    """[(sheet name, zip path)] in workbook order."""
    wb = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rns = "{http://schemas.openxmlformats.org/package/2006/relationships}"
    rid_to_target = {r.get("Id"): r.get("Target") for r in rels.findall(f"{rns}Relationship")}
    rid_attr = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    out = []
    for sh in wb.findall("m:sheets/m:sheet", NS):
        target = rid_to_target[sh.get(rid_attr)]
        if not target.startswith("xl/"):
            target = "xl/" + target.lstrip("/")
        out.append((sh.get("name"), target))
    return out


def read_cells(zf: zipfile.ZipFile, path: str, strings: list[str]) -> dict[tuple[int, int], dict]:
    """{(row, col): {'ref','value','formula'}} -- 1-based row, 0-based col."""
    root = ET.fromstring(zf.read(path))
    cells: dict[tuple[int, int], dict] = {}
    for c in root.iter(f"{{{NS['m']}}}c"):
        ref = c.get("r")
        mo = _CELL_RE.match(ref or "")
        if not mo:
            continue
        col, row = col_index(mo.group(1)), int(mo.group(2))
        ctype = c.get("t")
        f = c.find("m:f", NS)
        v = c.find("m:v", NS)
        if ctype == "inlineStr":
            is_el = c.find("m:is", NS)
            value = "".join(t.text or "" for t in is_el.iter(f"{{{NS['m']}}}t")) if is_el is not None else ""
        elif ctype == "s" and v is not None and v.text is not None:
            value = strings[int(v.text)]
        else:
            value = v.text if v is not None else None
        if value is None and f is None:
            continue
        cells[(row, col)] = {
            "ref": ref,
            "value": value,
            "formula": ("=" + (f.text or "")) if f is not None else None,
        }
    return cells


def dump(xlsx: str, csv_out: str | None = None) -> None:
    with zipfile.ZipFile(xlsx) as zf:
        strings = load_shared_strings(zf)
        rows_for_csv: list[list[str]] = []
        for name, path in sheet_paths(zf):
            cells = read_cells(zf, path, strings)
            print(f"\n=== SHEET: {name!r}  ({len(cells)} non-empty cells) ===")
            if not cells:
                continue
            max_row = max(r for r, _ in cells)
            for row in range(1, max_row + 1):
                in_row = {c: d for (r, c), d in cells.items() if r == row}
                if not in_row:
                    continue
                parts = []
                for col in sorted(in_row):
                    d = in_row[col]
                    txt = d["formula"] if d["formula"] else (d["value"] or "")
                    if d["formula"] and d["value"] is not None:
                        txt = f"{d['formula']} -> {d['value']}"
                    parts.append(f"{d['ref']}={txt}")
                print(f"r{row:>3}: " + " | ".join(parts))
                if csv_out:
                    rows_for_csv.append([name, str(row)] + [f"{in_row[c]['ref']}\t{in_row[c]['formula'] or ''}\t{in_row[c]['value'] or ''}" for c in sorted(in_row)])
    if csv_out:
        import csv

        with open(csv_out, "w", newline="", encoding="utf-8") as fh:
            csv.writer(fh).writerows(rows_for_csv)
        print(f"\nwrote {csv_out}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--csv")
    args = ap.parse_args()
    dump(args.xlsx, args.csv)
