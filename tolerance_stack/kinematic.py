"""A **kinematic study**: a published sweep's Jacobian, folded as tolerance sensitivities.

Added 2026-10-16 by handoff ``a_kinematic_study_folds_the_sweeps_jacobian``.
The topology archetype (:mod:`tolerance_stack.topology`) answers "what does
this human-lassoed chain total"; it is fenced *not a solver*, and the fence is
right for a clamped stack. A mechanism is different: its parallel paths are
settled kinematically, by a solver, and that solver lives in another repo
(``C:\\workspace\\linkage``). Since 2026-10-15 its published runs carry, at every
sweep point, the derivative of every measure with respect to every geometry
parameter -- ``sensitivity.by_measure`` in a ``linkage-sweep/v1`` artifact. A
derivative of the output with respect to one input is exactly what a
``Term.coefficient`` is. So this module reads that table as a **cited
coefficient source** and folds it.

What a kinematic study is, and what it is not
---------------------------------------------

A ``joby.tolerance_stack/kinematic_study/v0`` document names one published
sweep (by ``run_id``), one of its measures, and a list of **contributors**: a
topology edge, the linkage parameter labels that edge's tolerance perturbs, a
**zone** (the shape of the tolerance), and where the zone's size comes from.
At every sweep point each contributor becomes one :class:`~tolerance_stack.stack.Term`
and the point's terms go through the one :func:`~tolerance_stack.stack.fold`.

* **It is not a chain.** There is no ``selection``, no ``traverse()``, no
  endpoints: the solver already decided how the contributors combine
  kinematically, and its answer *is* the Jacobian row. Nothing here walks a
  graph. A contributor names a topology edge so a reader (and the annotation
  surface) knows which physical dimension is meant -- not to be traversed.
* **It is not a solver.** Nothing here solves, differentiates or perturbs a
  mechanism. It reads a cited artifact, and a sensitivity it cannot find is a
  refusal, never an estimate. ``docs/DAG_TOPOLOGY.md``'s "Not a solver" fence is
  untouched, and ``topology.py``'s ``traverse``/``summarize``/``check_study`` are
  not called from here.

The three zones, and why each is one ``Term``
---------------------------------------------

Each contributor's band is a :class:`~tolerance_stack.topology.Dimension` about a
nominal of ``0.0`` -- variation only, the pitch-system studies' convention -- because
the nominal geometry is the sweep's own and the study asks how far the measure
moves *from* it. The Jacobian entries for the zone's parameters at one point are
``J = (J_1, ..., J_k)`` (output unit per parameter unit):

* ``band`` -- one parameter, a half-width along it. ``sign`` is the sign of
  ``J``, ``coefficient`` is ``|J|``: the contribution is ``J * delta`` with
  ``delta`` anywhere in the band, which is a ``Term`` with weight ``J`` exactly.
* ``sphere`` -- a point's three coordinates, a radius ``r``: the point may sit
  anywhere in a ball. The worst the measure can move over that ball is
  ``r * ||J||`` (the support function of a ball of radius ``r`` in the direction
  ``J``; Cauchy-Schwarz, attained at the worst azimuth ``J / ||J||``). So the
  coefficient is the **Euclidean norm** of the entries and ``sign`` is ``+1``:
  the zone is symmetric, so which way is "positive" is not a fact it has.
* ``disk`` -- two tilt components, a radius: the same closed form in two
  dimensions. Allowed by the schema; the first study does not need it.

The norm is a **coefficient, not a combination of element values**: it maps one
zone to one ``Term`` and never adds two contributors together. Summing
contributions happens in ``fold()`` and nowhere else, and this module declares
no exception of its own -- ``tests/test_kinematic.py`` runs the same combining
walker that holds ``thermal.py`` to the declared exception list over this file
and requires it to find nothing.

```claim
metric: one_fold_rule
exceptions: workbook_corner
```

RSS over a sphere's single ``Term`` is the same honest approximation as anywhere
else in this repo (ARCHITECTURE.md, "What RSS here does and does not claim"): the
zone's worst azimuth is treated as one variate of half-range ``r * ||J||``.

Cite or gap, unchanged
----------------------

A contributor's band either references a topology edge's ``dimension``
(``dimension_ref: {"topology", "edge"}``, resolved at load time with its
``source_ref`` and confidence carried unchanged -- no number is copied, the L1
proof pattern) or carries an inline ``dimension`` with its own ``source_ref``.
A contributor with neither, or whose referenced edge carries no dimension, is a
**gap row**: it shows its sensitivity (the Jacobian is real) and contributes no
term, and the result says how many rows are gaps. Nothing is invented.

Which feature a label is
------------------------

The sweep's parameter labels are linkage-internal spellings
(``pitch_link.point_a[2]``). Each contributor authors which topology node or
edge its labels are (``feature``), because the artifact did not say until the
sibling linkage handoff ``geometry_parameters_name_their_topology_feature``
added ``geometry.features[]``. When the artifact carries that list it is read;
when it does not, the authored join is used; when both exist and disagree, the
study refuses to load, naming the label. Labels are matched exactly as the
artifact spells them -- a label the artifact lacks is a load-time refusal.

What unit a band must be in
---------------------------

A Jacobian entry is (measure unit) per (parameter unit), so a band scales it
correctly only in the parameter's own unit. The artifact declares none for its
geometry, so each label is read as one of :data:`PARAMETER_KINDS` -- a length
(mm), a direction component (a tilt, rad) or the driver (its declared unit) --
and a band whose ``band_units`` do not fit is refused at load, naming the
contributor and the label (2026-10-21; an inch band on an mm column would
otherwise fold 25.4x wrong with every test green).

Stdlib only, like its siblings.
"""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from tolerance_stack.stack import CheckResult, Interval, SourceRef, Term, fold
from tolerance_stack.topology import Dimension, Topology, load_topology

