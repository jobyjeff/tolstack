"""Stack definition shapes + the worst-case / RSS fold.

One primitive does all the arithmetic: :func:`fold` takes a list of
:class:`Term` (an element and a sign) and returns an :class:`Interval`. Both a
*path* through the joint ("bore min grip length") and a *check* ("fastener grip
minus that path") are just term lists with different signs, so there is exactly
one place where min/max/RSS logic lives.

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


@dataclass(frozen=True)
class SourceRef:
    """Where a value came from.

    The drawing coordinates (``document``/``sheet``/``zone``) are the minimum a
    human needs to re-find the value. ``element_id`` + ``run_id`` are the slot
    for feature identity: once extraction addresses a dimension stably, a stack
    element cites the extracted element instead of a human reading, and a
    re-exported drawing can re-run the stack with no re-transcription. Slice 1
    leaves them ``None`` everywhere -- the door is open, nothing walks through
    it yet.
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
    element_id: Optional[str] = None  # future: stable extracted-element address
    run_id: Optional[str] = None      # future: pipeline run that produced it
    confidence: str = "untraced"    # traced | inferred | untraced
    note: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SourceRef":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


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
    """An element and the sign with which it enters an expression."""

    element: StackElement
    sign: int = 1

    def __post_init__(self) -> None:
        if self.sign not in (1, -1):
            raise ValueError(f"sign must be +1 or -1, got {self.sign!r}")


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
    """Worst-case and RSS fold of a signed term list.

    Worst case is the arithmetic extreme: an element entering with ``sign=+1``
    contributes its ``max`` to the maximum and its ``min`` to the minimum; with
    ``sign=-1`` the roles swap. RSS combines half-ranges in quadrature about the
    midpoint sum -- sign does not matter to the half-range, only to the center.
    """
    terms = list(terms)
    if not terms:
        return Interval(0.0, 0.0, 0.0, 0.0, 0.0)
    nominal = sum(t.sign * t.element.nominal for t in terms)
    lo = sum(t.element.min if t.sign > 0 else -t.element.max for t in terms)
    hi = sum(t.element.max if t.sign > 0 else -t.element.min for t in terms)
    center = sum(t.sign * t.element.mid for t in terms)
    half = math.sqrt(sum(t.element.half_range ** 2 for t in terms))
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
        """Turn a JSON term list (``[{"element": id, "sign": -1}, ...]``) into Terms."""
        return [Term(self.element(t["element"]), int(t.get("sign", 1))) for t in spec]

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
        through, so nesting never changes the arithmetic.
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
            if "path" in t:
                inner = self.paths[t["path"]]["terms"]
                out.extend(Term(term.element, term.sign * sign) for term in self._expand(inner))
            else:
                out.append(Term(self.element(t["element"]), sign))
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
