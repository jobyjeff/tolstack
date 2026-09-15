"""Record one declared crop region for a spec-pile document.

The verb behind ``docs/spec_library/crop_regions.json``. Read a value off a pile
document, and while the page render is still open, record **where on it you
read** -- so the next reader of that citation sees the row rather than the sheet
(``tolerance_stack/spec_crop_regions.py`` explains the registry and the matching
rules; this script is how an entry gets into it).

The registry is config, not derived state, so it is tracked and reviewed -- but
it is not hand-edited. Everything this script refuses is something a hand-edit
would have shipped:

* a ``--document`` that is not in ``data/inbox/specs/`` (the pile is the MAIN
  checkout's: from a worktree, pass ``--data-root C:\\workspace\\tolstack\\data``);
* a ``--registry`` path that does not exist, or a registry file that does not
  parse -- you cannot append to a registry you cannot read;
* a ``--page`` the document does not have;
* a ``--rect`` that is empty, inverted, or hangs off the page;
* a label already recorded for that document and page, or a ``--match`` string
  another region on the same page already answers to -- which would make both
  regions permanently ambiguous, and an ambiguous region is a region that never
  crops anything.

Run ``--preview`` before you commit the entry: it renders exactly the rect you
are recording, so "the dash-13 row" is a thing you looked at rather than a thing
you believe.

Needs **PyMuPDF** (``fitz``) for the page size and the preview -- deliberately
absent from this repo's ``requirements.txt``, exactly like
``scripts/build_viewer_crops.py``, so run it from drawing-checker's venv::

    C:\\workspace\\drawing-checker\\venv-win\\Scripts\\python.exe scripts/record_spec_crop_region.py --help
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Callable, List, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from tolerance_stack import spec_crop_regions as scr  # noqa: E402

PageRectFn = Callable[[Path, int], Tuple[int, Tuple[float, float, float, float]]]

FITZ_HINT = (
    "PyMuPDF (fitz) is not installed in this interpreter. It is deliberately "
    "absent from requirements.txt -- run this script with drawing-checker's "
    "venv:\n"
    r"  C:\workspace\drawing-checker\venv-win\Scripts\python.exe "
    r"scripts\record_spec_crop_region.py ..."
)


class Refused(Exception):
    """Input this script will not record. The message is the whole report."""


def page_geometry(pdf: Path, page: int) -> Tuple[int, Tuple[float, float, float, float]]:
    """``(page_count, page_rect)`` -- the two facts a rect is validated against."""
    import fitz

    doc = fitz.open(str(pdf))
    count = doc.page_count
    if not 1 <= page <= count:
        return count, (0.0, 0.0, 0.0, 0.0)
    rect = doc[page - 1].rect
    return count, (rect.x0, rect.y0, rect.x1, rect.y1)


def render_preview(pdf: Path, page: int, rect: Sequence[float], out: Path,
                   zoom: float) -> Tuple[int, int]:
    import fitz

    doc = fitz.open(str(pdf))
    target = doc[page - 1]
    clip = fitz.Rect(*rect) & target.rect
    pix = target.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip)
    out.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(out))
    return pix.width, pix.height


def check_rect(rect: Sequence[float], page_rect: Sequence[float]) -> None:
    """The rect is on the page. :class:`~tolerance_stack.spec_crop_regions.CropRegion`
    owns the ordered/non-empty half; this is the half that needs the document."""
    x0, y0, x1, y1 = rect
    px0, py0, px1, py1 = page_rect
    if x0 < px0 - 0.5 or y0 < py0 - 0.5 or x1 > px1 + 0.5 or y1 > py1 + 0.5:
        raise Refused(
            f"rect {list(rect)} is not on the page: sheet measures "
            f"{px0:g} {py0:g} {px1:g} {py1:g} in points, origin top-left"
        )


def main(argv: Optional[List[str]] = None,
         page_geometry_fn: Optional[PageRectFn] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--document", required=True,
                    help="the pile filename, e.g. 'NAS6403-NAS6420 Rev 4.pdf'")
    ap.add_argument("--page", required=True, type=int, help="sheet number, 1-based")
    ap.add_argument("--rect", required=True, type=float, nargs=4,
                    metavar=("X0", "Y0", "X1", "Y1"),
                    help="the region in PDF points, origin top-left")
    ap.add_argument("--label", required=True,
                    help="what a reader should call this region, e.g. \"NAS6403U11D row\"")
    ap.add_argument("--shows", required=True,
                    help="what is inside the rect -- the entry's evidence, in words")
    ap.add_argument("--match", action="append", default=None, metavar="TEXT",
                    help="citation text this region answers to (repeatable). "
                         "Defaults to the label.")
    ap.add_argument("--recorded", required=True, metavar="YYYY-MM-DD",
                    help="the date you looked at the page")
    ap.add_argument("--recorded-by", required=True,
                    help="who/what recorded it, e.g. 'handoff spec_crop_region_registry'")
    ap.add_argument("--data-root", default=str(REPO_ROOT / "data"),
                    help="repo data/ dir (the MAIN checkout's, if you are in a worktree)")
    ap.add_argument("--registry", default=str(REPO_ROOT / scr.REGISTRY_RELPATH))
    ap.add_argument("--preview", default=None, metavar="PNG",
                    help="render the rect here before recording it -- look at it")
    ap.add_argument("--preview-zoom", type=float, default=6.0)
    ap.add_argument("--dry-run", action="store_true",
                    help="validate (and preview) without writing the registry")
    args = ap.parse_args(argv)

    registry_path = Path(args.registry)
    specs_dir = Path(args.data_root) / "inbox" / "specs"
    pdf = specs_dir / args.document

    try:
        # Named before it is opened. A missing file raises FileNotFoundError,
        # which is not one of the two this block catches, so it used to escape as
        # a traceback -- the one rough edge in a verb whose whole selling point
        # is that it refuses cleanly, and on the flag (`--registry`) a worktree
        # session is most likely to re-spell by hand.
        # ISSUE_20260914_record_spec_crop_region_tracebacks_on_a_missing_registry.
        if not registry_path.exists():
            raise Refused(
                f"no crop-region registry at {registry_path} -- the tracked one "
                f"is at {scr.REGISTRY_RELPATH.as_posix()}, relative to the repo "
                f"root; check --registry"
            )
        registry = scr.load(registry_path)
        if not pdf.exists():
            raise Refused(
                f"{args.document!r} is not in {specs_dir} -- the spec pile lives "
                f"in the MAIN checkout, so from a worktree pass --data-root "
                f"C:\\workspace\\tolstack\\data"
            )

        geometry = page_geometry_fn or page_geometry
        try:
            page_count, page_rect = geometry(pdf, args.page)
        except ImportError:
            print(FITZ_HINT, file=sys.stderr)
            return 2
        if not 1 <= args.page <= page_count:
            raise Refused(
                f"{args.document} has {page_count} sheet(s); you named sheet {args.page}"
            )
        check_rect(args.rect, page_rect)

        region = scr.CropRegion(
            document=args.document,
            page=args.page,
            label=args.label,
            rect=tuple(args.rect),  # type: ignore[arg-type]
            match=tuple(args.match) if args.match else (args.label,),
            shows=args.shows,
            recorded=args.recorded,
            recorded_by=args.recorded_by,
        )
        # `append` re-runs the whole registry's invariants, so a duplicate label
        # or a colliding match string is refused here rather than discovered by
        # a crop that quietly stopped resolving.
        grown = scr.append(registry, region)
    except (scr.RegistryError, Refused, json.JSONDecodeError) as refusal:
        print(f"refused: {refusal}", file=sys.stderr)
        return 2

    if args.preview:
        try:
            width, height = render_preview(pdf, args.page, args.rect,
                                           Path(args.preview), args.preview_zoom)
        except ImportError:
            print(FITZ_HINT, file=sys.stderr)
            return 2
        print(f"preview: {args.preview} ({width}x{height}px) -- look at it before "
              f"you commit the entry")

    if args.dry_run:
        print("dry run: nothing written")
        return 0

    registry_path.write_text(scr.dumps(grown), encoding="utf-8")
    print(f"recorded {region.label!r} on {region.document} sheet {region.page} "
          f"-> {registry_path}")
    print(f"  {len(grown.regions)} region(s) now declared")
    print("  rebuild the crops to see it: "
          r"C:\workspace\drawing-checker\venv-win\Scripts\python.exe "
          r"scripts\build_viewer_crops.py --data-root C:\workspace\tolstack\data")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