SCHEMA_KINEMATIC_STUDY = "joby.tolerance_stack/kinematic_study/v0"

#: The sweep schemas this module reads. One today; a ``/v2`` is a new word here
#: and a reading of what changed, never a silent acceptance.
SWEEP_SCHEMAS = ("linkage-sweep/v1",)

#: The shape of a contributor's tolerance. **This tuple is the definition**
#: (the house rule since ``three_field_vocabularies``): ``band`` is a half-width
#: along one parameter, ``sphere`` a radius about a point's three coordinates,
#: ``disk`` a radius over two tilt components. See the module docstring for why
#: each is exactly one ``Term``.
ZONE_KINDS = ("band", "sphere", "disk")

#: How many linkage parameters each zone spans -- checked at load, so a sphere
#: named over two coordinates is a refusal rather than a silently thinner ball.
ZONE_PARAMETER_COUNTS = {"band": 1, "sphere": 3, "disk": 2}

#: What a row of a point's contributor table is. ``term`` -- it entered the
#: fold. ``gap`` -- no band is cited anywhere, so it contributes nothing and the
#: result counts it. ``zero_sensitivity`` -- a band exists but every Jacobian
#: entry over the zone is exactly zero at this point, and ``Term`` refuses a zero
#: coefficient (direction lives in ``sign``, magnitude must be ``> 0``), so the
#: row is shown and contributes nothing, which is also the right number.
ROW_KINDS = ("term", "gap", "zero_sensitivity")

#: Where a label's feature identity was read from: the artifact's own
#: ``geometry.features[]`` when it carries one, else the study's authored join.
FEATURE_SOURCES = ("artifact", "authored")

#: Where a sweep's ``run_id`` is resolved, relative to the data root -- the same
#: directory the annotator reads (``apps/annotate/config.js``'s
#: ``linkageSweepsDir``). Gitignored, so from a worktree it is the MAIN
#: checkout's ``data/``.
LINKAGE_SWEEPS_SUBDIR = Path("inbox") / "linkage-sweeps"

#: A coordinate label's index, ``[0]``/``[1]``/``[2]``, read as the component
#: name ``geometry.features[]`` uses.
COMPONENT_NAMES = ("x", "y", "z")
_INDEXED_LABEL = re.compile(r"^(?P<base>.+)\[(?P<index>[0-9]+)\]$")

#: What a sweep parameter label IS, as far as its unit goes. A
#: ``linkage-sweep/v1`` artifact declares a unit for each measure and for the
#: driver, and none for any geometry parameter, so a band's units cannot be
#: checked against the artifact directly; they are checked against the KIND of
#: thing the label is, read off the label's own spelling
#: (``<joint>.<attribute>[<index>]``). **This tuple is the definition.**
#:
#: * ``length`` -- a point coordinate or a link length: a position, in
#:   :data:`LINKAGE_LENGTH_UNITS`.
#: * ``direction`` -- a component of a unit vector (an axis, or a joint's own
#:   ``u``/``w`` frame vector): dimensionless, and a small perturbation of one
#:   is a small TILT, so a band on it is an angle in :data:`DIRECTION_UNITS`. A
#:   clearance in mm becomes such a tilt only through a second cited value --
#:   the length it acts over -- which is why a mm band here is a refusal.
#: * ``driver`` -- the sweep's own driver parameter, in the unit the artifact's
#:   ``mechanism.driver.unit`` declares for it.
PARAMETER_KINDS = ("length", "direction", "driver")

#: Which label attributes are which kind. The driver is not here: it is
#: whichever label ``mechanism.driver.parameter`` names, whatever it is spelled.
#: An attribute in neither tuple has no known unit and a band on it is refused
#: rather than guessed at.
LENGTH_ATTRIBUTES = ("point_a", "point_b", "length")
DIRECTION_ATTRIBUTES = ("axis_a", "axis_b", "u_a", "w_a", "u_b", "w_b")

#: The unit every length-like geometry parameter of a ``linkage-sweep/v1`` run
#: is in. The artifact never states it outright; its provenance spells every
#: length it does name with an ``_mm`` suffix (``centre_world_mm``,
#: ``radius_mm``), and its P1/P2/S runs' drivers declare ``mm``. If linkage
#: ever publishes ``geometry.units[]``, that is the reading to prefer.
LINKAGE_LENGTH_UNITS = "mm"

