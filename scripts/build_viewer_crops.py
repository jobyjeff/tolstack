"""Render drawing crops for the viewer's hover popovers, plus a locator index.

The viewer is a static page: it cannot roam the filesystem, cannot open a PDF,
and cannot reach into ``C:\\workspace\\drawing-checker``. So the hovers read
**pre-rendered crops** produced here -- one PNG per stack element whose
``source_ref`` resolves to a real page of a real PDF, plus
``crops.json`` saying, for every element, either where its crop is or *exactly
why there isn't one*.

**Never guess.** A crop is only rendered when the citation pins a document this
script can name without inference:

1. ``kind: "spec"`` -- ``document`` is a filename in ``data/inbox/specs/``.
2. ``kind: "drawing" | "parts_list"`` whose ``document`` equals the stack's
   ``joint.assembly_drawing`` -- resolved through ``joint.assembly_export``,
   which names the drawing-checker run; the run's ``run_meta.json`` names the
   input PDF and its sha256, and the sha is **verified** before cropping.
3. otherwise, ``provenance.sources_used`` -- but only if **exactly one** entry
   begins with a ``.pdf`` path and mentions the cited document. Two matches is
   ambiguity, and ambiguity is unresolvable, not a coin flip.

Everything else is recorded as unresolvable with the reason. The reason list is
the point as much as the crops are: zone citations expire between exports (the
pitch_link lesson's edit 11 -- DETAIL B moved I6 -> H3 between two exports of the
same revision), and a stack whose ``joint`` block names no export cannot be
crop-resolved at all. Both show up in the report.

Where the crop is taken (in order):

* **the cited zone**, if ``zone`` is set and the sheet's printed border grid is
  legible: the cited cell padded by ``--zone-pad`` cells. The citation is a zone
  citation, so the zone is what gets shown. The locator also records whether the
  callout's own text was found *inside* that cell -- corroboration, not a
  requirement (a parts-list nomenclature is cited at the balloon, and lives on
  the parts-list sheet).
* **the callout text**, if no zone is cited and a needle derived from the
  callout matches exactly once on the page.
* **the whole sheet** otherwise, with the reason recorded (a scanned standard
  with no text layer, which is what ``NAS6403-NAS6420 Rev 4.pdf`` is, lands
  here).

Output (wipe-and-rebuild; owns only its own files, ``results.json`` is
``build_viewer_projection.py``'s)::

    <data-root>/projections/viewer/crops.json
    <data-root>/projections/viewer/crops/*.png

Needs **PyMuPDF** (``fitz``), deliberately absent from ``requirements.txt`` --
run it from drawing-checker's venv, the ``tests/debug_trace_stack_values.py``
precedent::

    C:\\workspace\\drawing-checker\\venv-win\\Scripts\\python.exe ^
        scripts\\build_viewer_crops.py --data-root C:\\workspace\\tolstack\\data

``fitz`` is imported lazily so the resolution rules above stay unit-testable
under this repo's own stdlib-only venv.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent

SCHEMA_CROPS = "joby.tolerance_stack/viewer_crops/v0"

DEFAULT_DC_ROOT = Path(r"C:\workspace\drawing-checker")
STACKS_DIR = Path("docs") / "tolerance_stacks"
PROJECTION_SUBDIR = Path("projections") / "viewer"

# A printed zone label sits within this many points of a page edge. Same
# constant, and the same reading, as drawing-checker's pipeline/native_zones.py
# -- reproduced rather than imported: tolstack's dependency on drawing-checker is
# read-only DATA, and importing its pipeline would make it a code dependency.
MARGIN_PT = 45.0

_COL_RE = re.compile(r"^\d{1,2}$")
_ROW_RE = re.compile(r"^[A-Z]$")
_RUN_ID_RE = re.compile(r"\b(\d{8}_\d{6})\b")
# A needle worth searching for: a part number, a dimension, a dash number --
# anything with a digit in it and no interior whitespace.
_NEEDLE_RE = re.compile(r"[^\s,;()]*\d[^\s,;()]*")

# Kinds that name no page of any document, so no crop can exist for them.
NO_DOCUMENT_KINDS = {
    "workbook": "the source is a spreadsheet, not a drawing or spec PDF",
    "assumed": "the value is assumed -- there is no source document to crop",
    "pipeline_element": "the source is an extracted pipeline element, not a page",
}


# ---------------------------------------------------------------------------
# resolution: citation -> a real PDF on disk
# ---------------------------------------------------------------------------


class Unresolvable(Exception):
    """A citation that cannot be pinned to a page without guessing."""


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run_dirs(dc_root: Path) -> List[Path]:
    runs = dc_root / "data" / "runs"
    return sorted(p for p in runs.iterdir() if p.is_dir()) if runs.is_dir() else []


def pdf_from_run(dc_root: Path, run_id: str) -> Tuple[Path, Path, Optional[bool]]:
    """``(pdf_path, run_dir, sha_verified)`` for the export a run consumed.

    The run directory holds page PNGs and ``run_meta.json``, never the PDF
    itself; ``run_meta.json`` names the input and its sha256, and the file lives
    in drawing-checker's inbox (or its test fixtures). The sha is checked so a
    re-dropped file with the same name can never be silently cropped in place of
    the export the stack actually cited.
    """
    matches = [d for d in run_dirs(dc_root) if d.name.startswith(run_id)]
    if not matches:
        raise Unresolvable(f"no drawing-checker run directory starting {run_id!r}")
    run_dir = matches[0]
    meta_path = run_dir / "run_meta.json"
    if not meta_path.exists():
        raise Unresolvable(f"run {run_dir.name} has no run_meta.json")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    inputs = meta.get("inputs") or []
    if not inputs:
        raise Unresolvable(f"run {run_dir.name} records no inputs")
    name = inputs[0].get("name")
    want_sha = inputs[0].get("sha256")

    for candidate in (
        dc_root / "data" / "inbox" / "drawings" / name,
        dc_root / "tests" / "fixtures" / "drawings" / name,
    ):
        if candidate.exists():
            got = sha256_of(candidate)
            if want_sha and got != want_sha:
                raise Unresolvable(
                    f"{candidate.name} does not match the sha256 run "
                    f"{run_dir.name} recorded -- the file on disk is not the "
                    f"export this stack cites"
                )
            return candidate, run_dir, bool(want_sha)
    raise Unresolvable(f"run {run_dir.name} cites {name!r}, which is not on disk")


def pdf_paths_in(text: str) -> Optional[str]:
    """The ``.pdf`` path a ``sources_used`` entry **starts with**, else ``None``.

    Deliberately anchored at the start: these entries are written
    ``<path> -- <what was read>``, and a rule that hunts for a path anywhere in
    free prose is a rule that eventually finds the wrong one.
    """
    lowered = text.lower()
    idx = lowered.find(".pdf")
    if idx == -1:
        return None
    return text[: idx + 4].strip()


def pdf_from_sources_used(
    sources_used: Sequence[str], document: str, roots: Sequence[Path]
) -> Path:
    """The one cited PDF naming ``document``; ambiguity is unresolvable."""
    hits = []
    for entry in sources_used or []:
        if document not in entry:
            continue
        raw = pdf_paths_in(entry)
        if not raw:
            continue
        path = Path(raw)
        if not path.is_absolute():
            for root in roots:
                if (root / raw).exists():
                    path = root / raw
                    break
        hits.append(path)
    if not hits:
        raise Unresolvable(
            f"citation names no export, and provenance.sources_used names no "
            f"PDF for {document!r}"
        )
    if len({str(p) for p in hits}) > 1:
        raise Unresolvable(
            f"provenance.sources_used names {len(hits)} different PDFs for "
            f"{document!r} -- ambiguous, refusing to pick one"
        )
    path = hits[0]
    if not path.exists():
        raise Unresolvable(f"provenance.sources_used cites {path}, which is not on disk")
    return path


def resolve_pdf(
    raw_stack: Dict[str, Any],
    source_ref: Dict[str, Any],
    specs_dir: Path,
    dc_root: Path,
    rel_roots: Sequence[Path],
) -> Dict[str, Any]:
    """Pin one ``source_ref`` to a PDF, or raise :class:`Unresolvable`.

    ``rel_roots`` are the roots a repo-relative path in ``sources_used`` is
    tried against, most-likely first.
    """
    kind = source_ref.get("kind")
    document = source_ref.get("document")
    if not document:
        raise Unresolvable("source_ref names no document")
    if kind in NO_DOCUMENT_KINDS:
        raise Unresolvable(NO_DOCUMENT_KINDS[kind])

    if kind == "spec":
        path = specs_dir / document
        if not path.exists():
            raise Unresolvable(f"{document!r} is not in data/inbox/specs/")
        return {"pdf": path, "resolved_by": "spec_pile", "run_dir": None,
                "run_id": None, "sha256_verified": None}

    joint = raw_stack.get("joint") or {}
    export = joint.get("assembly_export")
    if export and str(document) == str(joint.get("assembly_drawing")):
        if not (dc_root / "data").is_dir():
            raise Unresolvable(f"drawing-checker data root absent at {dc_root / 'data'}")
        run_ids = _RUN_ID_RE.findall(export)
        if not run_ids:
            raise Unresolvable(
                "joint.assembly_export names no drawing-checker run id"
            )
        errors = []
        for run_id in run_ids:
            try:
                pdf, run_dir, verified = pdf_from_run(dc_root, run_id)
            except Unresolvable as err:
                errors.append(str(err))
                continue
            return {"pdf": pdf, "resolved_by": "joint_export_run",
                    "run_dir": run_dir.name, "run_id": run_id,
                    "sha256_verified": verified}
        raise Unresolvable("; ".join(errors))

    # No export pinned by the joint block. One structured fallback, then stop.
    provenance = raw_stack.get("provenance") or {}
    path = pdf_from_sources_used(
        provenance.get("sources_used") or [], str(document), rel_roots
    )
    return {"pdf": path, "resolved_by": "provenance.sources_used", "run_dir": None,
            "run_id": None, "sha256_verified": None}


def page_number(source_ref: Dict[str, Any]) -> int:
    sheet = source_ref.get("sheet")
    if isinstance(sheet, bool) or sheet is None:
        raise Unresolvable("source_ref names no sheet")
    if isinstance(sheet, int):
        return sheet
    text = str(sheet).strip()
    if not text.isdigit():
        raise Unresolvable(f"sheet {text!r} is not a page number")
    return int(text)


# ---------------------------------------------------------------------------
# geometry: printed zone grid -> a rect
# ---------------------------------------------------------------------------


def page_native_grid(page) -> Tuple[Dict[int, float], Dict[str, float]]:
    """``(col_centers {number: x}, row_centers {letter: y})`` from the border."""
    cols: Dict[int, List[float]] = {}
    rows: Dict[str, List[float]] = {}
    pr = page.rect
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        near_x_edge = (cx - pr.x0 < MARGIN_PT) or (pr.x1 - cx < MARGIN_PT)
        near_y_edge = (cy - pr.y0 < MARGIN_PT) or (pr.y1 - cy < MARGIN_PT)
        if _COL_RE.match(word) and near_y_edge:
            cols.setdefault(int(word), []).append(cx)
        elif _ROW_RE.match(word) and near_x_edge:
            rows.setdefault(word, []).append(cy)
    return ({k: sum(v) / len(v) for k, v in cols.items()},
            {k: sum(v) / len(v) for k, v in rows.items()})


def median_spacing(centers: Sequence[float]) -> Optional[float]:
    ordered = sorted(centers)
    gaps = sorted(b - a for a, b in zip(ordered, ordered[1:]))
    if not gaps:
        return None
    mid = len(gaps) // 2
    return gaps[mid] if len(gaps) % 2 else (gaps[mid - 1] + gaps[mid]) / 2.0


def zone_cell(
    cols: Dict[int, float], rows: Dict[str, float], zone: str
) -> Optional[Tuple[float, float, float, float]]:
    """The unpadded rect of printed zone ``zone`` (e.g. ``"H3"``), or ``None``.

    Cell size is the *median* spacing of the read labels, so one mis-read tick
    widens nothing.
    """
    match = re.fullmatch(r"([A-Z])\s*(\d{1,2})", (zone or "").strip().upper())
    if not match:
        return None
    letter, number = match.group(1), int(match.group(2))
    if letter not in rows or number not in cols:
        return None
    width = median_spacing(list(cols.values()))
    height = median_spacing(list(rows.values()))
    if not width or not height:
        return None
    cx, cy = cols[number], rows[letter]
    return (cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2)


def pad_rect(
    rect: Tuple[float, float, float, float], dx: float, dy: float
) -> Tuple[float, float, float, float]:
    return (rect[0] - dx, rect[1] - dy, rect[2] + dx, rect[3] + dy)


def callout_needles(source_ref: Dict[str, Any], hardware_ref: Optional[str]) -> List[str]:
    """Search strings a page's text layer might carry for this citation.

    Only callout-derived text and the part number -- deliberately **not** the
    view name. A view caption ("DETAIL B") sits wherever the caption sits, which
    is not where the dimension is, so matching it would corroborate nothing.
    """
    needles: List[str] = []
    callout = source_ref.get("callout")
    if callout:
        head = re.split(r"\s{2,}", str(callout).strip())[0].strip()
        if head and head != str(callout).strip():
            needles.append(head)
        needles.append(str(callout).strip())
        needles.extend(_NEEDLE_RE.findall(str(callout)))
    if hardware_ref:
        needles.append(str(hardware_ref))
    # Longest first: a specific match beats a bare dimension that repeats.
    seen, ordered = set(), []
    for needle in sorted((n for n in needles if len(n) >= 3), key=len, reverse=True):
        if needle not in seen:
            seen.add(needle)
            ordered.append(needle)
    return ordered


def center_in(rect: Sequence[float], hit: Sequence[float]) -> bool:
    cx, cy = (hit[0] + hit[2]) / 2, (hit[1] + hit[3]) / 2
    return rect[0] <= cx <= rect[2] and rect[1] <= cy <= rect[3]


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------


def locate(page, source_ref: Dict[str, Any], hardware_ref: Optional[str],
           zone_pad: float, text_pad: float) -> Dict[str, Any]:
    """Decide the crop rect on ``page``. Never raises -- worst case is the sheet."""
    cols, rows = page_native_grid(page)
    needles = callout_needles(source_ref, hardware_ref)
    cited_zone = source_ref.get("zone")
    grid_read = bool(cols and rows)

    cell = zone_cell(cols, rows, str(cited_zone)) if (cited_zone and grid_read) else None
    if cell:
        width, height = cell[2] - cell[0], cell[3] - cell[1]
        found, matched = False, None
        for needle in needles:
            if any(center_in(cell, hit) for hit in page.search_for(needle)):
                found, matched = True, needle
                break
        return {
            "rect": pad_rect(cell, width * zone_pad, height * zone_pad),
            "located_by": "zone_cell",
            "needle": matched,
            "cited_zone": cited_zone,
            "zone_grid": "read",
            "callout_text_in_zone": found,
            "note": f"printed zone {cited_zone} padded by {zone_pad:g} cell(s)",
        }

    for needle in needles:
        hits = page.search_for(needle)
        if len(hits) == 1:
            return {
                "rect": pad_rect(tuple(hits[0]), text_pad, text_pad),
                "located_by": "callout_text",
                "needle": needle,
                "cited_zone": cited_zone,
                "zone_grid": "read" if grid_read else "unreadable",
                "callout_text_in_zone": None,
                "note": f"located by the unique match for {needle!r}",
            }

    if not page.get_text("text").strip():
        why = "this sheet has no text layer, so the callout cannot be located"
    elif cited_zone:
        why = f"zone {cited_zone} cited but this sheet's printed border grid is not legible"
    else:
        why = "no zone cited and the callout text matches zero or many places"
    return {
        "rect": tuple(page.rect),
        "located_by": "sheet_full",
        "needle": None,
        "cited_zone": cited_zone,
        "zone_grid": "read" if grid_read else "unreadable",
        "callout_text_in_zone": None,
        "note": "whole sheet -- " + why,
    }


def render(page, rect, out_path: Path, zoom: float, max_px: int) -> Tuple[int, int]:
    import fitz

    clip = fitz.Rect(*rect) & page.rect
    longest = max(clip.width, clip.height) or 1.0
    zoom = min(zoom, max_px / longest)
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(out_path))
    return pix.width, pix.height


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data-root", default=str(REPO_ROOT / "data"),
                    help="repo data/ dir (MAIN checkout's, if you are in a worktree)")
    ap.add_argument("--stacks-dir", default=str(REPO_ROOT / STACKS_DIR))
    ap.add_argument("--drawing-checker-root", default=str(DEFAULT_DC_ROOT))
    ap.add_argument("--zoom", type=float, default=3.0, help="render scale for located crops")
    ap.add_argument("--zone-pad", type=float, default=1.0,
                    help="cells of context around a cited zone")
    ap.add_argument("--text-pad", type=float, default=200.0,
                    help="points of context around a located callout")
    ap.add_argument("--max-px", type=int, default=2400,
                    help="cap on a crop's longest side")
    args = ap.parse_args(argv)

    try:
        import fitz  # noqa: F401
    except ImportError:
        print(
            "PyMuPDF (fitz) is not installed in this interpreter. It is "
            "deliberately absent from requirements.txt -- run this script with "
            "drawing-checker's venv:\n"
            r"  C:\workspace\drawing-checker\venv-win\Scripts\python.exe "
            r"scripts\build_viewer_crops.py --data-root C:\workspace\tolstack\data",
            file=sys.stderr,
        )
        return 2

    stacks_dir = Path(args.stacks_dir)
    data_root = Path(args.data_root)
    dc_root = Path(args.drawing_checker_root)
    specs_dir = data_root / "inbox" / "specs"
    out_dir = data_root / PROJECTION_SUBDIR
    crops_dir = out_dir / "crops"

    dc_available = (dc_root / "data").is_dir()
    if not dc_available:
        print(
            f"SKIP (drawing-checker): no data root at {dc_root / 'data'} -- "
            "drawing and parts-list citations will be reported unresolvable; "
            "spec-pile citations still render.",
            file=sys.stderr,
        )

    # Wipe-and-rebuild, this script's files only.
    if crops_dir.exists():
        shutil.rmtree(crops_dir)
    crops_dir.mkdir(parents=True, exist_ok=True)

    by_stack: Dict[str, Dict[str, Any]] = {}
    unresolved: List[Dict[str, str]] = []
    resolved_count = 0
    open_docs: Dict[str, Any] = {}
    # Roots a repo-relative path in provenance.sources_used is tried against.
    # data_root.parent first: `data/inbox/specs/x.pdf` means the MAIN checkout's
    # data/, which is not this worktree's.
    rel_roots = [data_root.parent, REPO_ROOT, dc_root]

    for path in sorted(stacks_dir.glob("stack_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        stack_id = raw["id"]
        by_stack[stack_id] = {}
        for element in raw.get("elements", []):
            entry = crop_element(
                raw, element, specs_dir, dc_root, rel_roots,
                crops_dir, open_docs, args,
            )
            by_stack[stack_id][element["id"]] = entry
            if entry["status"] == "resolved":
                resolved_count += 1
            else:
                unresolved.append({
                    "stack": stack_id,
                    "element": element["id"],
                    "kind": ((element.get("source_ref") or {}).get("kind")),
                    "document": ((element.get("source_ref") or {}).get("document")),
                    "reason": entry["reason"],
                })

    index = {
        "schema": SCHEMA_CROPS,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "built_by": "scripts/build_viewer_crops.py",
        "drawing_checker_root": dc_root.as_posix(),
        "drawing_checker_available": dc_available,
        "crops_dir": "crops",
        "summary": {"resolved": resolved_count, "unresolvable": len(unresolved)},
        "by_stack": by_stack,
        "unresolved": unresolved,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "crops.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"wrote {out_dir / 'crops.json'}")
    print(f"  {resolved_count} crop(s) rendered into {crops_dir}")
    print(f"  {len(unresolved)} citation(s) unresolvable:")
    for row in unresolved:
        print(f"    {row['stack']}:{row['element']:28s} {row['reason']}")
    return 0


def crop_element(raw, element, specs_dir, dc_root, rel_roots, crops_dir,
                 open_docs, args) -> Dict[str, Any]:
    """One element -> a locator entry (rendering its PNG on the way, if it resolves)."""
    import fitz

    source_ref = element.get("source_ref")
    if not source_ref:
        return {"status": "unresolvable", "reason": "element carries no source_ref",
                "png": None}
    try:
        resolved = resolve_pdf(raw, source_ref, specs_dir, dc_root, rel_roots)
        page_no = page_number(source_ref)
        pdf = resolved["pdf"]
        doc = open_docs.get(str(pdf))
        if doc is None:
            doc = open_docs[str(pdf)] = fitz.open(str(pdf))
        if not 1 <= page_no <= doc.page_count:
            raise Unresolvable(
                f"{pdf.name} has {doc.page_count} page(s); the citation names "
                f"sheet {page_no}"
            )
        page = doc[page_no - 1]
        placement = locate(page, source_ref, element.get("hardware_ref"),
                           args.zone_pad, args.text_pad)
        name = f"{raw['id']}__{element['id']}.png"
        width, height = render(page, placement["rect"], crops_dir / name,
                               args.zoom, args.max_px)
    except Unresolvable as err:
        return {"status": "unresolvable", "reason": str(err), "png": None}

    entry = {
        "status": "resolved",
        "reason": None,
        "png": f"crops/{name}",
        "width": width,
        "height": height,
        "pdf": pdf.as_posix(),
        "pdf_name": pdf.name,
        "page": page_no,
        "resolved_by": resolved["resolved_by"],
        "run_dir": resolved["run_dir"],
        "run_id": resolved["run_id"],
        "sha256_verified": resolved["sha256_verified"],
    }
    entry.update({k: v for k, v in placement.items() if k != "rect"})
    entry["rect_pt"] = [round(v, 2) for v in placement["rect"]]
    return entry


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
