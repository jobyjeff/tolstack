"""Join this repo's open questions against the documents sitting in the spec pile.

The repo keeps two lists that have never been compared. The **gap lists** say
which standard *would* close each open question -- every stack element whose
``source_ref.confidence`` is ``untraced``/``inferred``, and every
``hardware_entries.json`` entry whose ``values_source`` is not ``traced``. The
**pile** (``data/inbox/specs/``) says which documents are actually here. A
document that arrives closes nothing by itself, and until this tool existed
nothing in the repo noticed that it *could*: ``NAS6403-NAS6420 Rev 4.pdf`` sat
in the pile for seven days while three separate handoffs each re-cited only the
row they were scoped to and left the identical question open one row down the
same table (``docs/issues/ISSUE_20260810_nothing_sweeps_the_spec_pile_against_open_gaps.md``).

Usage::

    venv-win\\Scripts\\python.exe tests\\debug_report_spec_pile_gaps.py
    venv-win\\Scripts\\python.exe tests\\debug_report_spec_pile_gaps.py --pile <dir>

Two things about this tool are load-bearing and are why it is worth writing
rather than eyeballing:

1. **The join is range-aware.** ``NAS6404U13D``'s gap said "NAS6404 absent"
   while the answering document is ``NAS6403-NAS6420 Rev 4.pdf`` -- one file
   covering eighteen basic numbers. A substring match finds nothing there, and
   *found nothing* for a week. This parses ``NAS<lo>-NAS<hi>`` /
   ``NAS<lo> THRU <hi>`` into a range and tests membership. Same shape for
   ``MS9363 Rev C.pdf`` against ``MS9363-09``.
2. **It skips loudly in a worktree rather than reporting "no candidates".**
   ``data/inbox/specs/`` is gitignored, so a worktree sees an empty directory.
   A tool that answers "nothing in the pile closes anything" from a worktree is
   worse than no tool: it is the same false negative it was written to catch,
   with a command behind it. Same stance as ``test_provenance.py``'s
   cross-repo skip and ``intake_queue.json``'s stored ``in_pile`` flag.

**Report only.** It relabels nothing and writes nothing: the scans have no text
layer, so the last step of every re-citation is a rendered crop read by a human
or by vision. It also does not fail. Whether it should graduate to a check is a
decision for strategy, and it needs ``KNOWN_NON_MATCHES`` below to be trusted
first -- "the document is in the pile" is not "the document gives this
quantity", and this repo already has a live example of the difference.

Handoff: spec_pile_gap_join (2026-08-13). Authored here; stdlib only, so it runs
under this repo's ``venv-win`` as-is, like the other ``debug_report_*`` tools.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

REPO_ROOT = Path(__file__).resolve().parent.parent
STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"
HARDWARE_ENTRIES = STACKS_DIR / "hardware_entries.json"

# ``data/`` is gitignored by design (forge convention); this path only resolves
# to real files in the MAIN checkout.
PILE_REL = "data/inbox/specs"

# The two labels that mean "still an open question" under docs/SOP_TOLERANCE_STACK.md.
OPEN_CONFIDENCES = ("untraced", "inferred")


# --------------------------------------------------------------------------- #
# designators                                                                 #
# --------------------------------------------------------------------------- #

# The prefixes this repo's gap prose actually names. Deliberately a closed
# vocabulary rather than a generic `[A-Z]+\d+`: the pile is full of drawing
# numbers, revision letters and dates that would otherwise parse as standards
# (`9-11-2025`, `V1_08-29-2025`, `Rev 4`), and a join that reports noise gets
# ignored, which is the failure mode one step past reporting nothing.
DESIGNATOR_PREFIXES = (
    "NASM", "NAS", "MS", "AN",
    "MIL-STD", "MIL-DTL", "MIL-S", "MIL-F", "MIL-P",
    "AMS", "AS", "JPS", "JBM", "JED",
)

# Joby drawing numbers get their own class: the gap lists name them (`217755`,
# `215197`, `214943-002`) and the pile holds them (`216231 A.1 ...pdf`), so
# leaving them out would miss real joins. Restricted to the 21xxxx block this
# program uses, which is also what keeps the workbook stems -- `260729_...`,
# `260209_...` -- from parsing as drawing numbers.
JOBY_PREFIX = ""
JOBY_NUMBER = re.compile(r"(?<![\d-])(21\d{4})(?![\d])")

_PREFIX_ALT = "|".join(sorted(DESIGNATOR_PREFIXES, key=len, reverse=True))
# `MIL-S-8879`, `NAS6403`, `MS 9363`, `NAS6403U13H` (dash/suffix ignored: the
# join is on the basic number, which is what a document covers).
_DESIGNATOR = re.compile(rf"(?<![A-Za-z0-9])({_PREFIX_ALT})[-\s]?(\d+)")


# `NAS6403-NAS6420`, `NAS1121 THRU 1128`, `MS20001 TO MS20009`. The second
# prefix is optional but, when printed, must be the same one.
_RANGE = re.compile(
    rf"(?<![A-Za-z0-9])({_PREFIX_ALT})[-\s]?(\d+)"
    rf"\s*(?:-|--|THRU|THROUGH|TO)\s*"
    rf"(?:({_PREFIX_ALT})[-\s]?)?(\d+)",
    re.IGNORECASE,
)


@dataclass(frozen=True, order=True)
class Designator:
    """A standard (or Joby drawing) at basic-number granularity.

    Dash numbers are dropped on purpose: ``MS9363-09`` and ``MS9363-10`` are
    both covered by ``MS9363 Rev C.pdf``, and every document in the pile is
    published at the basic-number level.

    ``width`` is how many digits the designator is *printed* with, and it is
    excluded from equality: ``JPS00094`` and ``JPS94`` are one document, and a
    join that made them two would be the substring bug this tool exists to
    kill, wearing a different hat. It is carried only so the report can print
    the number back the way the document does.
    """

    prefix: str
    number: int
    width: int = field(default=0, compare=False)

    def __str__(self) -> str:
        sep = "-" if "-" in self.prefix else ""      # MIL-S-8879, but NAS6403
        return f"{self.prefix}{sep}{self.number:0{self.width}d}"


@dataclass(frozen=True)
class Coverage:
    """A span of basic numbers one document covers, parsed from its filename."""

    prefix: str
    lo: int
    hi: int
    width: int = field(default=0, compare=False)

    @property
    def is_range(self) -> bool:
        return self.hi > self.lo

    def contains(self, d: Designator) -> bool:
        return d.prefix == self.prefix and self.lo <= d.number <= self.hi

    def __str__(self) -> str:
        low = Designator(self.prefix, self.lo, self.width)
        if not self.is_range:
            return str(low)
        return f"{low}-{Designator(self.prefix, self.hi, self.width)}"


def _as_range(match: re.Match) -> Coverage | None:
    """A ``_RANGE`` match, if it really is a range. Guarded three ways, because
    filenames and prose are full of things that look like ranges and are not:

    * the two prefixes must agree when both are printed;
    * both numbers must have the **same digit count** -- this is what stops
      ``MS9363-09`` reading as "MS9363 through MS9<9>" and
      ``MIL-STD-889D-2021`` from reading as a 1132-wide range; and
    * ``hi`` must exceed ``lo``.
    """
    prefix, lo_text, second, hi_text = match.groups()
    prefix = prefix.upper()
    if second is not None and second.upper() != prefix:
        return None
    if len(lo_text) != len(hi_text):
        return None
    lo, hi = int(lo_text), int(hi_text)
    if hi <= lo:
        return None
    return Coverage(prefix, lo, hi, len(lo_text))


def designators_in(text: str) -> list[Designator]:
    """Every standard designator named in a piece of prose, first-seen order.

    A **range** printed in prose collapses to its low end, because that is what
    it is -- one document. Gap notes cite the answering file by name
    (``NAS6403-NAS6420 Rev 4.pdf``), and treating ``NAS6420`` as a second thing
    the gap "names" manufactures a candidate row for a standard nobody asked
    about.
    """
    text = text or ""
    found: list[Designator] = []
    spans: list[tuple[int, int]] = []

    def add(d: Designator) -> None:
        if d not in found:
            found.append(d)

    for m in _RANGE.finditer(text):
        span = _as_range(m)
        if span is not None:
            add(Designator(span.prefix, span.lo, span.width))
            spans.append((m.start(), m.end()))

    def outside(start: int) -> bool:
        return not any(a <= start < b for a, b in spans)

    for m in _DESIGNATOR.finditer(text):
        if outside(m.start()):
            add(Designator(m.group(1).upper(), int(m.group(2)), len(m.group(2))))
    for m in JOBY_NUMBER.finditer(text):
        if outside(m.start()):
            add(Designator(JOBY_PREFIX, int(m.group(1)), len(m.group(1))))
    return found


# --------------------------------------------------------------------------- #
# what a pile document covers                                                 #
# --------------------------------------------------------------------------- #

def parse_coverage(filename: str) -> list[Coverage]:
    """What basic numbers a pile filename claims to cover.

    Ranges first, then bare designators for anything a range did not already
    swallow. A filename that parses to nothing is normal (most of the pile is
    process specs and drawings) and is not an error.
    """
    stem = Path(filename).stem
    spans: list[tuple[int, int]] = []
    out: list[Coverage] = []

    for m in _RANGE.finditer(stem):
        span = _as_range(m)
        if span is not None:
            out.append(span)
            spans.append((m.start(), m.end()))

    def outside(start: int) -> bool:
        return not any(a <= start < b for a, b in spans)

    for m in _DESIGNATOR.finditer(stem):
        if outside(m.start()):
            n = m.group(2)
            out.append(Coverage(m.group(1).upper(), int(n), int(n), len(n)))
    for m in JOBY_NUMBER.finditer(stem):
        if outside(m.start()):
            n = m.group(1)
            out.append(Coverage(JOBY_PREFIX, int(n), int(n), len(n)))

    deduped: list[Coverage] = []
    for c in out:
        if c not in deduped:
            deduped.append(c)
    return deduped


@dataclass(frozen=True)
class PileDocument:
    name: str
    coverage: tuple[Coverage, ...]

    def covering(self, d: Designator) -> Coverage | None:
        for c in self.coverage:
            if c.contains(d):
                return c
        return None


def pile_documents(pile_dir: Path) -> list[PileDocument]:
    """Every file in the pile, with what its name says it covers.

    ``data/inbox/<stream>/`` is append-only by convention, so this is a plain
    listing -- no recursion, no state.
    """
    docs = []
    for p in sorted(pile_dir.iterdir()):
        if not p.is_file() or p.name in ("README.md", "desktop.ini", ".gitkeep"):
            continue
        docs.append(PileDocument(p.name, tuple(parse_coverage(p.name))))
    return docs


# --------------------------------------------------------------------------- #
# the open questions                                                          #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Gap:
    """One open question, with every designator its own prose names."""

    id: str
    where: str            # "stack element" | "hardware entry"
    confidence: str       # untraced | inferred | not_transcribed
    designators: tuple[Designator, ...]
    summary: str


def _clip(text: str, n: int = 96) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= n else text[: n - 3] + "..."


def stack_gaps(stacks_dir: Path = STACKS_DIR) -> list[Gap]:
    """Every element instance across the stack files that is not ``traced``.

    Every stack file on disk, not a hand-kept list: the point of this tool is
    that a question nobody was scoped to ask still gets asked, so a stack that
    was added without being wired into something is exactly what it must see.
    (``tests/test_tolerance_stack.py::test_the_stack_file_list_is_complete``
    keeps that glob and ``ALL_STACK_FILES`` in agreement.)
    """
    gaps = []
    for path in sorted(stacks_dir.glob("stack_*.json")):
        stack = json.loads(path.read_text(encoding="utf-8"))
        for element in stack["elements"]:
            ref = element.get("source_ref") or {}
            if ref.get("confidence") not in OPEN_CONFIDENCES:
                continue
            prose = " ".join(str(x) for x in (
                element.get("note", ""), element.get("hardware_ref", ""),
                ref.get("note", ""),
            ))
            gaps.append(Gap(
                id=f"{stack['id']}:{element['id']}",
                where="stack element",
                confidence=ref["confidence"],
                designators=tuple(designators_in(prose)),
                summary=_clip(element.get("name") or element["id"]),
            ))
    return gaps


def hardware_gaps(path: Path = HARDWARE_ENTRIES) -> list[Gap]:
    """Every ``hardware_entries.json`` entry whose values are not traced.

    Includes the ``not_transcribed`` entries (``values_source: null``): they
    have no values at all, which is the strongest form of open question, and
    they are the ones the pile most often already answers -- ``MS9363-09`` is
    one.
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    gaps = []
    for entry in data["entries"]:
        source = entry.get("values_source") or {}
        confidence = source.get("confidence") or entry["values_status"]
        if confidence == "traced":
            continue
        prose = " ".join(str(x) for x in (
            entry.get("id", ""), entry.get("standard") or "",
            source.get("note", ""), *(entry.get("gaps") or []),
        ))
        gaps.append(Gap(
            id=f"hardware_entries.json:{entry['id']}",
            where="hardware entry",
            confidence=confidence,
            designators=tuple(designators_in(prose)),
            summary=_clip(entry.get("class") or entry["id"]),
        ))
    return gaps