#: The unit a band on a direction component is authored in (see
#: :data:`PARAMETER_KINDS`): a small-angle tilt, in radians, which is the
#: dimensionless change in the component itself. ``deg`` is not accepted: it
#: is the same quantity scaled by 57.3, and folding it as rad would be wrong
#: by exactly that factor.
DIRECTION_UNITS = "rad"

#: linkage's joint types, each by the residual rows a joint of that type
#: writes into a sweep's ``mechanism.row_labels`` (``<joint>.<row>``). A
#: ``linkage-sweep/v1`` artifact names its joints but never their types, and
#: the row set is what a type IS on the solver side -- so a joint's type is
#: read off its own rows, exactly, rather than guessed from its name. Every
#: row tuple is distinct, which is what makes that reading unambiguous.
#:
#: A copy of ``linkage/joints.py``'s ``TYPE`` / ``ROW_NAMES`` pairs (the
#: sibling repo); ``tests/test_kinematic.py`` re-reads that file when it is on
#: disk and fails on any difference. The annotator's sweep rail reads the two
#: tuples below through the generated JS vocabulary.
LINKAGE_JOINT_ROW_NAMES: Dict[str, Tuple[str, ...]] = {
    "spherical": ("dx", "dy", "dz"),
    "distance": ("gap",),
    "revolute": ("dx", "dy", "dz", "tilt_u", "tilt_w"),
    "cylindrical": ("tilt_u", "tilt_w", "offset_u", "offset_w"),
    "prismatic": ("tilt_u", "tilt_w", "spin", "offset_u", "offset_w"),
    "screw": ("tilt_u", "tilt_w", "offset_u", "offset_w", "lead"),
    "fixed": ("dx", "dy", "dz", "rot_u", "rot_w", "rot_axis"),
    "axial_position": ("position",),
}

#: The type names, in the order above.
LINKAGE_JOINT_TYPES: Tuple[str, ...] = tuple(LINKAGE_JOINT_ROW_NAMES)

#: The same rows as one space-joined word per type, in :data:`LINKAGE_JOINT_TYPES`
#: order -- the shape the generated JS module can carry (it renders tuples of
#: words, never a mapping). Index ``i`` here is type ``i`` there.
LINKAGE_JOINT_ROW_SIGNATURES: Tuple[str, ...] = tuple(
    " ".join(rows) for rows in LINKAGE_JOINT_ROW_NAMES.values())

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"


class KinematicStudyError(ValueError):
    """A kinematic study that cannot be resolved against its sweep or topology."""


# ---------------------------------------------------------------------------
# The sweep, as this module reads it
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Sweep:
    """The keys of one ``linkage-sweep/v1`` artifact a kinematic study reads.

    ``jacobian[measure][j][i]`` is d(measure)/d(parameter j) at sweep point
    ``i``, with ``j`` in :attr:`parameters` order -- the artifact's own layout,
    kept rather than transposed so an index here is an index there.
    ``features`` is ``{label: entry}`` from ``geometry.features[]`` when the
    artifact carries one, else ``None`` (absent, not empty: an artifact that
    declares an empty list is a different claim).
    """

    path: Path
    run_id: str
    schema: str
    pipeline_commit: Optional[str]
    parameters: Tuple[str, ...]
    measures: Tuple[str, ...]
    units: Dict[str, str]
    driver: Dict[str, Any]
    driver_values: Tuple[float, ...]
    measure_values: Dict[str, Tuple[float, ...]]
    jacobian: Dict[str, List[List[float]]]
    max_finite_difference_disagreement: Optional[float]
    features: Optional[Dict[str, Dict[str, Any]]]

    def parameter_index(self, label: str) -> int:
        try:
            return self.parameters.index(label)
        except ValueError:
            raise KinematicStudyError(
                f"sweep {self.run_id!r} has no parameter {label!r}. Labels are "
                f"matched exactly as the artifact spells them "
                f"(sensitivity.parameters, {len(self.parameters)} of them); a "
                f"label it lacks is not guessed at.") from None

    def entries(self, measure: str, labels: Sequence[str], point: int) -> Tuple[float, ...]:
        """The Jacobian entries for ``labels`` at sweep point ``point``."""
        rows = self.jacobian[measure]
        return tuple(float(rows[self.parameter_index(label)][point]) for label in labels)

    @property
    def n_points(self) -> int:
        return len(self.driver_values)


def sweep_path(data_root: str | Path, run_id: str) -> Path:
    """Where ``run_id`` lives under ``data_root``."""
    return Path(data_root) / LINKAGE_SWEEPS_SUBDIR / f"{run_id}.json"


