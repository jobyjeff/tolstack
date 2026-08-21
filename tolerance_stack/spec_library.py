"""The spec library: immutable parse events, and the projection that folds them.

Reading a standard is an **event**, not an edit. One ``spec-parse/v0`` event per
(document, parser-version) records what an agent extracted from one file in
``data/inbox/specs/`` -- every value carrying the *source location* it was read
from -- and the library projection folds the event log into a lookup keyed by
**subject** (a part number, or a cited criterion). Corrections are later events
against the same document; nothing is ever edited in place, which is the same
disposition culture the stacks and the SOP already run on.

Why events at all
-----------------
The alternative is a hand-maintained ``fastener_library.json`` that agents edit.
That file cannot answer the only two questions that matter here: *who read this
number, off which sheet* and *what did it say before somebody changed it*. An
append-only log answers both by construction, and the projection is disposable
-- delete ``data/projections/spec_library/`` and rebuild.

Three outcomes, not two
-----------------------
A field that is not in the library is not one thing. This module models three,
because the SOP's gap discipline consumes them differently:

* **a value** -- read off the document, with its ``at`` location.
* **an absence** (``SpecEntry.absences``) -- the document was read and genuinely
  does not contain it. NAS6403 never dimensions thread run-out. Recording that
  is what stops the next agent re-opening the same PDF to look for it, and it
  names the document that *would* close it.
* **an unreadable** (``SpecEntry.unreadable``) -- the value is on the page and
  the photocopy will not give it up. It carries the crop that was tried, so the
  next reader starts where this one stopped. An illegible scan is an
  **acquisition** gap (get a better scan), not a licence to infer, and it is a
  different queue from an absence.

Parser v0 is an agent
---------------------
``parser.name == "agent-manual"`` means a human-or-agent read renders of the
page. These are photocopies with no text layer, so there is nothing to parse:
the working recipe (pitch_link lesson) is fitz ``get_pixmap(Matrix(2.2))`` per
page, then ``Matrix(4..8)`` with a ``clip`` per table region, notes sheet first.
Automated vision extraction would be parser v1 and would land as *new events
against the same documents*, side by side with v0's -- which is the whole point
of keying events by (document, parser-version).
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from tolerance_stack.stack import CONFIDENCES as STACK_CONFIDENCES

SCHEMA_PARSE_EVENT = "joby.tolstack/spec-parse/v0"
SCHEMA_LIBRARY = "joby.tolstack/spec_library/v0"
SCHEMA_INTAKE = "joby.tolstack/spec_intake/v0"

# An event either states the whole extraction for its document (`full`) or
# overlays named values onto what an earlier event for the same document said
# (`correction`). A correction must name the event it supersedes.
EVENT_MODES = ("full", "correction")

# The SAME vocabulary as SourceRef.confidence, imported rather than restated: a
# spec value read off a page and a stack element citing one answer the same
# question ("how well is this number supported?") and must answer it in the same
# words, or the two streams disagree about what `inferred` means. This stream
# needs no fourth word -- `unreadable` values live in their own list and never
# carry a number, so they never carry a confidence either.
CONFIDENCES = STACK_CONFIDENCES

# What kind of thing a library subject names. **This tuple is the definition** --
# it was an end-of-line comment on `SpecEntry.subject_kind` until 2026-08-19, and
# it was the most exposed of the repo's comment-defined vocabularies: unlike
# `SourceRef.kind` and `StackElement.role` it had no test whitelist either, so an
# event file could spell `subject_kind: "partnumber"` and nothing anywhere failed.
#
# A `part_number` is a full callable part (`NAS6403U11D`); a `criterion` is a
# cited requirement (`JPS00094 5.9.7`); a `family` carries the facts that belong
# to a standard rather than to any one part of it (the CODE block, note (a)'s
# definition of grip) -- see `docs/spec_library/README.md`, "Why not per-family
# tables", for why the family/part split exists at all.
SUBJECT_KINDS = ("part_number", "criterion", "family")


# ---------------------------------------------------------------------------
# Where in a document one value was read
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ValueLocation:
    """The re-findable address of a single extracted value.

    A document-level citation ("NAS6403 sheet 3") is not enough to re-check a
    number: sheet 3 is a 96-row grip table. ``row``/``column`` are what make a
    second reader land on the same cell, and ``note`` is for values that are
    defined in prose rather than tabulated (NAS6403 sheet 2 note (a) is the
    *definition* of the grip that sheet 3 tabulates).
    """

    sheet: Optional[Any] = None      # sheet/page number as the document labels it
    pdf_page: Optional[int] = None   # 1-based page in the file, when it differs
    table: Optional[str] = None      # e.g. "TABLE I DASH NUMBERS AND DIMENSIONS"
    row: Optional[str] = None        # e.g. "-09", "grip dash 11"
    column: Optional[str] = None     # e.g. "H", "NAS6404 .2500-28"
    note: Optional[str] = None       # e.g. "note (a)", "REQT 10", "5.9.7"
    figure: Optional[str] = None     # e.g. "section view", "hex face view"
    section: Optional[str] = None    # document section number, for prose specs
    callout: Optional[str] = None    # the text as it reads on the page

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ValueLocation":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def as_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


# ---------------------------------------------------------------------------
# Values, absences, unreadables
# ---------------------------------------------------------------------------


@dataclass
class SpecValue:
    """One extracted value.

    Limits are kept exactly as the document prints them. A table that prints
    ``.174 / .154`` has ``max``/``min`` and **no** ``nominal``; a column header
    that prints ``Grip ±.010`` against a tabulated ``.688`` has ``nominal`` and
    ``plus_minus`` and no limits. Deriving one form from the other is the
    consumer's job and its arithmetic belongs in the consumer's note -- see the
    SOP's "``nominal`` is not the midpoint".
    """

    name: str
    at: ValueLocation
    units: str = "in"
    nominal: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    plus_minus: Optional[float] = None
    text: Optional[str] = None       # for criteria: the quoted words themselves
    count: Optional[int] = None      # for countable geometry: slots, places
    confidence: str = "traced"
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.confidence not in CONFIDENCES:
            raise ValueError(f"value {self.name!r}: confidence {self.confidence!r} not in {CONFIDENCES}")
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError(f"value {self.name!r}: min {self.min} > max {self.max}")
        if all(v is None for v in (self.nominal, self.min, self.max, self.text, self.count)):
            raise ValueError(f"value {self.name!r}: carries no value at all")

    @classmethod
    def from_dict(cls, name: str, d: Dict[str, Any]) -> "SpecValue":
        d = dict(d)
        at = ValueLocation.from_dict(d.pop("at", {}) or {})
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__ and k != "name"}
        return cls(name=name, at=at, **known)

    def as_dict(self) -> Dict[str, Any]:
        out = {k: v for k, v in self.__dict__.items() if k != "at" and v is not None}
        out["at"] = self.at.as_dict()
        return out


@dataclass
class Absence:
    """A value the document was read for and demonstrably does not contain."""

    name: str
    why: str                              # what the document does say instead
    closed_by: Optional[str] = None       # the document that would supply it

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Absence":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def as_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class Unreadable:
    """A value that is on the page and that the scan will not resolve.

    ``crop`` is the render that was tried, verbatim enough to repeat:
    ``{"pdf_page": 2, "rect": [315, 178, 380, 189], "zoom": 16}``. ``ceiling``
    records the embedded scan's own resolution where it is known, because
    rendering above it adds pixels and no information -- the single most useful
    thing to tell the next reader before they burn renders on it.
    """

    name: str
    what_it_looks_like: str               # the best partial reading, honestly hedged
    crop: Dict[str, Any] = field(default_factory=dict)
    ceiling: Optional[str] = None
    resolution: Optional[str] = None      # what would actually close it

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Unreadable":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def as_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


# ---------------------------------------------------------------------------
# Entries and events
# ---------------------------------------------------------------------------


@dataclass
class SpecEntry:
    """Everything one event says about one subject.

    ``subject`` is the library key and is deliberately the thing a *stack*
    cites: a full part number (``NAS6403U11D``, ``MS9363-09``) or a cited
    criterion (``JPS00094 5.9.7``). It is **not** a document+row address --
    see the per-family/per-document note in the module docstring's sibling,
    ``docs/spec_library/README.md``.
    """

    subject: str
    subject_kind: str                     # one of SUBJECT_KINDS, above
    values: Dict[str, SpecValue] = field(default_factory=dict)
    absences: List[Absence] = field(default_factory=list)
    unreadable: List[Unreadable] = field(default_factory=list)
    note: Optional[str] = None

    def __post_init__(self) -> None:
        # `from_dict` is the only path a real event takes and it goes through
        # here, which is the whole point: before 2026-08-19 a misspelled
        # subject_kind was accepted by the loader, folded into the library and
        # written into the projection with nothing to notice it.
        if self.subject_kind not in SUBJECT_KINDS:
            raise ValueError(
                f"entry {self.subject!r}: subject_kind must be one of "
                f"{SUBJECT_KINDS}, got {self.subject_kind!r}")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SpecEntry":
        return cls(
            subject=d["subject"],
            subject_kind=d["subject_kind"],
            values={k: SpecValue.from_dict(k, v) for k, v in d.get("values", {}).items()},
            absences=[Absence.from_dict(a) for a in d.get("absences", [])],
            unreadable=[Unreadable.from_dict(u) for u in d.get("unreadable", [])],
            note=d.get("note"),
        )


@dataclass
class ParseEvent:
    """One immutable read of one document by one parser version."""

    event_id: str
    seq: int
    mode: str
    document: str                         # filename in data/inbox/specs/ -- the fold key
    parser: Dict[str, Any]
    parsed_at: str
    entries: List[SpecEntry] = field(default_factory=list)
    document_meta: Dict[str, Any] = field(default_factory=dict)
    supersedes: Optional[str] = None
    reason: Optional[str] = None          # required on a correction: why it was wrong
    notes: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.mode not in EVENT_MODES:
            raise ValueError(f"event {self.event_id!r}: mode {self.mode!r} not in {EVENT_MODES}")
        if self.mode == "correction" and not (self.supersedes and self.reason):
            raise ValueError(
                f"event {self.event_id!r}: a correction must name what it supersedes and why"
            )
        seen = [e.subject for e in self.entries]
        if len(set(seen)) != len(seen):
            raise ValueError(f"event {self.event_id!r} names a subject twice")

    @property
    def parser_version(self) -> str:
        return f"{self.parser.get('name')}/{self.parser.get('version')}"

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ParseEvent":
        if d.get("schema") != SCHEMA_PARSE_EVENT:
            raise ValueError(f"expected schema {SCHEMA_PARSE_EVENT!r}, got {d.get('schema')!r}")
        return cls(
            event_id=d["event_id"],
            seq=int(d["seq"]),
            mode=d["mode"],
            document=d["document"],
            parser=d["parser"],
            parsed_at=d["parsed_at"],
            entries=[SpecEntry.from_dict(e) for e in d.get("entries", [])],
            document_meta=d.get("document_meta", {}),
            supersedes=d.get("supersedes"),
            reason=d.get("reason"),
            notes=d.get("notes", []),
        )


def load_event(path: str | Path) -> ParseEvent:
    return ParseEvent.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))


def load_events(directory: str | Path) -> List[ParseEvent]:
    """Every event in ``directory``, in log order.

    ``seq`` is the total order and must be unique across the log -- two events
    claiming the same slot is exactly the ambiguity the fold exists to remove.
    """
    events = [load_event(p) for p in sorted(Path(directory).glob("*.json"))]
    by_seq: Dict[int, str] = {}
    for event in events:
        if event.seq in by_seq:
            raise ValueError(f"events {by_seq[event.seq]!r} and {event.event_id!r} share seq {event.seq}")
        by_seq[event.seq] = event.event_id
    return sorted(events, key=lambda e: e.seq)


# ---------------------------------------------------------------------------
# The projection
# ---------------------------------------------------------------------------


@dataclass
class ResolvedValue:
    """A value as the projection holds it: the winner, plus what it beat."""

    value: SpecValue
    document: str
    event_id: str
    superseded: List[Dict[str, Any]] = field(default_factory=list)

    def as_dict(self) -> Dict[str, Any]:
        out = self.value.as_dict()
        out["from_document"] = self.document
        out["from_event"] = self.event_id
        if self.superseded:
            out["superseded"] = self.superseded
        return out


@dataclass
class LibrarySubject:
    subject: str
    subject_kind: str
    values: Dict[str, ResolvedValue] = field(default_factory=dict)
    absences: List[Dict[str, Any]] = field(default_factory=list)
    unreadable: List[Dict[str, Any]] = field(default_factory=list)
    documents: List[str] = field(default_factory=list)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "subject": self.subject,
            "subject_kind": self.subject_kind,
            "documents": self.documents,
            "values": {k: v.as_dict() for k, v in self.values.items()},
            "absences": self.absences,
            "unreadable": self.unreadable,
        }


@dataclass
class SpecLibrary:
    subjects: Dict[str, LibrarySubject] = field(default_factory=dict)
    events: List[str] = field(default_factory=list)
    documents: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def subject(self, name: str) -> LibrarySubject:
        try:
            return self.subjects[name]
        except KeyError:
            raise KeyError(f"spec library has no subject {name!r}") from None

    def value(self, subject: str, name: str) -> ResolvedValue:
        entry = self.subject(subject)
        try:
            return entry.values[name]
        except KeyError:
            raise KeyError(f"subject {subject!r} has no value {name!r}") from None

    def has_subject(self, name: str) -> bool:
        return name in self.subjects

    def as_dict(self) -> Dict[str, Any]:
        return {
            "schema": SCHEMA_LIBRARY,
            "built_from_events": self.events,
            "documents": self.documents,
            "subjects": {k: v.as_dict() for k, v in sorted(self.subjects.items())},
        }


def build_library(events: Iterable[ParseEvent]) -> SpecLibrary:
    """Fold the event log into the library projection.

    Latest-per-document wins, and *how* it wins depends on the event's mode:

    * ``full`` replaces everything previously known for that document. Use it
      for a fresh read, or for a re-read by a new parser version.
    * ``correction`` overlays only the values it names, field by field, and the
      value it displaced is kept on the winner's ``superseded`` list with the
      correcting event's ``reason``. A one-line fix does not have to restate a
      whole standard, and the wrong number stays visible -- a library that
      quietly swaps a value is no better than the workbook this repo exists to
      get away from.

    A subject supplied by two different documents is an error, not a merge:
    silently preferring one file's ``.174`` over another's is precisely the
    laundering the SOP bans.
    """
    events = sorted(events, key=lambda e: e.seq)
    seen_ids = set()
    per_document: Dict[str, Dict[str, SpecEntry]] = {}
    provenance: Dict[str, Dict[str, ResolvedValue]] = {}
    documents: Dict[str, Dict[str, Any]] = {}

    for event in events:
        if event.event_id in seen_ids:
            raise ValueError(f"duplicate event_id {event.event_id!r}")
        seen_ids.add(event.event_id)
        if event.supersedes and event.supersedes not in seen_ids:
            raise ValueError(
                f"event {event.event_id!r} supersedes {event.supersedes!r}, which is not an earlier event"
            )
        documents[event.document] = {**event.document_meta, "latest_event": event.event_id}

        if event.mode == "full":
            per_document[event.document] = {e.subject: e for e in event.entries}
            provenance[event.document] = {
                f"{e.subject}:{name}": ResolvedValue(value, event.document, event.event_id)
                for e in event.entries
                for name, value in e.values.items()
            }
            continue

        # correction: overlay, keeping what it displaced
        current = per_document.setdefault(event.document, {})
        marks = provenance.setdefault(event.document, {})
        for incoming in event.entries:
            entry = current.get(incoming.subject)
            if entry is None:
                raise ValueError(
                    f"correction {event.event_id!r} names subject {incoming.subject!r}, "
                    f"which no earlier event for {event.document!r} established"
                )
            for name, value in incoming.values.items():
                key = f"{incoming.subject}:{name}"
                prior = marks.get(key)
                history = list(prior.superseded) if prior else []
                if prior is not None:
                    history.append(
                        {
                            "value": prior.value.as_dict(),
                            "from_event": prior.event_id,
                            "corrected_by": event.event_id,
                            "reason": event.reason,
                        }
                    )
                entry.values[name] = value
                marks[key] = ResolvedValue(value, event.document, event.event_id, history)
            entry.absences = [a for a in entry.absences if a.name not in incoming.values]
            entry.unreadable = [u for u in entry.unreadable if u.name not in incoming.values]
            for absence in incoming.absences:
                entry.absences.append(absence)
                entry.values.pop(absence.name, None)
            for unread in incoming.unreadable:
                entry.unreadable.append(unread)
                entry.values.pop(unread.name, None)

    library = SpecLibrary(events=[e.event_id for e in events], documents=documents)
    for document, entries in per_document.items():
        for entry in entries.values():
            subject = library.subjects.get(entry.subject)
            if subject is None:
                subject = LibrarySubject(entry.subject, entry.subject_kind)
                library.subjects[entry.subject] = subject
            if document not in subject.documents:
                subject.documents.append(document)
            for name, value in entry.values.items():
                if name in subject.values:
                    raise ValueError(
                        f"subject {entry.subject!r} value {name!r} is supplied by both "
                        f"{subject.values[name].document!r} and {document!r}"
                    )
                subject.values[name] = provenance[document][f"{entry.subject}:{name}"]
            subject.absences.extend({**a.as_dict(), "from_document": document} for a in entry.absences)
            subject.unreadable.extend({**u.as_dict(), "from_document": document} for u in entry.unreadable)
    return library


# ---------------------------------------------------------------------------
# The intake queue
# ---------------------------------------------------------------------------


@dataclass
class IntakeRow:
    """One document to acquire or read, and what reading it unblocks."""

    rank: int
    document: str                         # how a human names it, e.g. "MS9363"
    kind: str                             # NAS/MS standard | MIL standard | Joby part drawing | ...
    in_pile: bool                         # is the file in data/inbox/specs/ at all?
    unblocks: str
    stacks: List[str] = field(default_factory=list)
    pile_filename: Optional[str] = None   # the exact filename, when it is in the pile
    closes: List[str] = field(default_factory=list)  # library subjects that mark it done
    note: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "IntakeRow":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class IntakeQueue:
    """The spec-library intake queue as tracked state.

    It started life as a markdown table in a session lesson, which meant "which
    document closes which gap" was answerable only by lesson archaeology. Here
    the answer is a query, and ``status`` is **derived** -- a row cannot claim
    to be entered while the library holds nothing it promised.
    """

    rows: List[IntakeRow] = field(default_factory=list)
    description: Optional[str] = None

    @classmethod
    def load(cls, path: str | Path) -> "IntakeQueue":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        if data.get("schema") != SCHEMA_INTAKE:
            raise ValueError(f"{path}: expected schema {SCHEMA_INTAKE!r}, got {data.get('schema')!r}")
        rows = [IntakeRow.from_dict(r) for r in data["rows"]]
        ranks = [r.rank for r in rows]
        if len(set(ranks)) != len(ranks):
            raise ValueError(f"{path}: duplicate ranks in the intake queue")
        return cls(rows=sorted(rows, key=lambda r: r.rank), description=data.get("description"))

    def row(self, document: str) -> IntakeRow:
        for row in self.rows:
            if row.document == document:
                return row
        raise KeyError(f"intake queue has no row for {document!r}")

    def status(self, row: IntakeRow, library: SpecLibrary) -> str:
        """``entered`` / ``in pile`` / ``missing``.

        ``entered`` requires every subject the row promised to close to be in
        the library. A row that names no subjects falls back to "some event
        exists for this file" -- weaker, and only right for a row whose whole
        content is a document.
        """
        if row.closes:
            if all(library.has_subject(s) for s in row.closes):
                return "entered"
        elif row.pile_filename and row.pile_filename in library.documents:
            return "entered"
        return "in pile" if row.in_pile else "missing"

    def state(self, library: SpecLibrary) -> Dict[str, str]:
        return {row.document: self.status(row, library) for row in self.rows}

    def blocking(self, library: SpecLibrary, stack: Optional[str] = None) -> List[IntakeRow]:
        """Rows not yet entered, in rank order; optionally for one stack."""
        return [
            row
            for row in self.rows
            if self.status(row, library) != "entered" and (stack is None or stack in row.stacks)
        ]


# ---------------------------------------------------------------------------
# Rebuild
# ---------------------------------------------------------------------------
#
# ``data/projections/spec_library/`` is **one directory shared by every live
# worktree** -- ``data/`` exists only in the main checkout -- and this is the
# third writer into ``data/projections/`` (with the two viewer builders). It was
# the only one that could not be pointed at the main checkout and the only one
# whose output carried no provenance at all
# (``docs/issues/ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md``).
# So: ``--data-root``, plus the same stamp and ancestry gate the viewer builders
# use, out of ``scripts/projection_provenance.py``.
#
# **Why the file exists at all**, which was the design question this handoff had
# to answer before stamping anything (``spec_library_projection_provenance``,
# 2026-08-12). The projection is a pure function of committed events, so a
# consumer could fold it in process and the shared file -- and its whole hazard
# class -- would simply not exist. That is already how every *code* consumer
# works: nothing in this repo reads ``library.json``, and the tests resolve
# through ``build_library(load_events(...))``. Converting them is therefore a
# no-op. What the file uniquely serves is a **reader** -- the agent who has to
# turn ``library_ref: "spec_library:NAS6403U11D"`` into numbers, and who would
# otherwise fold three events (with corrections and supersession) by hand. That
# reader is exactly the path a stale value launders into a stack wearing
# ``confidence: "traced"``, and deleting the file does not remove them; it sends
# them to a worse surface. Hence: keep it, and stamp it.

REPO_ROOT = Path(__file__).resolve().parent.parent
EVENTS_DIR = REPO_ROOT / "docs" / "spec_library" / "events"
INTAKE_PATH = REPO_ROOT / "docs" / "spec_library" / "intake_queue.json"
#: Under a ``--data-root``. The default data root stays this tree's own ``data/``,
#: which is what every existing caller got.
PROJECTION_SUBDIR = Path("projections") / "spec_library"
PROJECTION_DIR = REPO_ROOT / "data" / PROJECTION_SUBDIR
LIBRARY_NAME = "library.json"

BUILT_BY = "tolerance_stack/spec_library.py"


def _provenance():
    """``scripts/projection_provenance.py``, imported lazily.

    Lazily and by path because ``scripts/`` is not a package and this module is
    imported by everything: a ``sys.path`` edit at import time would follow every
    ``from tolerance_stack import ...`` in the repo, and ``build_library`` has no
    business needing git. Only the two functions that write the shared file do.
    """
    scripts = str(REPO_ROOT / "scripts")
    if scripts not in sys.path:
        sys.path.insert(0, scripts)
    import projection_provenance

    return projection_provenance


def rebuild(
    events_dir: Path = EVENTS_DIR,
    out_dir: Path = PROJECTION_DIR,
    *,
    allow_older: bool = False,
) -> Path:
    """Wipe and rebuild ``<data-root>/projections/spec_library/library.json``.

    The projection is derived and gitignored: the events are the artifact worth
    committing. Deleting the output directory is always safe.

    The written file carries a ``provenance`` block naming the tree that built it
    (branch, HEAD sha, dirty, ``events_dir`` resolved **absolute**), and this
    function **refuses** -- :class:`projection_provenance.RebuildRefused` -- to
    overwrite a file built from a commit that is not an ancestor of this tree's
    HEAD, unless ``allow_older``. The gate lives here rather than in :func:`main`
    so that a direct caller of ``rebuild()`` is gated too; it is the function
    that writes the shared file.

    Everything else about the output is unchanged, and deliberately: the fold is
    a pure function of the event log, so a rebuild differs from the previous one
    only in the provenance block.
    """
    prov = _provenance()
    out_dir = Path(out_dir)
    out_path = out_dir / LIBRARY_NAME
    # `events_dir`, not `--data-root`: the stamp answers *which tree built this*,
    # and the data root is the main checkout's for every worktree that writes
    # here. The events dir is this tree's committed input, resolved absolute.
    provenance = prov.stamp(REPO_ROOT, Path(events_dir), BUILT_BY, source_key="events_dir")
    rebuild_command = f"python -m tolerance_stack --data-root {out_dir.parents[1]}"

    # Gate before the fold, not before the write: a refusal after the work is
    # done is still correct and still reads as a crash.
    for line in prov.guard(out_path, provenance, REPO_ROOT, allow_older, rebuild_command):
        print(f"note: {line}", file=sys.stderr)
    for line in prov.note_lines(provenance):
        print(line, file=sys.stderr)

    library = build_library(load_events(events_dir))
    data = library.as_dict()
    # Provenance second, right under `schema`, so it is the first thing a reader
    # of a 60 kB file sees. Every other key keeps its name, its order and its
    # bytes -- a stamped rebuild differs from the unstamped file this replaces by
    # exactly this one block.
    stamped = {"schema": data["schema"], prov.PROVENANCE_KEY: provenance}
    stamped.update({k: v for k, v in data.items() if k != "schema"})

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(stamped, indent=2) + "\n", encoding="utf-8")
    return out_path


def main(argv: Optional[List[str]] = None) -> int:
    prov = _provenance()
    ap = argparse.ArgumentParser(
        prog="python -m tolerance_stack",
        description="Rebuild the spec-library projection from the committed event log.",
    )
    ap.add_argument(
        "--data-root",
        default=str(REPO_ROOT / "data"),
        help="repo data/ dir (the MAIN checkout's, if you are in a worktree -- "
        "a worktree's own data/ is deleted at cleanup)",
    )
    ap.add_argument(
        "--allow-older-tree",
        action="store_true",
        help="overwrite a projection built from a tree this one does not contain "
        "(the gate refuses by default -- see scripts/projection_provenance.py)",
    )
    args = ap.parse_args(argv)

    out_dir = Path(args.data_root) / PROJECTION_SUBDIR
    try:
        out = rebuild(EVENTS_DIR, out_dir, allow_older=args.allow_older_tree)
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3

    library = build_library(load_events(EVENTS_DIR))
    queue = IntakeQueue.load(INTAKE_PATH)
    print(f"wrote {out}")
    print(f"  {len(library.subjects)} subject(s) from {len(library.events)} event(s)")
    for document, status in queue.state(library).items():
        print(f"  {status:>9}  {document}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