def open_questions() -> list[Gap]:
    return stack_gaps() + hardware_gaps()


# --------------------------------------------------------------------------- #
# the allowlist -- present in the pile, does NOT give this quantity            #
# --------------------------------------------------------------------------- #

# Seeded 2026-08-13 by handoff spec_pile_gap_join. THIS IS THE LIST THAT HAS TO
# EXIST BEFORE THIS TOOL COULD EVER BECOME A FAILING CHECK: "the document is in
# the pile" is not "the document gives this quantity", and a naive test would
# demand a re-citation that would be wrong. Every entry must name the crop or
# the reading that proves it, and must be a decision someone actually made --
# not a hunch that saved a look.
#
# Keyed ``(gap id, designator)``; ``tests/test_spec_pile_gap_join.py`` fails if
# an entry stops matching a live gap, so a dead entry cannot silently unguard
# a row the way a stale comment would.
KNOWN_NON_MATCHES: dict[tuple[str, str], str] = {
    ("tan_link_to_pitch_plate:thread_transition", "NAS6403"): (
        "NAS6403 does NOT dimension the thread run-out. Sheet 1 gives T (Ref) = "
        ".323 in for the dash-13 bolt -- length minus grip, i.e. the WHOLE region "
        "from the end of the full shank to the point -- and sheet 2 note (b) makes "
        "it a reference dimension. X (g) and Y (h) are thread-pitch counts for the "
        "locking element, not run-out lengths. Decided 2026-08-10 "
        "(fastener_citations_and_confidence) with the value UNCHANGED; the reading "
        "is written into the element's source_ref.note. MIL-S-8879 closes this one, "
        "and it is not in the pile."
    ),
}