def load_sweep(path: str | Path) -> Sweep:
    """Read and shape-check one sweep artifact.

    A missing file is a refusal naming the path -- the caller asked for a cited
    artifact, and an empty result would read as "no sensitivity", which is a
    claim about the mechanism rather than about the filesystem.
    """
    path = Path(path)
    if not path.exists():
        raise KinematicStudyError(
            f"no sweep artifact at {path}. Sweeps live under the data root's "
            f"{LINKAGE_SWEEPS_SUBDIR.as_posix()}/ (gitignored: from a worktree, "
            f"pass the MAIN checkout's data/ as the data root).")
    data = json.loads(path.read_text(encoding="utf-8"))
    schema = data.get("schema")
    if schema not in SWEEP_SCHEMAS:
        raise KinematicStudyError(
            f"{path}: sweep schema {schema!r} is not one of {SWEEP_SCHEMAS}")
    sensitivity = data.get("sensitivity") or {}
    parameters = tuple(sensitivity.get("parameters") or ())
    by_measure = sensitivity.get("by_measure") or {}
    if not parameters or not by_measure:
        raise KinematicStudyError(
            f"{path}: the artifact carries no sensitivity table "
            f"(sensitivity.parameters / sensitivity.by_measure) -- a kinematic "
            f"study reads its coefficients from there and has nothing else to "
            f"read them from")
    points = data.get("points") or []
    measures = tuple((data.get("measures") or {}).get("names") or ())
    for measure, rows in by_measure.items():
        if len(rows) != len(parameters) or any(len(r) != len(points) for r in rows):
            raise KinematicStudyError(
                f"{path}: sensitivity.by_measure[{measure!r}] is not "
                f"{len(parameters)} parameters x {len(points)} points")

    geometry = data.get("geometry") or {}
    features: Optional[Dict[str, Dict[str, Any]]] = None
    if "features" in geometry:
        names = list(geometry.get("names") or ())
        listed = list(geometry["features"] or ())
        if len(listed) != len(names):
            raise KinematicStudyError(
                f"{path}: geometry.features has {len(listed)} entries for "
                f"{len(names)} geometry.names -- it is a list parallel to them")
        features = {}
        for name, entry in zip(names, listed):
            label = entry.get("label", name)
            if label != name:
                raise KinematicStudyError(
                    f"{path}: geometry.features entry {label!r} sits where "
                    f"geometry.names has {name!r}; the two lists are parallel")
            features[label] = dict(entry)

    return Sweep(
        path=path,
        run_id=data.get("run_id"),
        schema=schema,
        pipeline_commit=data.get("pipeline_commit"),
        parameters=parameters,
        measures=measures,
        units=dict((data.get("measures") or {}).get("units") or {}),
        driver=dict((data.get("mechanism") or {}).get("driver") or {}),
        driver_values=tuple(float(p["driver_value"]) for p in points),
        measure_values={m: tuple(float(p["measures"][m]) for p in points)
                        for m in measures},
        jacobian={m: [list(map(float, r)) for r in rows]
                  for m, rows in by_measure.items()},
        max_finite_difference_disagreement=sensitivity.get(
            "max_finite_difference_disagreement"),
        features=features,
    )


# ---------------------------------------------------------------------------
# The document
# ---------------------------------------------------------------------------


@dataclass
class Contributor:
    """One toleranced dimension, its zone, and the sweep labels it perturbs.

    ``dimension`` is filled at load time (from ``dimension_ref`` or the inline
    ``dimension``) and is ``None`` exactly when this contributor is a gap row --
    ``band_source`` then says why. ``feature`` is the authored join (which
    topology node or edge the labels are); ``feature_source`` records whether the
    artifact's own ``geometry.features[]`` confirmed it. ``body`` is the id of
    the topology body the contributor's edge's part moves with
    (:meth:`~tolerance_stack.topology.Topology.body_of`), ``None`` for a gap
    edge or a topology that declares no bodies -- read off the topology at
    load, never authored here.
    """

    edge: str
    parameters: Tuple[str, ...]
    zone: str
    feature: Dict[str, Any]
    dimension_ref: Optional[Dict[str, str]] = None
    dimension: Optional[Dimension] = None
    band_units: Optional[str] = None
    band_source: Dict[str, Any] = field(default_factory=dict)
    feature_source: str = "authored"
    gap: Optional[str] = None
    note: Optional[str] = None
    body: Optional[str] = None

    def __post_init__(self) -> None:
        self.parameters = tuple(self.parameters)
        if self.zone not in ZONE_KINDS:
            raise KinematicStudyError(
                f"contributor {self.edge!r}: zone must be one of {ZONE_KINDS}, "
                f"got {self.zone!r}")
        expected = ZONE_PARAMETER_COUNTS[self.zone]
        if len(self.parameters) != expected:
            raise KinematicStudyError(
                f"contributor {self.edge!r}: a {self.zone!r} zone spans "
                f"{expected} parameter(s), got {list(self.parameters)}")
        if len(set(self.parameters)) != len(self.parameters):
            raise KinematicStudyError(
                f"contributor {self.edge!r}: parameters {list(self.parameters)} "
                f"lists a label twice")
        if self.feature_source not in FEATURE_SOURCES:
            raise KinematicStudyError(
                f"contributor {self.edge!r}: feature_source must be one of "
                f"{FEATURE_SOURCES}, got {self.feature_source!r}")

    @property
    def is_gap(self) -> bool:
        return self.dimension is None


@dataclass(frozen=True)
class Stop:
    """A named sweep point, found **by measure value**, never by index.

    ``target`` is the measure value the stop is nearest to (S461-241's -7 and
    +72, for blade pitch); the point is chosen at load by :func:`stop_index`.
    """

    id: str
    label: str
    target: float
    context_ref: Optional[Dict[str, Any]] = None


