"""Stack definition shapes + the worst-case / RSS fold.

One primitive does all the arithmetic: :func:`fold` takes a list of
:class:`Term` (an element, a sign, and an optional positive coefficient) and
returns an :class:`Interval`. Both a *path* through the joint ("bore min grip
length") and a *check* ("fastener grip minus that path") are just term lists with
different signs, so there is exactly one place where min/max/RSS logic lives.

``Term.coefficient`` was added 2026-08-05 (handoff ``hub_bearing_thermal_stack``)
so that a *diametral thermal fit* could use this same one fold: a diameter is
twice a wall, an isothermal soak scales a diameter by ``1 + dT * alpha``, and a
stiffness ratio splits an interference across two members. Those are weights on
term entries, not a second way to combine element values -- so the fold stayed
the only place, and every previously authored stack folds to the same numbers
because the default weight is the ``+-1`` it always was.

Material condition vs. min/max
------------------------------
LMC/MMC are *material* conditions, not lengths: for an additive element MMC is
the longest, but for a subtracted feature (a chamfer, a relief) MMC is the
*smallest* size. Rather than re-deriving that at fold time, every element
carries explicit ``min``/``max`` **lengths** -- and keeps the ``lmc``/``mmc``
values as transcribed, so the worksheet can be checked against Jeff's sheet
column-for-column.

``nominal`` is likewise kept as transcribed and is *not* assumed to be the
midpoint: Jeff's sheet has several elements where it is not (the thread
transition's "nominal" is really its maximum). RSS is therefore reported around
the midpoint, with the nominal-vs-midpoint gap left visible.

What RSS here does and does not claim (noted by review)
-------------------------------------------------------
:func:`fold` combines every term's half-range in quadrature about the midpoint
sum. That treats each band as an independent, symmetric, equal-confidence
manufacturing variation. Two element kinds in these stacks are not that:

* ``role="allowance"`` (the thread transition, min 0 / max 1.5875) is a
  deterministic geometric bias, not a variate. RSS re-centers it at 0.794, which
  is why ``shank_out__14_thick`` reads nominal −0.7153 but RSS center −0.077 —
  0.638 of that shift is the re-centering alone, not statistics.
* one-sided bands (the spherical bearing, −0.05/−0) are not symmetric about
  their midpoint.

So the RSS columns are a *relative* softening indicator, not a defensible
probability statement, and they are not directly comparable to the worst-case
columns. Verdicts deliberately never read RSS (see :meth:`CheckResult.verdict`).
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

SCHEMA_STACK = "joby.tolerance_stack/stack_definition/v0"
SCHEMA_HARDWARE = "joby.tolerance_stack/hardware_entry/v0"
SCHEMA_CHECK = "joby.tolerance_stack/check_result/v0"


# ---------------------------------------------------------------------------
# Source references
# ---------------------------------------------------------------------------


SHA256_HEX_LEN = 64

EXPORT_STATUSES = ("established", "unestablished")


@dataclass(frozen=True)
class SourceExport:
    """*Which export* of the cited document was read -- the file, by its bytes.

    A drawing number and a printed zone are not an address. ``217755`` has six
    exports on disk and a printed zone is **not stable between exports of the
    same revision**: DETAIL B of sheet 4 prints at ``I6`` on the 2026-JUL-23 POST
    export and at ``H3`` on the 2026-AUG-3 one, same revision, both citations
    correct for their own file. So a citation that names no export names a
    location on *some* PDF, and neither a tool nor a human can re-find it without
    guessing -- and a guess renders the wrong revision's geometry while looking
    perfectly correct. Added 2026-08-06 by handoff ``citation_export_provenance``.

    Identity is ``sha256``, not the filename and not the ``runs``. Filenames get
    re-used (Jeff re-exports over them); one export legitimately feeds several
    drawing-checker runs (``[PRELIM 2026-AUG-3] 217755`` feeds two) and some feed
    **none at all** (the five hub-bearing part drawings were read straight off
    the PDF -- no run exists for any of them), so a run id can never be an
    export's identity. Only the bytes can.

    Two statuses, and the difference is the whole point:

    * ``established`` -- ``pdf`` and ``sha256`` are both required. ``runs`` lists
      the drawing-checker run ids whose recorded input sha256 equals this one:
      corroboration and a pointer to extracted JSON, never the identity.
    * ``unestablished`` -- ``why`` is required and ``pdf``/``sha256``/``runs``
      must stay empty. **An unresolvable citation is honest; a wrong one is
      not**, so there is a first-class way to say "the export cannot be
      established" and it is enforced here rather than left to prose:
      constructing an ``unestablished`` export that also carries a concrete
      ``pdf`` or ``sha256`` raises.

    This is a **sibling** of ``element_id``/``run_id``, not a filling-in of them.
    Those two remain the *feature-identity* slot -- a stable extracted-element
    address that makes a human zone reading unnecessary -- and their ``run_id``
    means "the run that produced the extracted element", a different claim from
    "the run that consumed the PDF I read by eye". Overloading it would also
    destroy the "not yet wired" vs "wired to nothing" signal a test pins. See
    ``docs/sessions/lessons/LESSONS_20260806_citation_export_provenance.md``.
    """

    status: str                      # established | unestablished
    pdf: Optional[str] = None        # path as cited: repo-relative for this repo's
                                     # data/, absolute for drawing-checker's
    sha256: Optional[str] = None     # 64 hex chars -- the export's identity
    runs: Sequence[str] = ()         # drawing-checker run ids with this input sha
    why: Optional[str] = None        # required when unestablished
    note: Optional[str] = None       # how the export was established

    def __post_init__(self) -> None:
        if self.status not in EXPORT_STATUSES:
            raise ValueError(
                f"export status must be one of {EXPORT_STATUSES}, got {self.status!r}")
        if self.status == "established":
            if not self.pdf:
                raise ValueError("an established export must name a pdf")
            sha = (self.sha256 or "").lower()
            if len(sha) != SHA256_HEX_LEN or any(c not in "0123456789abcdef" for c in sha):
                raise ValueError(
                    f"an established export must carry a {SHA256_HEX_LEN}-hex sha256, "
                    f"got {self.sha256!r}")
        else:
            # The guard this class exists for: no unestablished export ever
            # carries a concrete one's fields.
            for name in ("pdf", "sha256"):
                if getattr(self, name):
                    raise ValueError(
                        f"an unestablished export must not name a {name} -- "
                        f"say why it cannot be established instead")
            if list(self.runs):
                raise ValueError("an unestablished export must not name runs")
            if not self.why:
                raise ValueError("an unestablished export must say why")

    @property
    def established(self) -> bool:
        return self.status == "established"

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SourceExport":
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        known["runs"] = tuple(known.get("runs") or ())
        return cls(**known)


@dataclass(frozen=True)
class SourceRef:
    """Where a value came from.

    The drawing coordinates (``document``/``sheet``/``zone``) are the minimum a
    human needs to re-find the value **on a named export** -- see
    :class:`SourceExport`, which every ``drawing``/``parts_list`` citation
    carries. ``element_id`` + ``run_id`` are the slot for feature identity: once
    extraction addresses a dimension stably, a stack element cites the extracted
    element instead of a human reading, and a re-exported drawing can re-run the
    stack with no re-transcription. Slice 1 leaves them ``None`` everywhere --
    the door is open, nothing walks through it yet.
    """

    # spec = a file in data/inbox/specs/ (document = filename, sheet = page);
    # added by handoff pitch_link_stack, which is the first stack to cite one.
    kind: str                       # drawing | parts_list | workbook | spec | pipeline_element | assumed
    document: Optional[str] = None  # drawing number, workbook filename, ...
    revision: Optional[str] = None
    sheet: Optional[Any] = None     # int sheet number, or a workbook sheet name
    zone: Optional[str] = None      # printed drawing zone, e.g. "B4"
    view: Optional[str] = None      # e.g. "DETAIL B", "SECTION A-A"
    cell: Optional[str] = None      # workbook cell, e.g. "E7"
    callout: Optional[str] = None   # the text as it reads on the drawing
    # which export of `document` was read -- mandatory for drawing/parts_list,
    # optional for spec (the pile is append-only, so a filename is bytes).
    export: Optional[SourceExport] = None
    element_id: Optional[str] = None  # future: stable extracted-element address
    run_id: Optional[str] = None      # future: pipeline run that produced it
    confidence: str = "untraced"    # traced | inferred | untraced
    note: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SourceRef":
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        export = known.get("export")
        if isinstance(export, dict):
            known["export"] = SourceExport.from_dict(export)
        return cls(**known)


# ---------------------------------------------------------------------------
# Elements
# ---------------------------------------------------------------------------


@dataclass
class StackElement:
    """One ordered element of the joint."""

    id: str
    name: str
    # nut_geometry = transcribed but deliberately not folded in (the castellated-nut
    # caveat); the seeded take-2 uses it three times and this comment omitted it.
    role: str                        # bushing | bearing | washer | clamped_member | relief | fastener | allowance | nut_geometry
    nominal: float
    min: float
    max: float
    lmc: Optional[float] = None      # as transcribed, for column-for-column checking
    mmc: Optional[float] = None
    plus_minus: Optional[float] = None
    hardware_ref: Optional[str] = None   # id in the hardware entries file
    source_ref: Optional[SourceRef] = None
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.min > self.max:
            raise ValueError(f"element {self.id!r}: min {self.min} > max {self.max}")

    @property
    def mid(self) -> float:
        return (self.min + self.max) / 2.0

    @property
    def half_range(self) -> float:
        return (self.max - self.min) / 2.0

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "StackElement":
        d = dict(d)
        src = d.pop("source_ref", None)
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(source_ref=SourceRef.from_dict(src) if src else None, **known)


@dataclass(frozen=True)
class Term:
    """An element, the sign it enters with, and an optional scale on that entry.

    ``sign`` is still exactly ``+1`` or ``-1`` and is still where direction
    lives: it is the field a reviewer reads term-by-term against the physical
    direction of the feature.

    ``coefficient`` is a **positive** magnitude, default ``1.0``, so the
    effective weight is ``sign * coefficient`` and the direction stays legible in
    the field named for it. It exists because a fit stack needs weights that a
    grip stack never did (added 2026-08-05 by handoff
    ``hub_bearing_thermal_stack``):

    * a *diametral* term is twice a radial one -- a sleeve OD is
      ``bore + 2 x wall``, and the two walls are **one** dimension, not two
      independent ones, so ``coefficient=2`` is exact where two separate terms
      would understate the RSS half-range by a factor of sqrt(2);
    * an *isothermal soak* multiplies a diameter by ``1 + dT * alpha``, which is
      a per-term scale and nothing else;
    * an interference *redistributed* across two members by a stiffness ratio
      ``k`` enters as ``k`` and ``1 - k`` weights.

    All three would otherwise need a second place where element values get
    combined. They do not get one: see ARCHITECTURE.md, "Why one ``fold()``".
    """

    element: StackElement
    sign: int = 1
    coefficient: float = 1.0

    def __post_init__(self) -> None:
        if self.sign not in (1, -1):
            raise ValueError(f"sign must be +1 or -1, got {self.sign!r}")
        if not self.coefficient > 0:
            raise ValueError(
                f"coefficient must be > 0 (direction belongs in sign), got {self.coefficient!r}")

    @property
    def weight(self) -> float:
        """``sign * coefficient`` -- the number this term multiplies its element by."""
        return self.sign * self.coefficient


# ---------------------------------------------------------------------------
# The fold
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Interval:
    """The result of folding a term list."""

    nominal: float          # sum of sign * as-transcribed nominal
    min: float              # worst-case minimum
    max: float              # worst-case maximum
    rss_center: float       # sum of sign * element midpoint
    rss_half: float         # sqrt(sum of half-ranges squared)

    @property
    def worst_case_half(self) -> float:
        return (self.max - self.min) / 2.0

    @property
    def rss_min(self) -> float:
        return self.rss_center - self.rss_half

    @property
    def rss_max(self) -> float:
        return self.rss_center + self.rss_half

    def as_dict(self) -> Dict[str, float]:
        return {
            "nominal": self.nominal,
            "worst_case_min": self.min,
            "worst_case_max": self.max,
            "worst_case_half": self.worst_case_half,
            "rss_center": self.rss_center,
            "rss_half": self.rss_half,
            "rss_min": self.rss_min,
            "rss_max": self.rss_max,
        }


def fold(terms: Iterable[Term]) -> Interval:
    """Worst-case and RSS fold of a signed, optionally weighted term list.

    **The only place element values are combined.** Worst case is the arithmetic
    extreme: a term entering with a positive weight contributes its ``max`` to
    the maximum and its ``min`` to the minimum; with a negative weight the roles
    swap. RSS combines half-ranges in quadrature about the midpoint sum -- the
    *sign* does not matter to the half-range, only to the center, but the
    *coefficient* magnitude does, because scaling a variate scales its spread.

    A ``Term``'s weight is ``sign * coefficient`` and defaults to the ``+-1`` this
    function has always used, so every stack authored before coefficients existed
    folds to the same numbers.
    """
    terms = list(terms)
    if not terms:
        return Interval(0.0, 0.0, 0.0, 0.0, 0.0)
    nominal = sum(t.weight * t.element.nominal for t in terms)
    lo = sum(t.weight * (t.element.min if t.weight > 0 else t.element.max) for t in terms)
    hi = sum(t.weight * (t.element.max if t.weight > 0 else t.element.min) for t in terms)
    center = sum(t.weight * t.element.mid for t in terms)
    half = math.sqrt(sum((t.coefficient * t.element.half_range) ** 2 for t in terms))
    return Interval(nominal, lo, hi, center, half)


# ---------------------------------------------------------------------------
# Check results
# ---------------------------------------------------------------------------


@dataclass
class CheckResult:
    """A grip-length outcome for one configuration."""

    check_id: str
    label: str
    configuration: Dict[str, str]
    interval: Interval
    criterion: str = ">= 0"
    units: str = "mm"
    guidance: Optional[str] = None

    @property
    def verdict(self) -> str:
        """``pass`` / ``fail`` / ``marginal`` against ``criterion``.

        ``marginal`` is the honest answer when nominal satisfies the criterion
        but worst case does not: no single build is guaranteed, so the joint
        needs assembly-time selection rather than a clean analytical answer.
        """
        if self.criterion != ">= 0":
            raise NotImplementedError(f"criterion {self.criterion!r} not supported")
        if self.interval.min >= 0:
            return "pass"
        if self.interval.nominal >= 0:
            return "marginal"
        return "fail"

    def as_dict(self) -> Dict[str, Any]:
        return {
            "schema": SCHEMA_CHECK,
            "check_id": self.check_id,
            "label": self.label,
            "configuration": self.configuration,
            "criterion": self.criterion,
            "units": self.units,
            "verdict": self.verdict,
            "guidance": self.guidance,
            **self.interval.as_dict(),
        }


# ---------------------------------------------------------------------------
# Stack definition
# ---------------------------------------------------------------------------


@dataclass
class StackDefinition:
    """An ordered joint plus the named paths and checks defined over it."""

    id: str
    title: str
    units: str
    elements: List[StackElement]
    paths: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    checks: List[Dict[str, Any]] = field(default_factory=list)
    joint: Dict[str, Any] = field(default_factory=dict)
    provenance: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._by_id = {e.id: e for e in self.elements}
        if len(self._by_id) != len(self.elements):
            raise ValueError(f"stack {self.id!r} has duplicate element ids")

    def element(self, element_id: str) -> StackElement:
        try:
            return self._by_id[element_id]
        except KeyError:
            raise KeyError(f"stack {self.id!r} has no element {element_id!r}") from None

    def terms(self, spec: Sequence[Dict[str, Any]]) -> List[Term]:
        """Turn a JSON term list into Terms.

        ``[{"element": id, "sign": -1, "coefficient": 2}, ...]``; ``sign`` defaults
        to ``+1`` and ``coefficient`` to ``1.0``.
        """
        return [
            Term(self.element(t["element"]), int(t.get("sign", 1)),
                 float(t.get("coefficient", 1.0)))
            for t in spec
        ]

    def path(self, path_id: str) -> Interval:
        try:
            spec = self.paths[path_id]
        except KeyError:
            raise KeyError(f"stack {self.id!r} has no path {path_id!r}") from None
        return fold(self.terms(spec["terms"]))

    def check(self, check_id: str) -> CheckResult:
        """Evaluate one check.

        A check's ``terms`` may reference a ``path`` instead of an ``element``;
        a path term expands to that path's own terms with the signs multiplied
        and the coefficients multiplied through, so nesting never changes the
        arithmetic.
        """
        for spec in self.checks:
            if spec["check_id"] == check_id:
                break
        else:
            raise KeyError(f"stack {self.id!r} has no check {check_id!r}")
        return CheckResult(
            check_id=spec["check_id"],
            label=spec.get("label", spec["check_id"]),
            configuration=spec.get("configuration", {}),
            interval=fold(self._expand(spec["terms"])),
            criterion=spec.get("criterion", ">= 0"),
            units=self.units,
            guidance=spec.get("guidance"),
        )

    def all_checks(self) -> List[CheckResult]:
        return [self.check(c["check_id"]) for c in self.checks]

    def _expand(self, spec: Sequence[Dict[str, Any]]) -> List[Term]:
        out: List[Term] = []
        for t in spec:
            sign = int(t.get("sign", 1))
            coefficient = float(t.get("coefficient", 1.0))
            if "path" in t:
                inner = self.paths[t["path"]]["terms"]
                out.extend(
                    Term(term.element, term.sign * sign, term.coefficient * coefficient)
                    for term in self._expand(inner)
                )
            else:
                out.append(Term(self.element(t["element"]), sign, coefficient))
        return out


def load_stack(path: str | Path) -> StackDefinition:
    """Load a stack-definition JSON file."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("schema") != SCHEMA_STACK:
        raise ValueError(f"{path}: expected schema {SCHEMA_STACK!r}, got {data.get('schema')!r}")
    return StackDefinition(
        id=data["id"],
        title=data["title"],
        units=data["units"],
        elements=[StackElement.from_dict(e) for e in data["elements"]],
        paths={p["id"]: p for p in data.get("paths", [])},
        checks=data.get("checks", []),
        joint=data.get("joint", {}),
        provenance=data.get("provenance", {}),
        notes=data.get("notes", []),
    )