# --------------------------------------------------------------------------- #
# where the pile is                                                           #
# --------------------------------------------------------------------------- #

def main_checkout(repo_root: Path = REPO_ROOT) -> Path | None:
    """The main checkout, if ``repo_root`` is a linked worktree; else ``None``.

    A worktree's ``.git`` is a *file* reading ``gitdir: <main>/.git/worktrees/<slug>``.
    Parsed rather than shelled out to, so the skip path stays testable and works
    on a tree that git cannot be run against.
    """
    dot_git = repo_root / ".git"
    if not dot_git.is_file():
        return None
    text = dot_git.read_text(encoding="utf-8").strip()
    if not text.startswith("gitdir:"):
        return None
    parts = Path(text.split(":", 1)[1].strip().replace("\\", "/")).parts
    if "worktrees" not in parts:
        return None
    common = Path(*parts[: parts.index("worktrees")])       # .../<main>/.git
    return common.parent if common.name == ".git" else None


SKIP_BANNER = "SKIPPED -- the spec pile is not visible from this checkout"


def resolve_pile(repo_root: Path = REPO_ROOT,
                 override: Path | None = None) -> tuple[Path | None, str]:
    """``(pile dir, message)``. A ``None`` dir means *skip*, never *empty*.

    The distinction this function exists to protect: a worktree cannot see
    ``data/inbox/specs/`` and must say so, because "no candidates" and "I could
    not look" are opposite answers that look identical in a report.
    """
    if override is not None:
        if not override.is_dir():
            return None, f"{SKIP_BANNER}: --pile {override} is not a directory"
        return override, f"pile: {override} (--pile override)"

    main = main_checkout(repo_root)
    if main is not None:
        pile = main / PILE_REL
        return None, (
            f"{SKIP_BANNER}.\n"
            f"  This is a git WORKTREE ({repo_root}); {PILE_REL} is gitignored, so\n"
            f"  it is empty here and the join would report every gap as having no\n"
            f"  candidate -- the exact false negative this tool was written to catch.\n"
            f"  The pile lives in the MAIN checkout: {main}\n"
            f"  Run it there:\n"
            f"      cd {main} && venv-win\\Scripts\\python.exe "
            f"tests\\{Path(__file__).name}\n"
            f"  or point this run at the pile explicitly:\n"
            f"      venv-win\\Scripts\\python.exe tests\\{Path(__file__).name} "
            f'--pile "{pile}"'
        )

    pile = repo_root / PILE_REL
    if not pile.is_dir():
        return None, f"{SKIP_BANNER}: {pile} does not exist"
    return pile, f"pile: {pile}"