@dataclass
class KinematicStudy:
    """A ``kinematic_study/v0`` document, its bands resolved, bound to its sweep."""

    id: str
    title: str
    topology: str
    measure: str
    sweep_ref: Dict[str, str]
    contributors: List[Contributor]
    stops: List[Stop]
    description: Optional[str] = None
    checks: List[Dict[str, Any]] = field(default_factory=list)
    no_checks_reason: Optional[str] = None
    provenance: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)

    def stop(self, stop_id: str) -> Stop:
        for stop in self.stops:
            if stop.id == stop_id:
                return stop
        raise KinematicStudyError(
            f"kinematic study {self.id!r} has no stop {stop_id!r} "
            f"(it names {[s.id for s in self.stops]})")


def _component_of(label: str) -> Optional[str]:
    """``"z"`` for ``pitch_link.point_a[2]``; ``None`` for an unindexed label."""
    match = _INDEXED_LABEL.match(label)
    if not match:
        return None
    index = int(match.group("index"))
    return COMPONENT_NAMES[index] if index < len(COMPONENT_NAMES) else None


def _feature_ref(feature: Dict[str, Any]) -> Tuple[str, str]:
    """``("node", id)`` or ``("edge", id)`` -- exactly one of the two."""
    named = [(k, feature[k]) for k in ("node", "edge") if feature.get(k)]
    if len(named) != 1:
        raise KinematicStudyError(
            f"a feature names exactly one of `node`/`edge`, got {feature!r}")
    return named[0]


def _reconcile_feature(study_id: str, topology: Topology, contributor: Contributor,
                       sweep: Sweep) -> str:
    """Check the authored join against the topology and, when present, the artifact.

    Returns the :data:`FEATURE_SOURCES` word for where the identity was read.
    """
    kind, ref = _feature_ref(contributor.feature)
    try:
        topology.node(ref) if kind == "node" else topology.edge(ref)
    except KeyError:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: contributor {contributor.edge!r} says "
            f"its parameters are {kind} {ref!r}, which topology {topology.id!r} "
            f"does not declare") from None
    authored_component = contributor.feature.get("component")
    if contributor.zone == "band" and authored_component is not None:
        derived = _component_of(contributor.parameters[0])
        if derived != authored_component:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: contributor {contributor.edge!r} "
                f"authors component {authored_component!r} for label "
                f"{contributor.parameters[0]!r}, whose index says {derived!r}")

    if sweep.features is None:
        return "authored"
    for label in contributor.parameters:
        entry = sweep.features.get(label)
        if entry is None:
            continue
        disagreements = []
        if entry.get("topology") not in (None, topology.id):
            disagreements.append(f"topology {entry.get('topology')!r} vs {topology.id!r}")
        if entry.get(kind) != ref:
            theirs = next(((k, entry[k]) for k in ("node", "edge", "kind")
                           if entry.get(k)), None)
            disagreements.append(f"{theirs} vs authored ({kind!r}, {ref!r})")
        component = entry.get("component")
        if component is not None and component != _component_of(label):
            disagreements.append(
                f"component {component!r} vs the label's own {_component_of(label)!r}")
        body = contributor.feature.get("body")
        if body is not None and entry.get("body") not in (None, body):
            disagreements.append(f"body {entry.get('body')!r} vs authored {body!r}")
        if disagreements:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: sweep {sweep.run_id!r}'s "
                f"geometry.features says label {label!r} is not what contributor "
                f"{contributor.edge!r} authors it as -- " + "; ".join(disagreements)
                + ". The artifact and the study must agree on which physical "
                  "feature a sensitivity column is; refusing to fold either reading.")
    return "artifact"


def _resolve_band(study_id: str, contributor: Contributor, raw: Dict[str, Any],
                  topologies_dir: Path, topology_cache: Dict[str, Topology]) -> None:
    """Fill ``contributor.dimension`` from the ref or the inline value, or mark a gap."""
    ref = raw.get("dimension_ref")
    inline = raw.get("dimension")
    if ref is not None and inline is not None:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: contributor {contributor.edge!r} has "
            f"both a dimension_ref and an inline dimension. One band, one place "
            f"it comes from.")
    if ref is not None:
        for key in ("topology", "edge"):
            if not ref.get(key):
                raise KinematicStudyError(
                    f"kinematic study {study_id!r}: contributor "
                    f"{contributor.edge!r}: dimension_ref needs a {key!r}, got {ref!r}")
        source = _topology(ref["topology"], topologies_dir, topology_cache)
        try:
            edge = source.edge(ref["edge"])
        except KeyError:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: contributor {contributor.edge!r} "
                f"references edge {ref['edge']!r} of topology {ref['topology']!r}, "
                f"which does not declare it") from None
        contributor.dimension_ref = dict(ref)
        contributor.band_source = {"kind": "dimension_ref", **ref}
        if edge.dimension is None:
            contributor.band_source["why_gap"] = (
                f"edge {ref['edge']!r} of topology {ref['topology']!r} carries no "
                f"dimension")
            return
        contributor.dimension = edge.dimension
        contributor.band_units = source.units
    elif inline is not None:
        contributor.dimension = Dimension.from_dict(inline)
        contributor.band_units = raw.get("units")
        contributor.band_source = {"kind": "inline"}
        if contributor.dimension.source_ref is None:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: contributor {contributor.edge!r}'s "
                f"inline dimension cites no source_ref. Cite it or make it a gap.")
    else:
        if not contributor.gap:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: contributor {contributor.edge!r} "
                f"has no band (no dimension_ref, no dimension) and no `gap` saying "
                f"why. A gap row is allowed; a silent one is not.")
        contributor.band_source = {"kind": "gap"}
        return

    dim = contributor.dimension
    if dim.nominal != 0.0:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: contributor {contributor.edge!r}'s band "
            f"{dim.id!r} has nominal {dim.nominal!r}. A kinematic contributor is a "
            f"variation about the sweep's own nominal geometry, so its band is "
            f"authored about 0.0 (the pitch-system studies' convention); the nominal is "
            f"the sweep's, not the band's.")
    if contributor.zone != "band" and dim.min != -dim.max:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: contributor {contributor.edge!r} is a "
            f"{contributor.zone!r} zone, whose band is a radius, and {dim.id!r} is "
            f"not symmetric ({dim.min!r}..{dim.max!r})")


