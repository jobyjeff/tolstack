"""Render drawing crops for the viewer's hover popovers, plus a locator index.

The viewer is a static page: it cannot roam the filesystem, cannot open a PDF,
and cannot reach into ``C:\\workspace\\drawing-checker``. So the hovers read
**pre-rendered crops** produced here -- one PNG per stack element whose
``source_ref`` resolves to a real page of a real PDF, plus
``crops.json`` saying, for every element, either where its crop is or *exactly
why there isn't one*.

**Never guess.** A crop is only rendered when the citation pins a document this
script can name without inference:

1. ``source_ref.export`` -- the structured per-citation export (``SourceExport``
   in ``tolerance_stack/stack.py``). ``status: "established"`` names the ``pdf``
   and its ``sha256``, and the sha is **mandatory and always verified**: a
   filename alone is not an export, because filenames get re-exported over.
   ``status: "unestablished"`` is a first-class answer and short-circuits to
   unresolvable with the recorded ``why`` -- once a citation says its export
   cannot be established, resolving it by a weaker rule would contradict the
   stack.
2. ``kind: "spec"`` -- ``document`` is a filename in ``data/inbox/specs/``. No
   sha (the pile is append-only, so a filename is bytes), so this rule reports
   ``sha256_verified: null`` and the summary counts it as unverified.
3. ``kind: "drawing" | "parts_list"`` whose ``document`` equals the stack's
   ``joint.assembly_drawing`` -- resolved through the legacy free-text
   ``joint.assembly_export``, which names the drawing-checker run; the run's
   ``run_meta.json`` names the input PDF and its sha256, and the sha is verified
   before cropping. Superseded by rule 1 and kept only so a stack written before
   2026-08-06 still resolves.

Everything else is recorded as unresolvable with the reason. **There is no prose
fallback.** Scanning ``provenance.sources_used`` for a ``.pdf`` path used to be
rule 3 and was removed 2026-08-06 (handoff ``citation_export_provenance``):
regexing a path out of a free-text sentence resolved exactly one crop, could not
sha-verify it, and landed on a copy of the drawing under drawing-checker's
``tests/fixtures/`` rather than the export the stack meant. A structured field
that says which bytes were read replaces it, and the removal is deliberate -- a
resolved count that rises because a rule got looser is a regression, not
progress.

The reason list is the point as much as the crops are: zone citations expire
between exports (the pitch_link lesson's edit 11 -- DETAIL B moved I6 -> H3
between two exports of the same revision), and a citation that names no export
cannot be crop-resolved at all. Both show up in the report, broken down by which
rule resolved each crop and whether its sha256 was verified.

A topology's **inline** edges (``docs/topologies/*.json``) get the same
treatment, added by handoff ``inline_edge_crops`` (2026-09-08): the same
:func:`resolve_pdf`, the same sha-verification, the same honest-unresolvable
discipline -- a workbook or ``assumed`` inline dimension is legitimately
uncroppable and lands in the report with a reason, never as an error, exactly
like a spreadsheet-sourced stack element does. It is a **separate** index --
``by_topology``/``unresolved_topology``, keyed by ``{topology, edge}`` rather
than ``{stack, element}`` -- because a topology's own id can equal a stack's
(``vpa_output_to_pitch_plate`` names both today), and merging the two spaces
would let an edge id collide with that stack's own element ids. The existing
``by_stack``/``unresolved``/``summary`` stay exactly as they were: a
``dimension_ref`` edge already re-expresses a committed stack element and
resolves through that space unchanged (``scripts/build_topology_projection.py``'s
``crop_key``), and nothing about the stack scan below reads from or writes to
a topology document at all.

Where the crop is taken (in order; :func:`locate` is the one place the order is
written, and says at each step why it sits where it does):

* **the item's own balloon**, when the citation names a part the run's
  ``*_balloons.json`` places on the cited sheet (:func:`balloon_answer`). This
  beats the cited zone deliberately: a parts-list citation's zone is the zone of
  the view's *caption*, which is not where the item is -- the bushing's crop
  showed DETAIL B with balloon 34, the one the citation is about, off the top
  edge -- and a caption's printed zone is not even stable between exports of one
  revision (the pitch_link worksheet's finding F4). Such a crop also carries a
  second image, the parts-list row for that item
  (:func:`parts_list_companion`), because a balloon on its own is a number in a
  circle.
* **the cited zone**, if ``zone`` is set and the sheet's printed border grid is
  legible: the cited cell padded by ``--zone-pad`` cells. The citation is a zone
  citation, so the zone is what gets shown. The locator also records whether the
  callout's own text was found *inside* that cell -- corroboration, not a
  requirement (a parts-list nomenclature is cited at the balloon, and lives on
  the parts-list sheet). When it *was* found, the rect is widened to whatever
  the callout's leader reaches (:func:`attachment_rect`), so a dimension is
  shown on the feature it dimensions rather than floating in space.
* **a declared crop region**, when the resolved PDF lives in
  ``data/inbox/specs/`` and ``docs/spec_library/crop_regions.json`` declares a
  region for the cited sheet that this citation matches. A pile citation names a
  document and a sheet and nothing finer, so before this rule existed a fastener
  card showed a whole photocopy of a sixty-four-row table; the registry is where
  a human says which rect the row is. Declared configuration, never a search:
  ``tolerance_stack/spec_crop_regions.py`` owns the matching rules, and the rule
  applies whichever rule above named the document, because the region is a fact
  about the *bytes in the pile* rather than about how the citation reached them.
  Where that sheet also declares a **page context**, the context is the crop and
  the region becomes a highlight box inside it: a row band alone was "just four
  numbers with no context for what they mean" (Jeff, 2026-09-15), because it
  carries neither the column headers nor the figure the columns refer to.
* **the callout text**, if none of the above and a needle derived from the
  callout matches exactly once on the page -- widened along its leader, same as
  a corroborated zone.
* **the sheet's declared page context**, when the page has one and nothing above
  placed the crop: coarse, so it loses to a unique text match, but it is a rect
  a human recorded and it beats the whole sheet. Nothing is highlighted, which
  is the honest answer -- no region matched, and which row was meant is not
  declared.
* **the whole sheet** otherwise, with the reason recorded (a scanned standard
  with no text layer, which is what ``NAS6403-NAS6420 Rev 4.pdf`` is, lands
  here -- and for a pile document the reason also says why no declared region
  applied, because "record one" is the action that fixes it).

Every entry also carries the **boxes worth drawing over the crop**
(``highlights``), each as a rect in points *and* as fractions of the crop, so
the viewer can position an overlay without knowing what scale the PNG was
rendered at. Their two-word vocabulary is :data:`HIGHLIGHT_KINDS` and it is the
whole visual distinction the viewer draws: a box round something **found** on
the page is solid, a box round a rect somebody merely **declared** -- a
registry region, or a cited zone the callout text was not in -- is dashed. That
keeps "the crop is the citation, not a match" a property of the picture rather
than of a sentence beside it.

Output (wipe-and-rebuild; owns only its own files, ``results.json`` is
``build_viewer_projection.py``'s)::

    <data-root>/projections/viewer/crops.json
    <data-root>/projections/viewer/crops/*.png

That directory is **shared by every live worktree**, so this script stamps which
tree it built from and **refuses** to overwrite a crop index built from a tree
this one does not contain -- ``scripts/projection_provenance.py`` holds both, and
``--allow-older-tree`` overrides the refusal. The check runs before the
``rmtree`` below: a refusal that had already wiped ``crops/`` would have
destroyed what it was protecting.

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
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
# The repo root, so `tolerance_stack` imports the same way it does from
# `build_topology_projection.py`; then this script's own directory, so
# `projection_provenance` imports whether we were started as a script
# (sys.path[0] is scripts/ already) or imported by a test.
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import projection_provenance as prov  # noqa: E402
from tolerance_stack import spec_crop_regions as scr  # noqa: E402

SCHEMA_CROPS = "joby.tolerance_stack/viewer_crops/v0"
BUILT_BY = "scripts/build_viewer_crops.py"

DEFAULT_DC_ROOT = Path(r"C:\workspace\drawing-checker")
STACKS_DIR = Path("docs") / "tolerance_stacks"
TOPOLOGIES_DIR = Path("docs") / "topologies"
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

#: What a highlight box drawn over a crop CLAIMS -- the whole vocabulary, and
#: there are exactly two words because there are exactly two claims a box on one
#: of these images can make. ``verified_match``: the citation's own text, or the
#: balloon carrying its find number, was **found** at this rect on this page.
#: ``declared_region``: a human recorded this rect, or the citation named this
#: printed zone, and nothing on the page corroborated it. The viewer draws the
#: first solid and the second dashed -- the same distinction
#: ``callout_text_in_zone`` has always reported in words ("the crop is the
#: citation, not a match"), now carried by the picture, which is the surface a
#: reader actually looks at. A field vocabulary is a module-level constant in
#: this repo, never an inline literal: ``docs/prompts/REVIEW_AGENT.md``,
#: "Documented vocabularies drifting from the seeded data".
HIGHLIGHT_KINDS: Tuple[str, ...] = ("verified_match", "declared_region")

#: What a second image beside a crop IS. One role today: the parts-list row for
#: the cited item, so a balloon crop can show the part number and nomenclature
#: the balloon stands for without the reader opening the drawing.
COMPANION_ROLES: Tuple[str, ...] = ("parts_list_row",)

# --- the attachment walk (see attachment_rect) ------------------------------
# A callout's leader starts a little away from the end of its text, so "touching
# the text" has to mean "within this many points of it".
LEADER_GAP_PT = 24.0
# How much room the feature a leader lands on gets around it. A crop that ends
# exactly at the arrowhead shows the arrow and not what it points at.
ATTACHMENT_PAD_PT = 60.0
# A path bigger than this in either direction is scenery -- a view outline, the
# drawing frame -- and is not followed. Without it one connected edge could walk
# the crop out to the whole sheet.
ATTACHMENT_MAX_PATH_PT = 400.0
# How close to a leader's end a path has to be to count as what it lands on.
ATTACHMENT_TIP_PT = 6.0

# --- the parts-list row companion (see parts_list_row_rect) -----------------
# Rows of context kept above and below the cited row, so the crop reads as a
# parts list rather than as one floating line of text.
PARTS_LIST_CONTEXT_PT = 34.0
# The printed column header that delimits one block of the parts list. A Joby
# parts list is printed as several side-by-side blocks, each with its own header
# row, so this is what says where the cited row's block starts and ends.
PARTS_LIST_BLOCK_HEADER = "FIND"
# Trimmed off each side of a block so the neighbouring block's rule does not
# appear in the crop.
PARTS_LIST_BLOCK_INSET_PT = 3.0
#: How a citation's own callout states which parts-list ROW it means. A parts
#: list row is identified by ``(part_number, find_no)``, not by part number
#: alone -- 217755 prints ``NAS1149V0332H`` twice, as find 13 and as find 32 --
#: and every parts-list callout in this repo carries the find number in its
#: prose: ``"… (find 32, qty 9 across the assembly; balloon at SECTION T-T)"``.
#: This is the citation side of the tie ``parts_list_row_rect`` breaks on the
#: printed page, and it is a module-level constant rather than an inline
#: literal for the reason every field vocabulary here is.
CALLOUT_FIND_NO_RE = re.compile(r"\bfind\s+(\d+)\b", re.IGNORECASE)

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


def export_pdf_path(cited: str, roots: Sequence[Path], dc_root: Path) -> Path:
    """The file a ``source_ref.export.pdf`` names, wherever the caller keeps it.

    A cited path is either repo-relative (``data/inbox/drawings/x.pdf`` -- this
    repo's own data, so the MAIN checkout's, which is ``roots[0]``) or absolute
    into drawing-checker. An absolute drawing-checker path is **re-rooted** at
    ``--drawing-checker-root`` when it does not exist as written, so a stack file
    stays readable on a machine that keeps drawing-checker elsewhere. Which of
    these found the file does not matter: the caller sha256-verifies it, so a
    same-named file under the wrong root is refused, not cropped.

    A **relative** cited path is never tried against the process's cwd, only
    against ``roots``. ``data/inbox/drawings/x.pdf`` means the MAIN checkout's
    ``data/``, and resolving it relative to wherever the script happened to be
    invoked from makes the answer depend on the cwd: run from the main checkout
    it finds the real file, run from a worktree (whose ``data/`` is gitignored
    and empty) it does not. The sha check makes that fail closed rather than
    crop the wrong bytes -- but it fails with "the file on disk is not the
    export this citation was read from", which reads as a provenance alarm when
    it is really a cwd accident. Found in ``review/citation_export_provenance``
    (2026-08-06): the suite was green in the worktree and red in the main
    checkout for exactly this reason.
    """
    raw = Path(cited)
    if not raw.is_absolute():
        for root in roots:
            candidate = root / cited
            if candidate.exists():
                return candidate
    elif raw.exists():
        return raw
    else:
        parts = [p.replace("\\", "/") for p in raw.parts]
        for i, part in enumerate(parts):
            if part.strip("/").lower() == "drawing-checker":
                candidate = dc_root.joinpath(*parts[i + 1:])
                if candidate.exists():
                    return candidate
                break
    raise Unresolvable(f"export names {cited!r}, which is not on disk")


def export_run_ids(export: Dict[str, Any]) -> List[str]:
    """The run ids out of ``export.runs``, whose entries are ``{run_id, ts}``.

    Mirrors ``ExportRun.from_dict`` for the same reason the rest of this module
    mirrors ``SourceExport``: it reads raw JSON and never the dataclass. A bare
    run id is the pre-2026-08-07 shape and is refused here too -- a run named
    without its ``ts`` is a name, not an identity, and the crop would resolve
    while the read-only invariant it was supposed to let a reviewer check stayed
    uncheckable.
    """
    ids = []
    for entry in export.get("runs") or []:
        if not isinstance(entry, dict) or not entry.get("run_id"):
            raise Unresolvable(
                f"export run {entry!r} is not a {{run_id, ts}} object -- a run id "
                f"alone does not say when the run happened"
            )
        ids.append(str(entry["run_id"]))
    return ids


def pdf_from_export(
    export: Dict[str, Any], roots: Sequence[Path], dc_root: Path
) -> Dict[str, Any]:
    """Resolve a structured ``source_ref.export``; the sha256 is not optional.

    Mirrors ``SourceExport.__post_init__`` deliberately: this script reads raw
    JSON, never the dataclass, so it re-checks rather than trusting that
    something upstream did. A malformed export is unresolvable -- never a
    best-effort crop.
    """
    status = export.get("status")
    if status == "unestablished":
        for name in ("pdf", "sha256"):
            if export.get(name):
                raise Unresolvable(
                    f"export is marked unestablished but names a {name} -- "
                    f"the stack file contradicts itself"
                )
        why = export.get("why") or "no reason recorded"
        raise Unresolvable(f"the export this value was read from is unestablished: {why}")
    if status != "established":
        raise Unresolvable(f"export status {status!r} is not one of established/unestablished")

    cited, want_sha = export.get("pdf"), (export.get("sha256") or "").lower()
    if not cited:
        raise Unresolvable("export status is established but it names no pdf")
    if len(want_sha) != 64 or any(c not in "0123456789abcdef" for c in want_sha):
        raise Unresolvable(
            f"export names {cited!r} with no usable sha256 -- a filename is not "
            f"an export, because a filename gets re-exported over"
        )

    path = export_pdf_path(str(cited), roots, dc_root)
    got = sha256_of(path)
    if got != want_sha:
        raise Unresolvable(
            f"{path.name} hashes {got[:12]}..., but the export records "
            f"{want_sha[:12]}... -- the file on disk is not the export this "
            f"citation was read from"
        )
    runs = export_run_ids(export)
    run_dir = None
    if runs:
        matches = [d for d in run_dirs(dc_root) if d.name.startswith(runs[0])]
        run_dir = matches[0].name if matches else None
    return {"pdf": path, "resolved_by": "source_ref_export", "run_dir": run_dir,
            "run_id": runs[0] if runs else None, "sha256_verified": True}


def _is_named_export(export: Any) -> bool:
    """Whether ``export`` names an export at all -- rule 1's applicability,
    before any file is touched or its status is read.

    ``export`` is either the raw value read off parsed JSON (:func:`resolve_pdf`'s
    own shape, unvalidated -- a bare string or an empty ``{}`` names nothing, so a
    dict must additionally be non-empty) or a
    :class:`tolerance_stack.stack.SourceExport` dataclass instance (already
    validated by its own constructor, so any non-``None`` instance qualifies).
    This is the one place rule 1's "does an export exist" test is written --
    :func:`croppable` and :func:`resolve_pdf` below both call it, so a future
    sub-condition on rule 1 cannot be added to one and forgotten in the other.
    """
    if isinstance(export, dict):
        return bool(export)
    return export is not None


def croppable(source_ref: Any) -> bool:
    """Whether either rule 1 (``source_ref_export``) or rule 2 (``spec_pile``)
    below could ever apply to ``source_ref`` -- never rule 3
    (``joint.assembly_export``), which borrows from a STACK's own ``joint``
    block and an edge with no stack (e.g. a topology's inline dimension) has
    nothing to borrow from. This check touches no filesystem and does not mean
    "resolves": an ``unestablished`` export is still croppable in this sense
    (it *names* itself, via ``export``) and lands in ``crops.json`` as
    unresolvable with its own ``why`` -- exactly like a workbook/assumed
    citation, just for a different reason. Only :func:`resolve_pdf`, against
    the real files, decides resolved vs. unresolvable.

    Accepts either shape a caller holds a citation in: the raw dict read off
    parsed JSON (this module's own callers), or a
    :class:`tolerance_stack.stack.SourceRef` dataclass instance
    (``scripts/build_topology_projection.py``'s dataclass graph, which imports
    this function rather than keeping its own copy of the two conditions).
    """
    if not source_ref:
        return False
    if isinstance(source_ref, dict):
        return (_is_named_export(source_ref.get("export"))
                or source_ref.get("kind") == "spec")
    return _is_named_export(source_ref.export) or source_ref.kind == "spec"


def resolve_pdf(
    raw_stack: Dict[str, Any],
    source_ref: Dict[str, Any],
    specs_dir: Path,
    dc_root: Path,
    rel_roots: Sequence[Path],
) -> Dict[str, Any]:
    """Pin one ``source_ref`` to a PDF, or raise :class:`Unresolvable`.

    ``rel_roots`` are the roots a repo-relative cited path is tried against,
    most-likely first.
    """
    kind = source_ref.get("kind")
    document = source_ref.get("document")
    if not document:
        raise Unresolvable("source_ref names no document")
    if kind in NO_DOCUMENT_KINDS:
        raise Unresolvable(NO_DOCUMENT_KINDS[kind])

    # Rule 1: the citation says which export it read. Strongest, and it wins --
    # including when it says the export cannot be established. Whether this
    # rule applies at all is :func:`_is_named_export`, shared with
    # :func:`croppable`.
    export = source_ref.get("export")
    if _is_named_export(export):
        return pdf_from_export(export, rel_roots, dc_root)

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

    # Nothing left. There is deliberately no prose fallback -- see the module
    # docstring: a citation that names no export is unresolvable, and the fix is
    # to name the export, not to guess it from a sentence.
    raise Unresolvable(
        f"citation names no export -- source_ref.export is absent and no "
        f"joint.assembly_export covers {document!r}"
    )


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


def union_rect(
    a: Sequence[float], b: Sequence[float]
) -> Tuple[float, float, float, float]:
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def rects_overlap(a: Sequence[float], b: Sequence[float]) -> bool:
    return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


def rect_contains(outer: Sequence[float], inner: Sequence[float]) -> bool:
    return (outer[0] <= inner[0] and outer[1] <= inner[1]
            and outer[2] >= inner[2] and outer[3] >= inner[3])


def clamp_to(rect: Sequence[float], page_rect: Sequence[float]) -> Tuple[float, ...]:
    """``rect`` cut down to the page. The renderer intersects with the page
    anyway (``fitz.Rect(*rect) & page.rect``), so clamping here is what keeps
    the reported ``rect_pt`` -- and every highlight fraction measured against
    it -- describing the image that was actually written."""
    return (max(rect[0], page_rect[0]), max(rect[1], page_rect[1]),
            min(rect[2], page_rect[2]), min(rect[3], page_rect[3]))


def highlight(kind: str, label: Optional[str],
              rect: Sequence[float]) -> Dict[str, Any]:
    """One box to draw over a crop. ``kind`` is one of :data:`HIGHLIGHT_KINDS`."""
    if kind not in HIGHLIGHT_KINDS:
        raise ValueError(f"{kind!r} is not one of {list(HIGHLIGHT_KINDS)}")
    return {"kind": kind, "label": label,
            "rect_pt": [round(float(v), 2) for v in rect]}


def with_fracs(rect: Sequence[float],
               highlights: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Each highlight re-expressed as fractions of the crop rect it sits in.

    The viewer holds a PNG and no idea what scale it was rendered at, so a box
    in PDF points is unusable there; a fraction of the image is usable at any
    size the page happens to lay the image out at, which is the whole reason the
    overlay is drawn in the DOM rather than burnt into the pixels. Clamped to
    [0, 1]: a highlight can legitimately run off the edge of the crop (a padded
    zone cell trimmed by the page border), and a box drawn outside its frame
    would point at nothing.
    """
    width = (rect[2] - rect[0]) or 1.0
    height = (rect[3] - rect[1]) or 1.0
    out: List[Dict[str, Any]] = []
    for box in highlights:
        r = box["rect_pt"]
        frac = ((r[0] - rect[0]) / width, (r[1] - rect[1]) / height,
                (r[2] - rect[0]) / width, (r[3] - rect[1]) / height)
        out.append({**box,
                    "frac": [round(min(1.0, max(0.0, v)), 5) for v in frac]})
    return out


def path_rects(page) -> List[Tuple[float, ...]]:
    """Every vector path's bounding box on ``page``, or ``[]``.

    ``[]`` covers both "this sheet is a scan with no vector content" and "this
    page object does not expose drawings at all" -- the callers treat the two the
    same way, by keeping the rect they already had.
    """
    getter = getattr(page, "get_drawings", None)
    if getter is None:
        return []
    return [tuple(float(v) for v in path["rect"]) for path in getter()
            if path.get("rect") is not None]


def small_enough(rect: Sequence[float]) -> bool:
    """Whether a path is a feature rather than scenery -- see
    :data:`ATTACHMENT_MAX_PATH_PT`."""
    return ((rect[2] - rect[0]) <= ATTACHMENT_MAX_PATH_PT
            and (rect[3] - rect[1]) <= ATTACHMENT_MAX_PATH_PT)


def attachment_rect(page, hit: Sequence[float]) -> Optional[Tuple[float, ...]]:
    """The geometry the callout at ``hit`` points at, or ``None``.

    A dimension callout is a piece of text plus a **leader**: one line running
    from the text to the feature being dimensioned. Cropping the text's
    neighbourhood therefore shows the number and not the thing it measures --
    Jeff, 2026-09-15, on the pitch-plate lug: the crop "just shows dimensions
    floating in space, the part itself is cropped out of the view, can't tell
    what they are attached to."

    So follow the drawing's own geometry, two hops and no further:

    1. the paths within :data:`LEADER_GAP_PT` of the callout text -- its leader
       (a leader does not start flush against the last character, which is why
       the gap is not zero);
    2. the paths touching the far ends of those, within :data:`ATTACHMENT_TIP_PT`
       -- the arrowhead and the edge it lands on.

    Union, padded by :data:`ATTACHMENT_PAD_PT` so the feature has room around it.
    Two hops is a deliberate stop: a connected outline would otherwise walk the
    crop out to the whole sheet one edge at a time, and :func:`small_enough`
    refuses a path big enough to be a view outline or the frame for the same
    reason. A path that *encloses* the callout (a box drawn round the text) is
    not a leader and is skipped.

    ``None`` means nothing was found and the caller keeps its own rect -- never a
    guess at a bigger box.
    """
    paths = [rect for rect in path_rects(page) if small_enough(rect)]
    if not paths:
        return None
    reach = pad_rect(tuple(hit), LEADER_GAP_PT, LEADER_GAP_PT)
    leaders = [rect for rect in paths
               if rects_overlap(rect, reach) and not rect_contains(rect, hit)]
    if not leaders:
        return None

    grown: Tuple[float, ...] = tuple(float(v) for v in hit)
    for rect in leaders:
        grown = union_rect(grown, rect)
    near_text = pad_rect(tuple(hit), LEADER_GAP_PT / 2, LEADER_GAP_PT / 2)
    for rect in leaders:
        for x, y in ((rect[0], rect[1]), (rect[2], rect[3]),
                     (rect[0], rect[3]), (rect[2], rect[1])):
            if near_text[0] <= x <= near_text[2] and near_text[1] <= y <= near_text[3]:
                continue
            tip = (x - ATTACHMENT_TIP_PT, y - ATTACHMENT_TIP_PT,
                   x + ATTACHMENT_TIP_PT, y + ATTACHMENT_TIP_PT)
            for candidate in paths:
                if rects_overlap(candidate, tip):
                    grown = union_rect(grown, candidate)
    return pad_rect(grown, ATTACHMENT_PAD_PT, ATTACHMENT_PAD_PT)


# ---------------------------------------------------------------------------
# balloons: drawing-checker's extracted item geometry, read (never written)
# ---------------------------------------------------------------------------
#
# A location reference cited to an assembly-drawing balloon -- ``kind:
# "parts_list"``, and any drawing citation naming a part -- was cropped to the
# printed zone of its VIEW CAPTION, which is a different place from the balloon
# and, as this repo's own pitch_link worksheet records, not even stable between
# exports of one revision. The bushing's crop showed DETAIL B with balloons 32
# and 35 in it and balloon 34, the one the citation is about, off the top edge.
#
# drawing-checker already extracts what is needed and tolstack already depends
# on its runs read-only: ``<run>/<drawing>_balloons.json`` carries every
# balloon's ``item_no`` and ``bbox_pt`` per page, and the run's ``parts_list``
# rows with their ``find_no``. That is native-PDF geometry, not vision output,
# so it is the same class of fact as the printed zone grid this file already
# reads. Nothing new is rendered over there and nothing is written -- see
# ``scripts/snapshot_drawing_checker.py`` for how that claim is evidenced.


def balloons_for_run(dc_root: Path, run_dir_name: Optional[str]) -> Optional[Dict[str, Any]]:
    """A run's ``*_balloons.json``, or ``None`` when there isn't one.

    ``None`` is an ordinary answer: a part drawing carries no balloons at all
    (215197 is one), an older run predates the extractor, and a crop resolved
    from the spec pile has no run. Each keeps the placement rules it had.
    """
    if not run_dir_name:
        return None
    run = dc_root / "data" / "runs" / run_dir_name
    matches = sorted(run.glob("*_balloons.json")) if run.is_dir() else []
    if not matches:
        return None
    return json.loads(matches[0].read_text(encoding="utf-8"))


def candidate_part_numbers(source_ref: Dict[str, Any],
                           hardware_ref: Optional[str]) -> List[str]:
    """The part numbers this citation could be naming, most-authoritative first.

    The element's ``hardware_ref``, then the **first whitespace-delimited token
    of the callout** -- a parts-list callout in this repo opens with the part
    number. Both are used as-is: each is compared for *equality* against a
    parts-list row, nothing is normalised, and nothing is prefix-matched.
    ``NAS1149V0332`` and ``NAS1149V0332H`` are two different part numbers, and
    accepting one for the other is exactly the class of error this repo exists
    to prevent -- which is also why the callout token is needed at all, since
    the washer element's ``hardware_ref`` is the former and its parts-list row
    the latter.
    """
    out: List[str] = []
    if hardware_ref:
        out.append(str(hardware_ref).strip())
    callout = (source_ref or {}).get("callout")
    if callout:
        tokens = str(callout).strip().split()
        if tokens:
            out.append(tokens[0])
    seen, ordered = set(), []
    for candidate in out:
        if candidate and candidate not in seen:
            seen.add(candidate)
            ordered.append(candidate)
    return ordered


def parts_list_row_for(balloons: Dict[str, Any], source_ref: Dict[str, Any],
                       hardware_ref: Optional[str]) -> Optional[Dict[str, Any]]:
    """The parts-list row this citation names, by exact part-number equality
    **and** by the find number the citation states.

    A parts-list row is a ``(part_number, find_no)`` pair, so a part number
    alone does not identify one: 217755's parts list carries ``NAS1149V0332H``
    as both find 13 and find 32, two real rows for two different washers of the
    same part number. Keyed on the part number alone, one of the two is simply
    deleted -- whichever the export happened to write first -- and the survivor
    is then answered for a citation naming the other, silently and with full
    ``verified_match`` confidence, under the cited element's own name.

    So the find number the citation prints in its own callout
    (:data:`CALLOUT_FIND_NO_RE`) narrows the match, which is the citation-side
    form of the tie-break :func:`parts_list_row_rect` performs against the
    ``FIND`` column printed on the page. A tie that survives is **refused**
    -- ``None``, never the last row written -- the way that function refuses:
    :func:`balloon_answer`'s contract makes a ``None`` here place the crop
    exactly as it did before, so refusing can only ever lose a located crop,
    never move one onto the wrong row.

    **Two doors this deliberately leaves open**, neither reachable on today's
    data and both worth knowing before extending this. A cited find number that
    matches *none* of a collision's rows falls through to the next candidate
    part number rather than refusing outright; and a part number matching
    exactly **one** row is returned without checking that row against a cited
    find number that disagrees with it. The second is the deliberate one -- it
    mirrors :func:`parts_list_row_rect`, which also breaks the tie only when
    there is a tie, and narrowing unconditionally would cost a crop in the
    no-collision case, which is every live case but one.
    """
    rows = [row for row in (balloons.get("parts_list") or [])
            if row.get("find_no") is not None]
    by_number: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        by_number.setdefault(str(row.get("part_number") or ""), []).append(row)
    cited = CALLOUT_FIND_NO_RE.search(
        str((source_ref or {}).get("callout") or ""))
    cited_find_no = int(cited.group(1)) if cited else None
    for candidate in candidate_part_numbers(source_ref, hardware_ref):
        matched = by_number.get(candidate) or []
        if len(matched) > 1 and cited_find_no is not None:
            matched = [row for row in matched
                       if int(row["find_no"]) == cited_find_no]
        if len(matched) == 1:
            return matched[0]
        if len(matched) > 1:
            return None
    return None


def balloon_answer(balloons: Optional[Dict[str, Any]], page_no: int,
                   source_ref: Dict[str, Any],
                   hardware_ref: Optional[str]) -> Optional[Dict[str, Any]]:
    """Where this citation's item is ballooned on the cited sheet, or ``None``.

    ``None`` whenever any link in the chain is missing -- no balloon file, no
    parts-list row for the part number, no balloon for that find number on that
    sheet. The caller then places the crop exactly as it did before, so this
    rule can only ever *add* a located crop.

    When the citation names a view, balloons whose ``view_id`` names that view
    are preferred; if none does, every balloon of the item on the sheet is used
    and ``view_matched`` says so. Filtering to nothing would throw away the one
    piece of real evidence available.
    """
    if not balloons:
        return None
    row = parts_list_row_for(balloons, source_ref, hardware_ref)
    if row is None:
        return None
    find_no = row["find_no"]
    on_sheet = [b for b in (balloons.get("balloons") or [])
                if b.get("page") == page_no and b.get("item_no") == find_no
                and b.get("bbox_pt")]
    if not on_sheet:
        return None
    cited_view = str((source_ref or {}).get("view") or "").strip().upper()
    in_view = [b for b in on_sheet
               if cited_view and cited_view in str(b.get("view_id") or "").upper()]
    chosen = in_view or on_sheet
    view_id = str(chosen[0].get("view_id") or "")
    # Every balloon sharing that view, item or not: the extent of the view the
    # item is in, as evidenced by what is ballooned inside it. The caller uses
    # it to frame the crop when the citation named no printed zone -- a crop
    # padded around one balloon shows a number in a circle and nothing it could
    # be a number FOR.
    siblings = [b for b in (balloons.get("balloons") or [])
                if b.get("page") == page_no and b.get("bbox_pt")
                and str(b.get("view_id") or "") == view_id]
    return {
        "find_no": find_no,
        "part_number": str(row.get("part_number") or ""),
        "nomenclature": str(row.get("nomenclature") or ""),
        "view_matched": bool(in_view),
        "view_id": view_id,
        "rects": [tuple(float(v) for v in b["bbox_pt"]) for b in chosen],
        "view_rects": [tuple(float(v) for v in b["bbox_pt"]) for b in siblings],
        "pl_page": balloons.get("pl_page"),
    }


def parts_list_table_rect(dc_root: Path, run_dir_name: Optional[str],
                          pl_page: Optional[int]) -> Optional[Tuple[float, ...]]:
    """The parts-list table's own bbox on its sheet, from the run's page JSON.

    ``zones.parts_list.tight_bbox_pt`` -- drawing-checker's own answer to "where
    is the table", so the row search below is bounded by the table rather than
    by the page (a part number printed in a note is not a parts-list row).
    """
    if not run_dir_name or not pl_page:
        return None
    run = dc_root / "data" / "runs" / run_dir_name
    if not run.is_dir():
        return None
    for path in sorted(run.glob(f"*_p{int(pl_page):02d}.json")):
        zones = (json.loads(path.read_text(encoding="utf-8")).get("zones") or {})
        rect = (zones.get("parts_list") or {}).get("tight_bbox_pt")
        if isinstance(rect, (list, tuple)) and len(rect) == 4:
            return tuple(float(v) for v in rect)
    return None


def parts_list_row_rect(page, table_rect: Sequence[float], part_number: str,
                        find_no: Optional[int] = None
                        ) -> Optional[Tuple[Tuple[float, ...], Tuple[float, ...]]]:
    """``(band, hit)``: the row band to crop and the part number's own rect.

    The band spans the printed column block the hit sits in, delimited by the
    ``FIND`` headers (:data:`PARTS_LIST_BLOCK_HEADER`): a Joby parts list prints
    as several side-by-side blocks, so a band across the whole table would carry
    two unrelated rows' worth of columns. :data:`PARTS_LIST_CONTEXT_PT` of
    neighbouring rows is kept above and below, so the crop reads as a parts list
    and not as one floating line of text.

    One part number can occupy **more than one row**: 217755's parts list
    carries ``NAS1149V0332H`` as both find 13 and find 32, and the citation is
    about one of them. So when several rows match, ``find_no`` breaks the tie
    the way a reader would -- by the number printed in the ``FIND`` column to
    the left of the part number, on the same row -- and a tie that survives
    that is left unresolved rather than guessed at. ``None`` when the part
    number is not on the sheet, or when which row it means cannot be answered.
    """
    hits = [tuple(float(v) for v in h) for h in page.search_for(part_number)
            if center_in(table_rect, h)]
    if not hits:
        return None
    headers = sorted(float(h[0]) for h in page.search_for(PARTS_LIST_BLOCK_HEADER))

    def block_of(hit):
        left = max([x for x in headers if x <= hit[0] + 1.0], default=table_rect[0])
        right = min([x for x in headers if x > left + 1.0], default=table_rect[2])
        return left, right

    if len(hits) > 1 and find_no is not None:
        printed = [tuple(float(v) for v in h)
                   for h in page.search_for(str(find_no))
                   if center_in(table_rect, h)]
        hits = [hit for hit in hits if any(
            block_of(hit)[0] - 1.0 <= found[0] < hit[0]
            and found[1] <= (hit[1] + hit[3]) / 2 <= found[3]
            for found in printed)]
    if len(hits) != 1:
        return None
    hit = hits[0]
    left, right = block_of(hit)
    band = (left - PARTS_LIST_BLOCK_INSET_PT,
            hit[1] - PARTS_LIST_CONTEXT_PT,
            right - PARTS_LIST_BLOCK_INSET_PT,
            hit[3] + PARTS_LIST_CONTEXT_PT)
    return band, hit


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------


def locate(page, source_ref: Dict[str, Any], hardware_ref: Optional[str],
           zone_pad: float, text_pad: float,
           region: Optional["scr.RegionResolution"] = None,
           balloon: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Decide the crop rect on ``page``, and the boxes to draw on it. Never
    raises -- worst case is the sheet.

    ``region`` is the declared-region answer for this citation
    (:func:`tolerance_stack.spec_crop_regions.resolve`), or ``None`` when the
    document is not a pile document and no region could apply. ``balloon`` is
    :func:`balloon_answer`, or ``None`` when the citation names no item that
    drawing-checker ballooned on this sheet.

    The order, and why it is this order:

    1. **the balloon**, when one was found. It is the item the citation is
       *about*, located on the page by native geometry, and it beats the cited
       zone -- which for a parts-list citation is the zone of the view CAPTION,
       a place the item is not, and one this repo has already watched move
       between two exports of one revision.
    2. **the cited zone**, padded by ``zone_pad`` cells, widened to whatever the
       callout's leader reaches (:func:`attachment_rect`) when the callout text
       was found inside the cell. The citation is a zone citation, so the zone is
       what gets shown -- but a dimension with its geometry cropped out shows a
       number floating in space, which is the third thing Jeff reported.
    3. **a declared crop region**, inside its sheet's declared **context** if one
       is recorded: then the context is the crop and the region is a highlight.
       A zone is something this citation said about itself while a region is
       declared per document, so the more specific statement still wins -- but a
       declared rect somebody looked at beats a needle that happened to match
       once.
    4. **the callout text**, if a needle derived from the callout matches exactly
       once on the page, again widened to what its leader reaches.
    5. **the sheet's declared context**, when the page has one and nothing above
       placed the crop. Coarse, so it loses to a unique text match, but it is a
       rect a human recorded and it beats the whole sheet.
    6. **the whole sheet**, with the reason recorded.

    Every branch returns the same keys, ``highlights`` included: a consumer must
    never have to tell "no highlight" from "this builder is older than
    highlights".
    """
    cols, rows = page_native_grid(page)
    needles = callout_needles(source_ref, hardware_ref)
    cited_zone = source_ref.get("zone")
    grid_read = bool(cols and rows)
    placement = {
        "cited_zone": cited_zone,
        "zone_grid": "read" if grid_read else "unreadable",
        "callout_text_in_zone": None,
        # Present on every placement, not only a declared_region one, so a crop
        # entry has one shape and a consumer never has to tell "no region" from
        # "this builder is older than regions".
        "region_label": None,
        "region_match": None,
        "context_label": None,
        "find_no": None,
        "highlights": [],
    }

    cell = zone_cell(cols, rows, str(cited_zone)) if (cited_zone and grid_read) else None

    if balloon is not None and balloon.get("rects"):
        rect = None
        for box in balloon["rects"]:
            padded = pad_rect(box, ATTACHMENT_PAD_PT, ATTACHMENT_PAD_PT)
            rect = padded if rect is None else union_rect(rect, padded)
        note = (f"balloon {balloon['find_no']} for {balloon['part_number']}, "
                f"padded for the view around it")
        if cell:
            # The cited zone stays in the frame as well: it is what the citation
            # said, and on the one live case it is what carries the view's
            # caption, so a reader sees the balloon AND the name of the view.
            width, height = cell[2] - cell[0], cell[3] - cell[1]
            rect = union_rect(rect, pad_rect(cell, width * zone_pad, height * zone_pad))
            note += f"; unioned with the cited zone {cited_zone}"
        elif balloon.get("view_rects"):
            # No zone cited, so the frame comes from the view instead: the
            # extent of everything ballooned in it. Without this the crop is a
            # padded box round one balloon -- a number in a circle, with none of
            # the geometry it labels.
            for box in balloon["view_rects"]:
                rect = union_rect(rect, box)
            rect = pad_rect(rect, ATTACHMENT_PAD_PT, ATTACHMENT_PAD_PT)
            note += (f"; framed on the {len(balloon['view_rects'])} balloon(s) of "
                     f"the view it sits in, the citation naming no printed zone")
        if not balloon["view_matched"] and (source_ref or {}).get("view"):
            note += (f"; no balloon of this item is recorded in "
                     f"{source_ref['view']!r}, so every balloon of it on this "
                     f"sheet is shown")
        return {
            **placement,
            "rect": rect,
            "located_by": "balloon_view",
            "needle": None,
            "find_no": balloon["find_no"],
            "highlights": [highlight("verified_match",
                                     f"balloon {balloon['find_no']}", box)
                           for box in balloon["rects"]],
            "note": note,
        }

    if cell:
        width, height = cell[2] - cell[0], cell[3] - cell[1]
        matched, hit = None, None
        for needle in needles:
            for found in page.search_for(needle):
                if center_in(cell, found):
                    matched, hit = needle, tuple(float(v) for v in found)
                    break
            if hit is not None:
                break
        rect = pad_rect(cell, width * zone_pad, height * zone_pad)
        note = f"printed zone {cited_zone} padded by {zone_pad:g} cell(s)"
        if hit is not None:
            highlights = [highlight("verified_match", matched, hit)]
            attachment = attachment_rect(page, hit)
            if attachment is not None:
                rect = union_rect(rect, attachment)
                note += ("; widened to the geometry the callout's leader "
                         "reaches, so the dimension is shown on the feature "
                         "rather than floating in space")
        else:
            # Nothing on the page corroborated the citation, so the box round
            # the zone is DASHED: "the crop is the citation, not a match".
            highlights = [highlight("declared_region",
                                    f"cited zone {cited_zone}", cell)]
        return {
            **placement,
            "rect": rect,
            "located_by": "zone_cell",
            "needle": matched,
            "zone_grid": "read",
            "callout_text_in_zone": hit is not None,
            "highlights": highlights,
            "note": note,
        }

    if region is not None and region.region is not None:
        context = region.context
        rect = tuple(region.region.rect)
        boxes: List[Dict[str, Any]] = []
        note = f"declared crop region {region.region.label!r} -- {region.why}"
        if context is not None:
            rect = tuple(context.rect)
            boxes = [highlight("declared_region", region.region.label,
                               region.region.rect)]
            note += (f"; shown inside the page context {context.label!r}, so the "
                     f"column headers and any figure are in the frame")
        return {
            **placement,
            "rect": rect,
            "located_by": "declared_region",
            "needle": None,
            "region_label": region.region.label,
            "region_match": region.matched,
            "context_label": context.label if context is not None else None,
            "highlights": boxes,
            "note": note,
        }

    for needle in needles:
        hits = page.search_for(needle)
        if len(hits) == 1:
            hit = tuple(float(v) for v in hits[0])
            rect = pad_rect(hit, text_pad, text_pad)
            note = f"located by the unique match for {needle!r}"
            attachment = attachment_rect(page, hit)
            if attachment is not None:
                rect = union_rect(rect, attachment)
                note += "; widened to the geometry the callout's leader reaches"
            return {
                **placement,
                "rect": rect,
                "located_by": "callout_text",
                "needle": needle,
                "highlights": [highlight("verified_match", needle, hit)],
                "note": note,
            }

    if region is not None and region.context is not None:
        return {
            **placement,
            "rect": tuple(region.context.rect),
            "located_by": "page_context",
            "needle": None,
            "context_label": region.context.label,
            "note": (f"the page context {region.context.label!r} -- no declared "
                     f"region matched this citation ({region.why}), so the "
                     f"sheet's own context is shown with nothing highlighted"),
        }

    if not page.get_text("text").strip():
        why = "this sheet has no text layer, so the callout cannot be located"
    elif cited_zone:
        why = f"zone {cited_zone} cited but this sheet's printed border grid is not legible"
    else:
        why = "no zone cited and the callout text matches zero or many places"
    if region is not None:
        # A pile document with no region that applied. Say so in the note: the
        # fix is to record one (scripts/record_spec_crop_region.py), and a whole
        # sheet whose reason stops at "no text layer" never tells anyone that.
        why += f"; {region.why}"
    return {
        **placement,
        "rect": tuple(page.rect),
        "located_by": "sheet_full",
        "needle": None,
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
    ap.add_argument("--topologies-dir", default=str(REPO_ROOT / TOPOLOGIES_DIR))
    ap.add_argument("--drawing-checker-root", default=str(DEFAULT_DC_ROOT))
    ap.add_argument("--crop-regions", default=str(REPO_ROOT / scr.REGISTRY_RELPATH),
                    help="declared crop regions for spec-pile documents "
                         "(scripts/record_spec_crop_region.py records them)")
    ap.add_argument("--zoom", type=float, default=3.0, help="render scale for located crops")
    ap.add_argument("--zone-pad", type=float, default=1.0,
                    help="cells of context around a cited zone")
    ap.add_argument("--text-pad", type=float, default=200.0,
                    help="points of context around a located callout")
    ap.add_argument("--max-px", type=int, default=2400,
                    help="cap on a crop's longest side")
    ap.add_argument("--allow-older-tree", action="store_true",
                    help="overwrite a crop index built from a tree this one does "
                         "not contain (the gate refuses by default -- see "
                         "scripts/projection_provenance.py)")
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
    topologies_dir = Path(args.topologies_dir)
    data_root = Path(args.data_root)
    dc_root = Path(args.drawing_checker_root)
    specs_dir = data_root / "inbox" / "specs"
    out_dir = data_root / PROJECTION_SUBDIR
    crops_dir = out_dir / "crops"

    # The gate runs first -- before the rmtree below, and before a few minutes of
    # PDF rendering. Refusing after wiping crops/ would be a refusal that
    # destroyed the thing it was protecting.
    provenance = prov.stamp(REPO_ROOT, stacks_dir, BUILT_BY)
    rebuild_command = (
        r"C:\workspace\drawing-checker\venv-win\Scripts\python.exe "
        f"scripts\\build_viewer_crops.py --data-root {data_root}"
    )
    try:
        notes = prov.guard(out_dir / "crops.json", provenance, REPO_ROOT,
                           args.allow_older_tree, rebuild_command)
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3
    for line in notes:
        print(f"note: {line}", file=sys.stderr)
    for line in prov.note_lines(provenance):
        print(line, file=sys.stderr)

    # The registry is tracked, so it is in this worktree; a missing file is a
    # legitimate state (no region recorded anywhere yet) and is SAID rather than
    # assumed, because "no regions" and "the registry did not load" produce the
    # same whole-sheet crops and are very different facts.
    regions_path = Path(args.crop_regions)
    if regions_path.exists():
        registry = scr.load(regions_path)
        print(f"crop regions: {len(registry.regions)} declared in {regions_path}",
              file=sys.stderr)
    else:
        registry = scr.CropRegionRegistry()
        print(f"no crop-region registry at {regions_path} -- spec-pile citations "
              f"will crop the whole sheet", file=sys.stderr)

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
    resolved: List[Dict[str, Any]] = []
    open_docs: Dict[str, Any] = {}
    # Roots a repo-relative cited path is tried against. data_root.parent first:
    # `data/inbox/drawings/x.pdf` means the MAIN checkout's data/, which is not
    # this worktree's.
    rel_roots = [data_root.parent, REPO_ROOT, dc_root]

    for path in sorted(stacks_dir.glob("stack_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        stack_id = raw["id"]
        by_stack[stack_id] = {}
        for element in raw.get("elements", []):
            entry = crop_element(
                raw, element, specs_dir, dc_root, rel_roots,
                crops_dir, open_docs, args, registry,
            )
            by_stack[stack_id][element["id"]] = entry
            if entry["status"] == "resolved":
                resolved.append({"stack": stack_id, "element": element["id"], **entry})
            else:
                unresolved.append({
                    "stack": stack_id,
                    "element": element["id"],
                    "kind": ((element.get("source_ref") or {}).get("kind")),
                    "document": ((element.get("source_ref") or {}).get("document")),
                    "reason": entry["reason"],
                })

    summary = resolution_summary(resolved, unresolved)

    # The topology scan: a SEPARATE space (see the module docstring). It runs
    # after `summary` is computed from `resolved`/`unresolved` alone, so it
    # cannot perturb those three -- pinned by
    # tests/test_viewer_crops.py::test_the_topology_scan_does_not_touch_the_stack_summary.
    by_topology: Dict[str, Dict[str, Any]] = {}
    unresolved_topology: List[Dict[str, str]] = []
    resolved_topology: List[Dict[str, Any]] = []
    for path in sorted(topologies_dir.glob("topology_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        topology_id = raw["id"]
        by_topology[topology_id] = {}
        for edge in raw.get("edges", []):
            # Only an INLINE dimension is this scan's business: a
            # `dimension_ref` edge already resolves through `by_stack`
            # (`scripts/build_topology_projection.py`'s `crop_key`), and a
            # derived gap carries no dimension -- and so no citation -- at all.
            dimension = edge.get("dimension")
            if not dimension or edge.get("dimension_ref"):
                continue
            entry = crop_topology_edge(
                topology_id, edge["id"], dimension, specs_dir, dc_root,
                rel_roots, crops_dir, open_docs, args, registry,
            )
            by_topology[topology_id][edge["id"]] = entry
            if entry["status"] == "resolved":
                resolved_topology.append(
                    {"topology": topology_id, "edge": edge["id"], **entry})
            else:
                unresolved_topology.append({
                    "topology": topology_id,
                    "edge": edge["id"],
                    "kind": ((dimension.get("source_ref") or {}).get("kind")),
                    "document": ((dimension.get("source_ref") or {}).get("document")),
                    "reason": entry["reason"],
                })
    summary_topology = resolution_summary(resolved_topology, unresolved_topology)

    index = build_index(provenance, dc_root, dc_available, summary, by_stack,
                        unresolved, by_topology=by_topology,
                        unresolved_topology=unresolved_topology,
                        summary_topology=summary_topology)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "crops.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"wrote {out_dir / 'crops.json'}")
    print(f"  {summary['resolved']} of {summary['citations']} citation(s) resolved "
          f"into {crops_dir}")
    for line in summary_lines(summary):
        print("  " + line)
    print(f"  {len(unresolved)} citation(s) unresolvable:")
    for row in unresolved:
        print(f"    {row['stack']}:{row['element']:28s} {row['reason']}")
    print(f"  {summary_topology['resolved']} of {summary_topology['citations']} "
          f"topology inline citation(s) resolved into {crops_dir}")
    for line in summary_lines(summary_topology):
        print("  " + line)
    print(f"  {len(unresolved_topology)} topology inline citation(s) unresolvable:")
    for row in unresolved_topology:
        print(f"    {row['topology']}:{row['edge']:28s} {row['reason']}")
    return 0


def build_index(
    provenance: Dict[str, Any],
    dc_root: Path,
    dc_available: bool,
    summary: Dict[str, Any],
    by_stack: Dict[str, Dict[str, Any]],
    unresolved: Sequence[Dict[str, str]],
    by_topology: Optional[Dict[str, Dict[str, Any]]] = None,
    unresolved_topology: Optional[Sequence[Dict[str, str]]] = None,
    summary_topology: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """``crops.json``'s top level.

    A function rather than a dict literal in :func:`main` so the *shape* -- and
    in particular the provenance stamp, which is the whole point of
    ``ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection``
    -- is testable under this repo's stdlib-only venv. ``main()`` itself is not:
    it needs PyMuPDF and a drawing PDF.

    ``by_topology``/``unresolved_topology``/``summary_topology`` default to
    empty: :func:`tests.test_projection_provenance.test_the_crop_index_carries_the_four_facts`
    calls this with the pre-handoff six positional arguments, and the topology
    scan is additive -- a caller that does not pass it gets the pre-handoff
    shape back, just with three more (empty) keys.
    """
    return {
        "schema": SCHEMA_CROPS,
        # Unchanged fields, same instant as `provenance.built_at` -- other
        # consumers (the viewer's banner) already read these two by name.
        "built_at": provenance["built_at"],
        "built_by": BUILT_BY,
        # Which TREE built this file -- see scripts/projection_provenance.py.
        # crops.json recorded no stacks_dir at all before this; it is in here.
        prov.PROVENANCE_KEY: provenance,
        "drawing_checker_root": dc_root.as_posix(),
        "drawing_checker_available": dc_available,
        "crops_dir": "crops",
        "summary": summary,
        "by_stack": by_stack,
        "unresolved": list(unresolved),
        # A topology's inline edges, addressed {topology, edge} -- a SEPARATE
        # space from by_stack/unresolved/summary above, deliberately: see the
        # module docstring for why a topology's own id can collide with a
        # stack's. Not (yet) read by the viewer's `VA.cropFor`, which only
        # knows `by_stack` -- see this handoff's lesson.
        "summary_topology": summary_topology or {"citations": 0, "resolved": 0,
                                                  "unresolvable": 0,
                                                  "by_resolved_by": {},
                                                  "sha256_verified": {
                                                      "true": 0, "false": 0,
                                                      "unverified": 0}},
        "by_topology": by_topology or {},
        "unresolved_topology": list(unresolved_topology or []),
    }


def resolution_summary(
    resolved: Sequence[Dict[str, Any]], unresolved: Sequence[Dict[str, Any]]
) -> Dict[str, Any]:
    """Counts broken down by **which rule** resolved a crop and whether its
    sha256 was verified.

    Both facts already sat in every ``crops.json`` entry and both were easy to
    skip past, which is how "6 of 48 resolve" got read as six trustworthy crops
    when only two were sha-verified. Rolling them into the summary makes a rise
    in the resolved count answerable: a crop resolved by ``source_ref_export`` is
    sha-verified by construction, and anything else is visible as such here.
    """
    by_rule: Dict[str, int] = {}
    verified: Dict[str, int] = {"true": 0, "false": 0, "unverified": 0}
    for row in resolved:
        by_rule[row.get("resolved_by") or "unknown"] = (
            by_rule.get(row.get("resolved_by") or "unknown", 0) + 1)
        flag = row.get("sha256_verified")
        verified["unverified" if flag is None else ("true" if flag else "false")] += 1
    return {
        "citations": len(resolved) + len(unresolved),
        "resolved": len(resolved),
        "unresolvable": len(unresolved),
        "by_resolved_by": dict(sorted(by_rule.items())),
        "sha256_verified": verified,
    }


def summary_lines(summary: Dict[str, Any]) -> List[str]:
    lines = ["by rule:"]
    for rule, count in (summary["by_resolved_by"] or {"(none)": 0}).items():
        lines.append(f"  {count:3d}  {rule}")
    sha = summary["sha256_verified"]
    lines.append(
        f"sha256: {sha['true']} verified, {sha['false']} MISMATCHED, "
        f"{sha['unverified']} not checked"
    )
    return lines


def region_for(registry, pdf: Path, specs_dir: Path, page_no: int,
               source_ref: Dict[str, Any], hardware_ref: Optional[str]):
    """The declared-region answer for this citation, or ``None``.

    ``None`` means *no region could apply*: the resolved PDF is not a spec-pile
    document (a drawing export has zones and a text layer, which is what the two
    other placement rules are for). A pile document always gets a resolution
    object, even when it names no region, because "read for, not declared" is a
    fact worth putting in the crop's note -- the same three-outcomes discipline
    the spec library runs on.
    """
    if registry is None:
        return None
    try:
        in_pile = pdf.resolve().parent == specs_dir.resolve()
    except OSError:  # pragma: no cover -- a path that cannot be resolved is not the pile
        return None
    if not in_pile:
        return None
    return scr.resolve(registry, pdf.name, page_no,
                       scr.where_ref_text(source_ref, hardware_ref))


def parts_list_companion(doc, page, balloon, dc_root, run_dir_name, crops_dir,
                         name_stem, args) -> Optional[Dict[str, Any]]:
    """The cited item's parts-list row, rendered as a second image, or ``None``.

    A balloon crop shows a number in a circle. The row is what says the number
    is ``214820-002  BUSHING, PLAIN, ALUMINIUM BRONZE ...``, and a reader should
    not have to open the drawing to find that out -- deliverable 1 of handoff
    ``viewer_reference_crops_in_context``.

    ``None`` at every step that cannot be taken without guessing: no parts-list
    sheet recorded, no table bbox from the run, the part number not found
    exactly once inside that table. ``role`` is one of :data:`COMPANION_ROLES`.
    """
    pl_page = balloon.get("pl_page")
    if not pl_page or not 1 <= int(pl_page) <= doc.page_count:
        return None
    table = parts_list_table_rect(dc_root, run_dir_name, int(pl_page))
    if table is None:
        return None
    sheet = doc[int(pl_page) - 1]
    found = parts_list_row_rect(sheet, table, balloon["part_number"],
                                balloon["find_no"])
    if found is None:
        return None
    band, hit = found
    band = clamp_to(band, tuple(float(v) for v in sheet.rect))
    name = f"{name_stem}__parts_list.png"
    width, height = render(sheet, band, crops_dir / name, args.zoom, args.max_px)
    return {
        "role": "parts_list_row",
        "png": f"crops/{name}",
        "width": width,
        "height": height,
        "page": int(pl_page),
        "label": f"Parts list, sheet {int(pl_page)}",
        "find_no": balloon["find_no"],
        "part_number": balloon["part_number"],
        "nomenclature": balloon["nomenclature"],
        "rect_pt": [round(v, 2) for v in band],
        "highlights": with_fracs(
            band, [highlight("verified_match", balloon["part_number"], hit)]),
    }


def _crop_from_citation(raw, source_ref, hardware_ref, name_stem, no_ref_reason,
                        specs_dir, dc_root, rel_roots, crops_dir, open_docs,
                        args, registry) -> Dict[str, Any]:
    """One citation -> a locator entry (rendering its PNG on the way, if it resolves).

    Shared by :func:`crop_element` (a stack element) and
    :func:`crop_topology_edge` (a topology's inline dimension) -- same rules,
    same rendering, different filename stem and different ``raw``. ``raw`` is
    what :func:`resolve_pdf` reads ``joint.assembly_export`` off of (rule 3); a
    topology document has no ``joint`` block at all, so that rule simply never
    matches an inline edge -- correctly, since it borrows from a STACK's own
    joint and an inline edge is in no stack to borrow from.
    """
    import fitz

    if not source_ref:
        return {"status": "unresolvable", "reason": no_ref_reason, "png": None}
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
        region = region_for(registry, pdf, specs_dir, page_no, source_ref, hardware_ref)
        balloon = balloon_answer(
            balloons_for_run(dc_root, resolved["run_dir"]), page_no, source_ref,
            hardware_ref)
        placement = locate(page, source_ref, hardware_ref, args.zone_pad,
                           args.text_pad, region, balloon)
        # Clamped before it is rendered AND before the highlight fractions are
        # measured against it, so `rect_pt` and every `frac` describe the image
        # that was actually written -- `render` intersects with the page anyway.
        rect = clamp_to(placement["rect"], tuple(float(v) for v in page.rect))
        name = f"{name_stem}.png"
        width, height = render(page, rect, crops_dir / name, args.zoom, args.max_px)
        companion = (parts_list_companion(doc, page, balloon, dc_root,
                                          resolved["run_dir"], crops_dir,
                                          name_stem, args)
                     if balloon is not None else None)
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
        # What the viewer calls the link into drawing-checker: the drawing's own
        # number and revision, as the CITATION states them, e.g. "215197 rev
        # A.1". Only where there is a run to link to -- a spec-pile document has
        # no run page, and its `document` is a filename rather than a drawing
        # number, so labelling one would be a category error.
        "drawing_no": (str(source_ref.get("document") or "") or None
                       if resolved["run_dir"] else None),
        "drawing_revision": (str(source_ref.get("revision") or "") or None
                             if resolved["run_dir"] else None),
        "companion": companion,
    }
    entry.update({k: v for k, v in placement.items()
                  if k not in ("rect", "highlights")})
    entry["rect_pt"] = [round(v, 2) for v in rect]
    entry["highlights"] = with_fracs(rect, placement["highlights"])
    return entry


def crop_element(raw, element, specs_dir, dc_root, rel_roots, crops_dir,
                 open_docs, args, registry) -> Dict[str, Any]:
    """One stack element -> a locator entry."""
    return _crop_from_citation(
        raw, element.get("source_ref"), element.get("hardware_ref"),
        f"{raw['id']}__{element['id']}", "element carries no source_ref",
        specs_dir, dc_root, rel_roots, crops_dir, open_docs, args, registry,
    )


def crop_topology_edge(topology_id, edge_id, dimension, specs_dir, dc_root,
                       rel_roots, crops_dir, open_docs, args, registry) -> Dict[str, Any]:
    """One topology's inline edge -> a locator entry.

    ``raw`` is ``{}``: a topology document carries no ``joint`` block, so the
    legacy rule 3 never applies to an inline edge -- see
    :func:`_crop_from_citation`.
    """
    return _crop_from_citation(
        {}, dimension.get("source_ref"), dimension.get("hardware_ref"),
        f"{topology_id}__{edge_id}", "edge carries no source_ref",
        specs_dir, dc_root, rel_roots, crops_dir, open_docs, args, registry,
    )


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