# --------------------------------------------------------------------------- #
# the join                                                                    #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Hit:
    gap: Gap
    designator: Designator
    document: PileDocument
    coverage: Coverage

    @property
    def allowlisted(self) -> str | None:
        return KNOWN_NON_MATCHES.get((self.gap.id, str(self.designator)))


@dataclass
class Join:
    hits: list[Hit]                                   # candidates to re-cite
    checked: list[Hit]                                # allowlisted non-matches
    absent: dict[Designator, list[Gap]]               # the spec-intake queue
    silent: list[Gap]                                 # gaps naming no document
    pile_size: int


def join(gaps: list[Gap], docs: list[PileDocument]) -> Join:
    hits: list[Hit] = []
    checked: list[Hit] = []
    absent: dict[Designator, list[Gap]] = {}
    silent: list[Gap] = []

    for gap in gaps:
        if not gap.designators:
            silent.append(gap)
            continue
        for d in gap.designators:
            found = False
            for doc in docs:
                cov = doc.covering(d)
                if cov is None:
                    continue
                found = True
                hit = Hit(gap, d, doc, cov)
                (checked if hit.allowlisted else hits).append(hit)
            if not found:
                absent.setdefault(d, []).append(gap)
    return Join(hits, checked, absent, silent, len(docs))