def parameter_unit(sweep: Sweep, label: str) -> Tuple[Optional[str], Optional[str]]:
    """``(kind, units)`` for one sweep parameter label -- or ``(None, None)``.

    ``kind`` is a :data:`PARAMETER_KINDS` word. ``(None, None)`` is a label
    whose attribute this module has no unit for; the caller decides what that
    means (a band on it is refused, a gap row needs no unit).
    """
    if label == sweep.driver.get("parameter"):
        return "driver", sweep.driver.get("unit")
    base = _INDEXED_LABEL.match(label)
    stem = base.group("base") if base else label
    attribute = stem.rsplit(".", 1)[-1]
    if attribute in LENGTH_ATTRIBUTES:
        return "length", LINKAGE_LENGTH_UNITS
    if attribute in DIRECTION_ATTRIBUTES:
        return "direction", DIRECTION_UNITS
    return None, None


def _check_band_units(study_id: str, contributor: Contributor, sweep: Sweep) -> None:
    """Refuse a band whose units do not fit every label it scales.

    The Jacobian column a band multiplies is (measure unit) per (label unit),
    so the band has to be in the label's unit or the ``Term`` is dimensionally
    wrong -- silently, since a plausible number comes out either way.
    """
    if contributor.dimension is None:
        return
    units = contributor.band_units
    if not units:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: contributor {contributor.edge!r}'s band "
            f"states no units. A band scales a sensitivity per unit of its "
            f"parameter, so its unit is part of the number: give the inline "
            f"dimension a `units`.")
    for label in contributor.parameters:
        kind, expected = parameter_unit(sweep, label)
        if kind is None:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: contributor {contributor.edge!r} "
                f"puts a {units!r} band on label {label!r}, and this module knows "
                f"no unit for that label (a length is one of {LENGTH_ATTRIBUTES}, "
                f"a direction component one of {DIRECTION_ATTRIBUTES}, or the "
                f"sweep's driver). Refusing rather than assuming the band fits.")
        if units == expected:
            continue
        advice = ""
        if kind == "direction":
            advice = (f" A clearance in {units} becomes a tilt only over a cited "
                      f"length (a bushing's, a guide's); cite both and author the "
                      f"band as the tilt, in {DIRECTION_UNITS}.")
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: contributor {contributor.edge!r}'s band "
            f"is in {units!r}, but label {label!r} is a {kind} parameter in "
            f"{expected!r} (sweep {sweep.run_id!r}), so the sensitivity it scales "
            f"is per {expected} and the fold would be dimensionally wrong."
            + advice)


def _topology(topology_id: str, topologies_dir: Path,
              cache: Dict[str, Topology]) -> Topology:
    if topology_id not in cache:
        path = topologies_dir / f"topology_{topology_id}.json"
        if not path.exists():
            raise KinematicStudyError(
                f"no topology {topology_id!r} at {path}")
        cache[topology_id] = load_topology(path)
    return cache[topology_id]


