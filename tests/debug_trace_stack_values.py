"""Read-only traceability helper for the tolerance-stack worksheets.

Given a drawing PDF, print every text run matching a regex together with its
page and the drawing's **printed** zone label -- so a stack element's
``source_ref`` can cite page + zone honestly instead of "somewhere on the
drawing".

Zone labels here are the ones printed in the sheet border (letters down the
sides, numbers across the top/bottom), read off the PDF itself. That is
deliberately *not* ``pipeline.zone_mapper``: ZoneMapper addresses a synthetic
16x12 grid for vision prompts, whereas a human-facing citation -- and Jeff's
own "sheet 5, zone C10" -- means the printed grid.

Usage:
    venv-win\\Scripts\\python.exe tests\\debug_trace_stack_values.py <pdf> --toc
    venv-win\\Scripts\\python.exe tests\\debug_trace_stack_values.py <pdf> \\
        --pattern "4\\.06" [--page 4]

IMPORTED from drawing-checker at tolstack's founding (see PROVENANCE.md), verbatim
apart from this note. Two caveats in *this* repo:

* It needs **PyMuPDF** (``fitz``), which is deliberately not in
  ``requirements.txt`` -- tolstack holds no drawings, so the whole repo would
  carry the dependency for one cross-repo tool. Run it from drawing-checker's
  ``venv-win`` instead, or ``pip install pymupdf`` into this one ad hoc.
* The ``pipeline.zone_mapper`` it contrasts itself with lives in drawing-checker,
  not here. The contrast still matters: cite the **printed** border zone, which
  is what this tool reads and what a human means by "sheet 5, zone C10".
"""

from __future__ import annotations

import argparse
import re
import sys
from typing import List, Tuple

import fitz

_LETTER = re.compile(r"^[A-Z]$")
_DIGITS = re.compile(r"^\d{1,2}$")


def _lines(page: "fitz.Page") -> List[Tuple[str, Tuple[float, float, float, float]]]:
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(s["text"] for s in line["spans"]).strip()
            if text:
                out.append((text, tuple(line["bbox"])))
    return out


def border_grid(page: "fitz.Page", margin_frac: float = 0.035):
    """Read the printed zone ticks from the sheet border.

    Returns (rows, cols) where rows = [(letter, y_center)] and
    cols = [(number, x_center)], or (None, None) if the border isn't legible.
    """
    w, h = page.rect.width, page.rect.height
    mx, my = w * margin_frac, h * margin_frac
    rows: dict[str, List[float]] = {}
    cols: dict[str, List[float]] = {}
    for text, (x0, y0, x1, y1) in _lines(page):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        near_side = cx < mx or cx > w - mx
        near_topbot = cy < my or cy > h - my
        if _LETTER.match(text) and near_side and not near_topbot:
            rows.setdefault(text, []).append(cy)
        elif _DIGITS.match(text) and near_topbot and not near_side:
            cols.setdefault(text, []).append(cx)

    def collapse(d):
        return sorted(((k, sum(v) / len(v)) for k, v in d.items()), key=lambda kv: kv[1])

    r, c = collapse(rows), collapse(cols)
    return (r or None), (c or None)


def zone_for(cx: float, cy: float, rows, cols) -> str:
    if not rows or not cols:
        return "?"
    letter = min(rows, key=lambda kv: abs(kv[1] - cy))[0]
    number = min(cols, key=lambda kv: abs(kv[1] - cx))[0]
    return f"{letter}{number}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--pattern", help="regex matched against each text line")
    ap.add_argument("--page", type=int, help="1-based page filter")
    ap.add_argument("--toc", action="store_true", help="list pages, sizes, detected zone grid")
    ap.add_argument("--context", type=float, help="also print text within N pt of each hit")
    ap.add_argument("--crop", help="render a crop 'page,cx,cy,halfwidth' to --out instead of searching")
    ap.add_argument("--out", default="crop.png")
    ap.add_argument("--zoom", type=float, default=3.0)
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    if args.crop:
        pno, cx, cy, half = (float(v) for v in args.crop.split(","))
        page = doc[int(pno) - 1]
        clip = fitz.Rect(cx - half, cy - half, cx + half, cy + half) & page.rect
        page.get_pixmap(matrix=fitz.Matrix(args.zoom, args.zoom), clip=clip).save(args.out)
        print(f"wrote {args.out} for {clip}")
        return 0
    if args.toc or not args.pattern:
        for i, page in enumerate(doc, 1):
            rows, cols = border_grid(page)
            print(
                f"page {i}: {page.rect.width:.0f} x {page.rect.height:.0f} pt  "
                f"rows={[k for k, _ in rows] if rows else None}  "
                f"cols={[k for k, _ in cols] if cols else None}"
            )
        return 0

    rx = re.compile(args.pattern)
    hits = 0
    for i, page in enumerate(doc, 1):
        if args.page and i != args.page:
            continue
        rows, cols = border_grid(page)
        page_lines = _lines(page)
        for text, (x0, y0, x1, y1) in page_lines:
            if not rx.search(text):
                continue
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            print(f"p{i} zone {zone_for(cx, cy, rows, cols):>4} ({cx:7.1f},{cy:7.1f})  {text!r}")
            hits += 1
            if args.context:
                for t2, (a0, b0, a1, b1) in page_lines:
                    nx, ny = (a0 + a1) / 2, (b0 + b1) / 2
                    if (nx - cx) ** 2 + (ny - cy) ** 2 <= args.context ** 2 and t2 != text:
                        print(f"        near ({nx:7.1f},{ny:7.1f})  {t2!r}")
    print(f"\n{hits} hit(s) for /{args.pattern}/")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