# --------------------------------------------------------------------------- #
# the report                                                                  #
# --------------------------------------------------------------------------- #

def render(result: Join, header: str) -> str:
    lines = [
        "# spec-pile gap join",
        "",
        header,
        "",
        f"{len(result.hits)} candidate pair(s), {len(result.checked)} checked non-match(es), "
        f"{len(result.absent)} designator(s) with nothing in the pile.",
        "",
        "## 1. CANDIDATES -- a document in the pile covers a standard this gap names",
        "",
        "Nothing here is a re-citation. The scans have no text layer, so each row",
        "is 'open this file and look', and the answer may still be no -- see section 2.",
        "",
        "| gap | conf | names | pile document | matched |",
        "|---|---|---|---|---|",
    ]
    if not result.hits:
        lines.append("| *(none)* | | | | |")
    for hit in sorted(result.hits, key=lambda h: (h.gap.id, str(h.designator))):
        lines.append(
            f"| `{hit.gap.id}` | {hit.gap.confidence} | {hit.designator} | "
            f"`{hit.document.name}` | {hit.coverage}"
            f"{' (range)' if hit.coverage.is_range else ''} |"
        )

    lines += [
        "",
        "## 2. CHECKED, NOT CLOSABLE -- in the pile, does not give this quantity",
        "",
        "The allowlist (`KNOWN_NON_MATCHES`). These rows are NOT work: someone read",
        "the document and decided it does not print the number. Do not re-open one",
        "without reading the reason.",
        "",
    ]
    if not result.checked:
        lines.append("*(none)*")
    for hit in sorted(result.checked, key=lambda h: (h.gap.id, str(h.designator))):
        lines += [
            f"- `{hit.gap.id}` x **{hit.designator}** (`{hit.document.name}`)",
            f"  {hit.allowlisted}",
        ]

    lines += [
        "",
        "## 3. NO CANDIDATE -- named by a gap, not in the pile (spec-intake queue)",
        "",
        "| document | gaps waiting on it |",
        "|---|---|",
    ]
    if not result.absent:
        lines.append("| *(none)* | |")
    for d in sorted(result.absent, key=str):
        waiting = ", ".join(f"`{g.id}`" for g in result.absent[d])
        lines.append(f"| {d} | {waiting} |")

    lines += [
        "",
        "## 4. NAMES NO DOCUMENT -- nothing for this tool to look for",
        "",
        "These gaps do not name a standard or drawing at all, so the join cannot",
        "speak to them. That is a finding about the gap prose, not about the pile.",
        "",
        "| gap | conf | what |",
        "|---|---|---|",
    ]
    if not result.silent:
        lines.append("| *(none)* | | |")
    for gap in sorted(result.silent, key=lambda g: g.id):
        lines.append(f"| `{gap.id}` | {gap.confidence} | {gap.summary} |")

    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--pile", type=Path, default=None,
        help="read the pile from this directory instead of the repo's "
             f"{PILE_REL} (use it to point a worktree at the main checkout -- "
             "explicit is fine, silent is not)")
    args = parser.parse_args(argv)

    pile, message = resolve_pile(REPO_ROOT, args.pile)
    if pile is None:
        print(message)
        return 0

    gaps = open_questions()
    result = join(gaps, pile_documents(pile))
    print(render(result, f"{len(gaps)} open question(s) x {result.pile_size} "
                         f"pile document(s).  {message}"))
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