def load_kinematic_study(path: str | Path, data_root: str | Path,
                         topologies_dir: str | Path | None = None,
                         ) -> Tuple[KinematicStudy, Sweep]:
    """Load a kinematic study, resolve its bands and bind it to its sweep.

    Every refusal the module docstring names happens here, before any fold: a
    missing run, a measure the sweep lacks, a label the sweep lacks, a feature
    the topology lacks, an authored join the artifact contradicts, a band that
    is not variation-only, a band whose units do not fit the labels it scales.
    """
    path = Path(path)
    tdir = Path(topologies_dir) if topologies_dir is not None else TOPOLOGIES_DIR
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema") != SCHEMA_KINEMATIC_STUDY:
        raise KinematicStudyError(
            f"{path}: expected schema {SCHEMA_KINEMATIC_STUDY!r}, got "
            f"{data.get('schema')!r}")
    study_id = data["id"]
    sweep_ref = dict(data.get("sweep") or {})
    if not sweep_ref.get("run_id"):
        raise KinematicStudyError(f"{path}: `sweep.run_id` is required")
    sweep = load_sweep(sweep_path(data_root, sweep_ref["run_id"]))
    if sweep.run_id != sweep_ref["run_id"]:
        raise KinematicStudyError(
            f"{sweep.path}: the file says run_id {sweep.run_id!r}, the study asks "
            f"for {sweep_ref['run_id']!r}")
    if sweep_ref.get("schema") not in (None, sweep.schema):
        raise KinematicStudyError(
            f"kinematic study {study_id!r} expects sweep schema "
            f"{sweep_ref['schema']!r}; {sweep.path.name} is {sweep.schema!r}")

    measure = data.get("measure")
    if measure not in sweep.measures or measure not in sweep.jacobian:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: measure {measure!r} is not one of "
            f"sweep {sweep.run_id!r}'s measures with a sensitivity table "
            f"({sorted(sweep.jacobian)})")

    cache: Dict[str, Topology] = {}
    topology = _topology(data["topology"], tdir, cache)
    contributors: List[Contributor] = []
    seen = set()
    for raw in data.get("contributors") or []:
        contributor = Contributor(
            edge=raw["edge"], parameters=tuple(raw.get("parameters") or ()),
            zone=raw.get("zone"), feature=dict(raw.get("feature") or {}),
            gap=raw.get("gap"), note=raw.get("note"))
        if contributor.edge in seen:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: edge {contributor.edge!r} is a "
                f"contributor twice")
        seen.add(contributor.edge)
        try:
            edge = topology.edge(contributor.edge)
        except KeyError:
            raise KinematicStudyError(
                f"kinematic study {study_id!r}: contributor edge "
                f"{contributor.edge!r} is not an edge of topology "
                f"{topology.id!r}") from None
        body = topology.body_of(edge.part) if edge.part else None
        contributor.body = body.id if body is not None else None
        for label in contributor.parameters:
            sweep.parameter_index(label)
        contributor.feature_source = _reconcile_feature(
            study_id, topology, contributor, sweep)
        _resolve_band(study_id, contributor, raw, tdir, cache)
        _check_band_units(study_id, contributor, sweep)
        contributors.append(contributor)
    if not contributors:
        raise KinematicStudyError(f"kinematic study {study_id!r} names no contributors")

    stops = [Stop(id=s["id"], label=s.get("label", s["id"]), target=float(s["target"]),
                  context_ref=s.get("context_ref"))
             for s in data.get("stops") or []]
    study = KinematicStudy(
        id=study_id, title=data["title"], topology=topology.id, measure=measure,
        sweep_ref=sweep_ref, contributors=contributors, stops=stops,
        description=data.get("description"), checks=list(data.get("checks") or []),
        no_checks_reason=data.get("no_checks_reason"),
        provenance=dict(data.get("provenance") or {}), notes=list(data.get("notes") or []))
    if not study.checks and not study.no_checks_reason:
        raise KinematicStudyError(
            f"kinematic study {study_id!r} has no checks and no `no_checks_reason`")
    for spec in study.checks:
        stop_id = (spec.get("configuration") or {}).get("stop")
        study.stop(stop_id)          # a check is applied AT a named stop
    return study, sweep


# ---------------------------------------------------------------------------
# The arithmetic: one function builds terms, fold() combines them
# ---------------------------------------------------------------------------


def zone_coefficient(zone: str, entries: Sequence[float]) -> Tuple[int, float]:
    """``(sign, coefficient)`` for one zone's Jacobian entries at one point.

    **The only new arithmetic this module has**, and it touches no element
    value: a ``band`` is ``(sign(J), |J|)``; a ``sphere``/``disk`` is
    ``(+1, ||J||)``, the support function of a ball (module docstring). A
    coefficient of ``0.0`` is returned as such -- the caller decides that a
    zero-sensitivity zone enters no ``Term``.
    """
    if zone == "band":
        (entry,) = entries
        return (1 if entry >= 0 else -1), abs(entry)
    return 1, math.sqrt(math.fsum(e * e for e in entries))


def contributor_term(contributor: Contributor, entries: Sequence[float]) -> Optional[Term]:
    """The one ``Term`` a contributor becomes at one point -- or ``None``.

    ``None`` for a gap row (no band) and for a zone whose sensitivity is exactly
    zero here. Everything else is ``Term(band, sign, coefficient)`` with the
    band carried unchanged, so ``fold()`` reads the cited ``min``/``max``.
    """
    if contributor.dimension is None:
        return None
    sign, coefficient = zone_coefficient(contributor.zone, entries)
    if coefficient == 0.0:
        return None
    return Term(contributor.dimension, sign, coefficient)


@dataclass(frozen=True)
class ContributorRow:
    """One contributor's line in a point's ranked table."""

    contributor: Contributor
    entries: Tuple[float, ...]
    sign: int
    coefficient: float
    term: Optional[Term]

    @property
    def kind(self) -> str:
        if self.contributor.is_gap:
            return "gap"
        return "term" if self.term is not None else "zero_sensitivity"

    @property
    def magnitude(self) -> Optional[float]:
        """``coefficient x half-band``: this row's own worst-case reach, the rank key.

        ``None`` for a gap row, which has no band to scale.
        """
        dim = self.contributor.dimension
        if dim is None:
            return None
        return self.coefficient * dim.half_range

    def as_dict(self) -> Dict[str, Any]:
        c = self.contributor
        dim = c.dimension
        src: Optional[SourceRef] = dim.source_ref if dim is not None else None
        return {
            "edge": c.edge,
            "kind": self.kind,
            "parameters": list(c.parameters),
            "zone": c.zone,
            "feature": dict(c.feature),
            "feature_source": c.feature_source,
            "body": c.body,
            "entries": list(self.entries),
            "sign": self.sign,
            "coefficient": self.coefficient,
            "magnitude": self.magnitude,
            "band": None if dim is None else {
                "id": dim.id, "name": dim.name, "nominal": dim.nominal,
                "min": dim.min, "max": dim.max, "half_range": dim.half_range,
                "units": c.band_units},
            "band_source": dict(c.band_source),
            "confidence": src.confidence if src is not None else None,
            "source_kind": src.kind if src is not None else None,
            "gap": c.gap,
            "note": c.note,
        }


def rank(rows: Sequence[ContributorRow]) -> List[ContributorRow]:
    """Rows by ``magnitude`` descending; gap rows last, in document order."""
    banded = [r for r in rows if r.magnitude is not None]
    gaps = [r for r in rows if r.magnitude is None]
    return sorted(banded, key=lambda r: -r.magnitude) + gaps


@dataclass(frozen=True)
class PointResult:
    """One sweep point: the nominal measure, the fold, the ranked table."""

    index: int
    driver_value: float
    nominal: float
    interval: Interval
    rows: Tuple[ContributorRow, ...]

    @property
    def gap_count(self) -> int:
        return sum(1 for r in self.rows if r.kind == "gap")


def fold_at(study: KinematicStudy, sweep: Sweep, point: int) -> PointResult:
    """Every contributor's term at ``point``, folded once."""
    rows = []
    for contributor in study.contributors:
        entries = sweep.entries(study.measure, contributor.parameters, point)
        sign, coefficient = zone_coefficient(contributor.zone, entries)
        rows.append(ContributorRow(contributor, entries, sign, coefficient,
                                   contributor_term(contributor, entries)))
    return PointResult(
        index=point,
        driver_value=sweep.driver_values[point],
        nominal=sweep.measure_values[study.measure][point],
        interval=fold(r.term for r in rows if r.term is not None),
        rows=tuple(rank(rows)),
    )


def envelope(study: KinematicStudy, sweep: Sweep) -> List[PointResult]:
    """:func:`fold_at` at every sweep point, in the artifact's point order."""
    return [fold_at(study, sweep, i) for i in range(sweep.n_points)]


def stop_index(study: KinematicStudy, sweep: Sweep, stop_id: str) -> int:
    """The sweep point whose measure is nearest the stop's target -- by value."""
    stop = study.stop(stop_id)
    values = sweep.measure_values[study.measure]
    return min(range(len(values)), key=lambda i: abs(values[i] - stop.target))


def check_at_stop(study: KinematicStudy, sweep: Sweep, check_id: str) -> CheckResult:
    """One authored check, applied at its named stop.

    The same two shapes ``topology.check_study`` has, and the same fold: with a
    ``limit``, exactly two terms -- the limit ``+1``, the stop's own total
    ``-1`` -- through ``fold()``; without one, the stop's interval unchanged.
    Never applied to the whole sweep at once: a budget is a statement about one
    configuration, and the envelope is many.
    """
    spec = next((c for c in study.checks if c.get("check_id") == check_id), None)
    if spec is None:
        raise KinematicStudyError(f"kinematic study {study.id!r} has no check {check_id!r}")
    point = fold_at(study, sweep, stop_index(study, sweep, spec["configuration"]["stop"]))
    units = sweep.units.get(study.measure)
    limit = spec.get("limit")
    if limit is None:
        interval = point.interval
    else:
        limit_dim = Dimension(
            id=f"{check_id}__limit", name=spec.get("label", check_id),
            nominal=float(limit["value"]), min=float(limit["value"]),
            max=float(limit["value"]),
            source_ref=SourceRef.from_dict(limit["source_ref"]))
        total_dim = Dimension(
            id=f"{check_id}__stop_total", name=f"{study.id} at {point.index}",
            nominal=point.interval.nominal, min=point.interval.min,
            max=point.interval.max)
        interval = fold([Term(limit_dim, sign=1), Term(total_dim, sign=-1)])
        units = limit.get("units", units)
    return CheckResult(
        check_id=spec["check_id"],
        label=spec.get("label", spec["check_id"]),
        configuration=spec.get("configuration", {}),
        interval=interval,
        criterion=spec.get("criterion", ">= 0"),
        units=units,
        guidance=spec.get("guidance"),
        complete=bool(spec.get("complete", True)),
        excluded_terms=tuple(spec.get("excluded_terms") or ()),
    )
