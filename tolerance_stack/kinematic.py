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

A contributor may itself be a study (``study_ref``)
---------------------------------------------------

A contributor written ``{"study_ref": {"topology", "study_id", "parameter"}}``
names a **chain study** (``study/v0``) whose total moves one sweep parameter --
the travel between the end stops moves the driver, ``actuator.value``. It does
not contribute that study's folded interval. It contributes **its terms**: at
every sweep point each of the sub-study's signed terms enters this fold with
coefficient ``|J| x (the term's own ratio)`` and sign ``sign(J) x (the term's
own sign)``, ``J`` being the sweep's Jacobian entry for ``parameter`` (the chain
rule, written as terms). Worst case stays ``sum |c h|`` over the leaf terms and
RSS stays one quadrature over them -- nothing folds a fold, and this module still
declares no exception to the one-fold rule. Each leaf's band is the sub-study
edge's own cited band about its own nominal (variation only, as every
contributor here), carried with its ``source_ref`` and confidence unchanged, so a
term that is untraced there is untraced here. v0 refuses a ``study_ref`` that
names a kinematic study (no nesting). ``docs/DAG_TOPOLOGY.md``, "A kinematic
study reads its sensitivity from a published sweep".

Each stop is its own stack: the linkage there, plus the chain to its contact
------------------------------------------------------------------------------

A stop is a **contact pose**, and where the mechanism sits when it touches is
itself toleranced (Jeff, 2026-11-03, handoff ``each_stop_is_its_own_stack``,
superseding the 2026-10-29 rule that made the +72 deg stop a zero-error datum
and the stop-to-stop travel an x-interval of the -7 deg stop only). So every
stop names its own **axial stack** (``stops[].axial_stack``): a list of chain
studies (``study/v0``), each a ``study_ref`` on the sweep's **driver**, whose
terms together are where the driven part sits along the driver's axis at that
stop's contact, from the ground. At the stop:

* the stop's pitch band is one fold (:func:`fold_at_stop`): the direct
  contributors at the stop's sweep point -- the **linkage terms at this pose**,
  exactly :func:`fold_at` there -- plus every leaf of the stop's axial stack at
  ``|J| x`` its ratio, ``J`` the measure's Jacobian entry for the driver at the
  stop's nominal (first order; the chain rule written as terms, as for any
  ``study_ref``). The axial terms enter no other point's fold, and nothing is
  swept along x;
* a leaf whose edge is in another stop's stack too is **shared**: the same
  physical dimension moves both stops, so in the range between the two stops
  (:func:`range_between_stops`) it enters once, with the difference of the two
  stops' entries -- and the same holds for every linkage term;
* a ``study_ref`` on the driver anywhere else -- among ``contributors`` --
  is refused, naming that handoff, and so is the retired ``applies_to``; a
  stop with no axial stack is refused in a study that has a ``datum`` or
  whose other stops have one.

A stack entry may be a **declared gap** (``gap``, with its own ``title``): the
chain that would locate the stop is not authored yet, so it contributes no
leaves and every check at that stop is incomplete, naming it.

The **datum** (``datum.stop``) keeps one meaning only: the pose where the
sweep's driver is 0 (refused at load if it is not). It zeroes nothing.

A check at a stop is a one-sided **reach** check when it says ``bound``
(:data:`CHECK_BOUNDS`): the stop's own measure -- the sweep's nominal there
plus the fold -- must reach at least (``at_least``) or at most (``at_most``)
the limit, and the margin is the signed worst-case distance to it.

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
from tolerance_stack.topology import (
    Dimension, StudyError, Topology, load_study, load_topology, summarize)

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

#: Each linkage joint type, as the kind of contact a topology gap edge at that
#: joint is (:data:`~tolerance_stack.topology.INTERFACE_KINDS`), where the two
#: coincide -- so a sweep's joint type can suggest an edge's ``interface`` and
#: an authored value that disagrees is a test failure
#: (``tests/test_topology.py``), never two sets of words. ``None`` where no gap
#: edge stands for the joint: ``fixed`` is no contact at all, and
#: ``axial_position`` is the driver's coordinate, not a joint between parts.
#: ``distance`` is a two-force link between two ball joints, so each END is
#: ``spherical``; ``prismatic`` slides without turning and still draws as a
#: slide. Keys exactly :data:`LINKAGE_JOINT_TYPES`, in its order.
LINKAGE_JOINT_INTERFACES: Dict[str, Optional[str]] = {
    "spherical": "spherical",
    "distance": "spherical",
    "revolute": "pin_in_bore",
    "cylindrical": "cylindrical_slide",
    "prismatic": "cylindrical_slide",
    "screw": "thread",
    "fixed": None,
    "axial_position": None,
}

#: The keys a ``study_ref`` names. **This tuple is the definition.**
STUDY_REF_FIELDS = ("topology", "study_id", "parameter")

#: The fields a ``study_ref`` entry carries beside its ``study_ref`` -- a
#: contributor's, or an entry of a stop's ``axial_stack``. ``gap`` and
#: ``title`` declare a chain study that is not authored yet (both, or neither).
STUDY_REF_CONTRIBUTOR_FIELDS = ("study_ref", "gap", "title", "note")

#: The handoff that moved a driver ``study_ref`` from ``contributors`` (with
#: ``applies_to``) into each stop's ``axial_stack``; the refusal of the old
#: form names it, so an author who meets it can read why.
STOP_STACK_HANDOFF = "each_stop_is_its_own_stack"

#: Which side of its limit a reach check holds a stop's measure on.
#: **This tuple is the definition.** ``at_least`` -- the stop's worst-case
#: minimum must be >= the limit (S461-261's +70 deg at the feather stop);
#: ``at_most`` -- its worst-case maximum must be <= the limit (-5 deg at the
#: low stop). A check with a ``limit`` and no ``bound`` is a budget on the
#: stop's spread (the limit less the folded variation), the older shape.
CHECK_BOUNDS = ("at_least", "at_most")

#: The file patterns a ``study_ref``'s ``study_id`` is looked for under, in the
#: topologies directory: a chain study (what a ref may name) and a kinematic
#: study (found only to be refused by name -- v0 has no nesting).
CHAIN_STUDY_GLOB = "study_*.json"
KINEMATIC_STUDY_GLOB = "kinematic_study_*.json"

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
class SubTerm:
    """One signed term of a referenced chain study, as this study's fold reads it.

    ``dimension`` is the sub-study edge's band re-expressed as a variation about
    its own nominal (``nominal`` 0.0, ``min``/``max`` the deviations): this
    study's fold is variation only, and a sub-study's nominal is its own
    quantity's, not the sweep's. The citation and confidence ride along
    unchanged. ``source`` is the edge's band exactly as the sub-study carries it.
    """

    edge: str
    name: str
    sign: int
    ratio: float
    dimension: Dimension
    source: Dimension


@dataclass
class StudyRef:
    """A contributor that is itself a chain study, resolved against its topology.

    ``terms`` is the sub-study's chain in walk order. ``units`` is its output
    quantity's unit (checked against ``parameter``'s at load); ``completeness``
    is the sub-study's own derived completeness -- a term open there is open
    here. ``total`` is the sub-study's own published interval, kept to be shown
    beside the result and never read by an arithmetic step.

    ``stops`` names the stops whose ``axial_stack`` holds this ref (derived
    at load, never authored): such a ref is on the sweep's driver, enters
    those stops' folds and never a point's. ``gap`` is set for a declared gap
    -- a chain study not authored yet: no ``terms``, no ``total``, never
    complete.
    """

    topology: str
    study_id: str
    parameter: str
    title: str
    units: str
    terms: Tuple[SubTerm, ...]
    completeness: Dict[str, Any]
    total: Optional[Interval]
    note: Optional[str] = None
    source_file: Optional[str] = None
    stops: Tuple[str, ...] = ()
    gap: Optional[str] = None

    @property
    def in_stop_stack(self) -> bool:
        """Whether this ref is part of a stop's axial stack (it is on the driver)."""
        return bool(self.stops)


@dataclass(frozen=True)
class Stop:
    """A named sweep point, found **by measure value**, never by index.

    ``target`` is the measure value the stop is nearest to (S461-241's -7 and
    +72, for blade pitch); the point is chosen at load by :func:`stop_index`.
    ``axial_stack`` is where the driven part sits at this stop's contact: the
    chain studies on the driver, in document order (module docstring).
    """

    id: str
    label: str
    target: float
    context_ref: Optional[Dict[str, Any]] = None
    axial_stack: Tuple["StudyRef", ...] = ()


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
    study_refs: List[StudyRef] = field(default_factory=list)
    description: Optional[str] = None
    checks: List[Dict[str, Any]] = field(default_factory=list)
    no_checks_reason: Optional[str] = None
    provenance: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)
    datum: Optional[Dict[str, Any]] = None

    @property
    def point_refs(self) -> List[StudyRef]:
        """The refs folded at every point: those in no stop's axial stack."""
        return [r for r in self.study_refs if not r.in_stop_stack]

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
        _require_unit_fit(study_id, f"contributor {contributor.edge!r}",
                          units, label, sweep, "band")


def _require_unit_fit(study_id: str, subject: str, units: str, label: str,
                      sweep: Sweep, what: str) -> None:
    """Refuse ``units`` on ``label`` unless it is the unit the label is in.

    Shared by a contributor's band and a ``study_ref``'s output quantity: both
    scale a Jacobian column that is (measure unit) per (label unit).
    ``subject`` is who is being refused, ``what`` the thing in ``units``.
    """
    kind, expected = parameter_unit(sweep, label)
    if kind is None:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: {subject} puts a {units!r} {what} on "
            f"label {label!r}, and this module knows "
            f"no unit for that label (a length is one of {LENGTH_ATTRIBUTES}, "
            f"a direction component one of {DIRECTION_ATTRIBUTES}, or the "
            f"sweep's driver). Refusing rather than assuming the {what} fits.")
    if units == expected:
        return
    advice = ""
    if kind == "direction":
        advice = (f" A clearance in {units} becomes a tilt only over a cited "
                  f"length (a bushing's, a guide's); cite both and author the "
                  f"band as the tilt, in {DIRECTION_UNITS}.")
    raise KinematicStudyError(
        f"kinematic study {study_id!r}: {subject}'s {what} is in {units!r}, but "
        f"label {label!r} is a {kind} parameter in "
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


def _study_file(study_id: str, topologies_dir: Path) -> Tuple[Path, Dict[str, Any]]:
    """The one document under ``topologies_dir`` whose ``id`` is ``study_id``."""
    found = []
    for pattern in (CHAIN_STUDY_GLOB, KINEMATIC_STUDY_GLOB):
        for path in sorted(topologies_dir.glob(pattern)):
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get("id") == study_id:
                found.append((path, data))
    if len(found) != 1:
        raise KinematicStudyError(
            f"study_ref names study {study_id!r}, which is "
            + ("declared by no document" if not found
               else f"declared by {len(found)} documents")
            + f" under {topologies_dir}")
    return found[0]


def _check_ref_place(study_id: str, raw: Dict[str, Any], ref: Dict[str, Any],
                     sweep: Sweep, stop_id: Optional[str]) -> None:
    """A driver ref belongs in a stop's ``axial_stack``, every other ref among
    the contributors; ``applies_to`` is the retired spelling of the first."""
    on_driver = ref["parameter"] == sweep.driver.get("parameter")
    if "applies_to" in raw:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r} carries "
            f"`applies_to`, the form retired by handoff {STOP_STACK_HANDOFF!r}: a "
            f"chain that places a stop goes in that stop's `axial_stack`, and every "
            f"stop has one")
    if stop_id is None and on_driver:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r} is on the "
            f"sweep's driver {ref['parameter']!r}, so it says where a stop is, not a "
            f"term of every point; since handoff {STOP_STACK_HANDOFF!r} it goes in "
            f"the `axial_stack` of each stop it places")
    if stop_id is not None and not on_driver:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: stop {stop_id!r}'s axial_stack names "
            f"study_ref {ref['study_id']!r} on {ref['parameter']!r}; an axial stack "
            f"is where the driven part sits, so every entry is on the sweep's "
            f"driver {sweep.driver.get('parameter')!r}")


def _load_study_ref(study_id: str, raw: Dict[str, Any], sweep: Sweep,
                    topologies_dir: Path, cache: Dict[str, Topology],
                    stop_id: Optional[str] = None) -> StudyRef:
    """Resolve one ``study_ref`` -- a contributor, or an entry of stop
    ``stop_id``'s axial stack -- to the sub-study's signed terms."""
    ref = raw["study_ref"]
    if not isinstance(ref, dict) or any(not ref.get(k) for k in STUDY_REF_FIELDS):
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: a study_ref needs {STUDY_REF_FIELDS}, "
            f"got {ref!r}")
    extra = sorted(set(raw) - set(STUDY_REF_CONTRIBUTOR_FIELDS))
    if extra:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r} is a "
            f"contributor by itself -- it carries no edge, parameters or band of "
            f"its own; its terms are the sub-study's (it has {extra})")
    sweep.parameter_index(ref["parameter"])
    _check_ref_place(study_id, raw, ref, sweep, stop_id)
    if bool(raw.get("gap")) != bool(raw.get("title")):
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r}: a declared "
            f"gap carries both `gap` (why) and `title` (what it is), or neither")
    if raw.get("gap"):
        return _gap_study_ref(study_id, raw, ref, sweep, topologies_dir)
    path, data = _study_file(ref["study_id"], topologies_dir)
    if data.get("schema") == SCHEMA_KINEMATIC_STUDY:
        nested = any("study_ref" in c for c in data.get("contributors") or ())
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r} names a "
            f"kinematic study"
            + (", which itself holds a study_ref: nested study_refs are not "
               "supported in v0 (no nesting yet)" if nested else
               "; a study_ref names a chain study (study/v0), and v0 has no "
               "nesting of kinematic studies")
            + ".")
    if data.get("topology") != ref["topology"]:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r} says "
            f"topology {ref['topology']!r}; the study is of {data.get('topology')!r}")
    try:
        sub = load_study(path)
        result = summarize(_topology(ref["topology"], topologies_dir, cache), sub)
    except StudyError as failure:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r} does not "
            f"resolve: {failure}") from None
    _require_unit_fit(study_id, f"contributor {sub.id!r}", result.units, ref["parameter"],
                      sweep, "output unit")
    terms = tuple(
        SubTerm(edge=c.edge.id, name=c.edge.name, sign=c.sign, ratio=c.transform.ratio,
                dimension=c.dimension.about_nominal(), source=c.dimension)
        for c in result.chain)
    return StudyRef(
        topology=ref["topology"], study_id=sub.id, parameter=ref["parameter"],
        title=sub.title, units=result.units, terms=terms,
        completeness=result.completeness(), total=result.interval,
        note=raw.get("note"), source_file=path.name)


def _gap_study_ref(study_id: str, raw: Dict[str, Any], ref: Dict[str, Any],
                   sweep: Sweep, topologies_dir: Path) -> StudyRef:
    """A declared gap: the chain study a ref names is not authored yet.

    Refused once the study exists, so a gap cannot outlive the chain that
    closes it. Its unit is the parameter's own (there is no output to read
    one from), and it is never complete.
    """
    try:
        _study_file(ref["study_id"], topologies_dir)
    except KinematicStudyError:
        pass
    else:
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: study_ref {ref['study_id']!r} is declared "
            f"a gap, but a document under {topologies_dir} declares that study: "
            f"drop `gap` and `title` and let its terms enter")
    _, units = parameter_unit(sweep, ref["parameter"])
    reason = (f"declared gap -- {raw['gap']}; chain study {ref['study_id']!r} is "
              f"not authored yet")
    return StudyRef(
        topology=ref["topology"], study_id=ref["study_id"], parameter=ref["parameter"],
        title=raw["title"], units=units or "", terms=(),
        completeness={"complete": False, "reason": reason, "open_terms": []},
        total=None, note=raw.get("note"), source_file=None, gap=raw["gap"])


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
    study_refs: List[StudyRef] = []
    stops = _load_stops(study_id, data, sweep, tdir, cache, study_refs)
    contributors: List[Contributor] = []
    seen = set()
    for raw in data.get("contributors") or []:
        if "study_ref" in raw:
            study_ref = _load_study_ref(study_id, raw, sweep, tdir, cache)
            if study_ref.study_id in {r.study_id for r in study_refs}:
                raise KinematicStudyError(
                    f"kinematic study {study_id!r}: study_ref {study_ref.study_id!r} "
                    f"is a contributor twice, or a contributor and a stop's stack")
            study_refs.append(study_ref)
            continue
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
    if not contributors and not study_refs:
        raise KinematicStudyError(f"kinematic study {study_id!r} names no contributors")

    study = KinematicStudy(
        id=study_id, title=data["title"], topology=topology.id, measure=measure,
        sweep_ref=sweep_ref, contributors=contributors, stops=stops,
        study_refs=study_refs,
        description=data.get("description"), checks=list(data.get("checks") or []),
        no_checks_reason=data.get("no_checks_reason"),
        provenance=dict(data.get("provenance") or {}), notes=list(data.get("notes") or []),
        datum=dict(data["datum"]) if data.get("datum") else None)
    if study.datum is not None:
        _check_datum(study, sweep)
    if not study.checks and not study.no_checks_reason:
        raise KinematicStudyError(
            f"kinematic study {study_id!r} has no checks and no `no_checks_reason`")
    for spec in study.checks:
        stop_id = (spec.get("configuration") or {}).get("stop")
        study.stop(stop_id)          # a check is applied AT a named stop
    return study, sweep


def _load_stops(study_id: str, data: Dict[str, Any], sweep: Sweep, tdir: Path,
                cache: Dict[str, Topology], study_refs: List[StudyRef]) -> List[Stop]:
    """The stops, each with its axial stack resolved.

    A chain named by two stops' stacks is ONE :class:`StudyRef` (appended to
    ``study_refs`` once, its ``stops`` naming both): that identity is what
    makes its terms shared. Every stop has a stack, or none does in a study
    with no ``datum`` (a study of a sweep whose stops are not contacts).
    """
    by_id: Dict[str, StudyRef] = {}
    stops: List[Stop] = []
    for raw_stop in data.get("stops") or []:
        refs: List[StudyRef] = []
        for raw in raw_stop.get("axial_stack") or ():
            if not isinstance(raw, dict) or "study_ref" not in raw:
                raise KinematicStudyError(
                    f"kinematic study {study_id!r}: stop {raw_stop['id']!r}'s "
                    f"axial_stack entry {raw!r} is not a study_ref")
            ref = _load_study_ref(study_id, raw, sweep, tdir, cache, raw_stop["id"])
            if ref.study_id in {r.study_id for r in refs}:
                raise KinematicStudyError(
                    f"kinematic study {study_id!r}: stop {raw_stop['id']!r} names "
                    f"study_ref {ref.study_id!r} twice in its axial_stack")
            if ref.study_id in by_id:
                ref = by_id[ref.study_id]
            else:
                by_id[ref.study_id] = ref
                study_refs.append(ref)
            ref.stops = ref.stops + (raw_stop["id"],)
            refs.append(ref)
        stops.append(Stop(id=raw_stop["id"], label=raw_stop.get("label", raw_stop["id"]),
                          target=float(raw_stop["target"]),
                          context_ref=raw_stop.get("context_ref"), axial_stack=tuple(refs)))
    bare = [s.id for s in stops if not s.axial_stack]
    if bare and (data.get("datum") or len(bare) < len(stops)):
        raise KinematicStudyError(
            f"kinematic study {study_id!r}: stop(s) {bare} have no `axial_stack`. A "
            f"stop is a contact pose, and where the mechanism sits there is "
            f"toleranced like any other dimension (handoff {STOP_STACK_HANDOFF!r}): "
            f"name the chain to its contact face, or a declared gap")
    return stops


def _check_datum(study: KinematicStudy, sweep: Sweep) -> None:
    """``datum.stop`` is a stop, and the sweep's driver is zero there."""
    stop_id = study.datum.get("stop")
    study.stop(stop_id)
    value = sweep.driver_values[stop_index(study, sweep, stop_id)]
    if value != 0.0:
        raise KinematicStudyError(
            f"kinematic study {study.id!r}: datum stop {stop_id!r} sits at driver "
            f"{value!r} on sweep {sweep.run_id!r}; the datum is where the driver is "
            f"measured from, so it must be 0 there")


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


@dataclass(frozen=True)
class ChildRow:
    """One leaf term of a ``study_ref`` at one point: the chain rule, as a term.

    ``sign`` is ``sign(J) x`` the sub-study term's own sign and ``coefficient``
    is ``|J| x`` its own ratio -- composed here, handed to ``fold()`` as one
    :class:`~tolerance_stack.stack.Term`. ``None`` term for a zero-sensitivity
    parameter (``Term`` refuses a zero coefficient).
    """

    sub: SubTerm
    sign: int
    coefficient: float
    term: Optional[Term]

    @property
    def magnitude(self) -> float:
        return self.coefficient * self.sub.dimension.half_range

    def as_dict(self) -> Dict[str, Any]:
        dim, src = self.sub.dimension, self.sub.dimension.source_ref
        return {
            "edge": self.sub.edge, "name": self.sub.name,
            "kind": "term" if self.term is not None else "zero_sensitivity",
            "sign": self.sign, "coefficient": self.coefficient,
            "magnitude": self.magnitude, "own_sign": self.sub.sign,
            "own_ratio": self.sub.ratio,
            "band": {"id": dim.id, "name": dim.name, "nominal": dim.nominal,
                     "min": dim.min, "max": dim.max, "half_range": dim.half_range,
                     "units": None},
            "confidence": src.confidence if src is not None else None,
            "source_kind": src.kind if src is not None else None,
        }


@dataclass(frozen=True)
class GroupRow:
    """A ``study_ref``'s line in a point's table: its Jacobian entry and its leaves.

    ``reach`` is the group's worst-case reach, the sum of its leaves'
    magnitudes -- a ranking figure for the table, never an input to the fold.
    """

    ref: StudyRef
    entry: float
    sign: int
    children: Tuple[ChildRow, ...]

    @property
    def reach(self) -> float:
        return math.fsum(c.magnitude for c in self.children)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "study": self.ref.study_id, "topology": self.ref.topology,
            "title": self.ref.title, "parameter": self.ref.parameter,
            "entry": self.entry, "sign": self.sign, "reach": self.reach,
            "units": self.ref.units,
            "children": [c.as_dict() for c in self.children],
        }


def study_ref_group(ref: StudyRef, entry: float) -> GroupRow:
    """The leaf terms of ``ref`` at one point, where its parameter's Jacobian is ``entry``."""
    sign, coefficient = zone_coefficient("band", (entry,))
    children = tuple(
        ChildRow(sub, sign * sub.sign, coefficient * sub.ratio,
                 Term(sub.dimension, sign * sub.sign, coefficient * sub.ratio)
                 if coefficient > 0 else None)
        for sub in ref.terms)
    return GroupRow(ref, entry, sign, children)


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
    groups: Tuple[GroupRow, ...] = ()

    @property
    def gap_count(self) -> int:
        return sum(1 for r in self.rows if r.kind == "gap")


def fold_at(study: KinematicStudy, sweep: Sweep, point: int) -> PointResult:
    """Every contributor's term at ``point``, folded once.

    A ``study_ref`` on the driver is not among them: it moves where a stop is
    (:func:`fold_at_stop`), never the envelope.
    """
    rows = []
    for contributor in study.contributors:
        entries = sweep.entries(study.measure, contributor.parameters, point)
        sign, coefficient = zone_coefficient(contributor.zone, entries)
        rows.append(ContributorRow(contributor, entries, sign, coefficient,
                                   contributor_term(contributor, entries)))
    groups = [study_ref_group(ref, sweep.entries(study.measure, (ref.parameter,), point)[0])
              for ref in study.point_refs]
    terms = [r.term for r in rows if r.term is not None]
    terms += [c.term for g in groups for c in g.children if c.term is not None]
    return PointResult(
        index=point,
        driver_value=sweep.driver_values[point],
        nominal=sweep.measure_values[study.measure][point],
        interval=fold(terms),
        rows=tuple(rank(rows)),
        groups=tuple(groups),
    )


def envelope(study: KinematicStudy, sweep: Sweep) -> List[PointResult]:
    """:func:`fold_at` at every sweep point, in the artifact's point order."""
    return [fold_at(study, sweep, i) for i in range(sweep.n_points)]


def stop_index(study: KinematicStudy, sweep: Sweep, stop_id: str) -> int:
    """The sweep point whose measure is nearest the stop's target -- by value."""
    stop = study.stop(stop_id)
    values = sweep.measure_values[study.measure]
    return min(range(len(values)), key=lambda i: abs(values[i] - stop.target))


@dataclass(frozen=True)
class StopStack:
    """Where the driven part sits at one stop's contact: its axial stack.

    ``entry`` is the measure's Jacobian entry for the driver at the stop's
    nominal point (``J``); ``groups`` are the stack's chain studies with their
    leaves at ``|J| x`` their ratios (:func:`study_ref_group`), in the stop's
    own order. ``position`` is the leaves folded once at their own ratios, in
    the driver's unit (mm): how far the contact pose itself may move.
    ``shared`` names the leaf edges another stop's stack also holds.
    """

    stop: str
    entry: float
    refs: Tuple[StudyRef, ...]
    groups: Tuple[GroupRow, ...]
    position: Interval
    shared: Tuple[str, ...] = ()

    @property
    def interval(self) -> Interval:
        """The stack's own part of the stop's pitch band: its leaves in degrees."""
        return fold([c.term for g in self.groups for c in g.children if c.term is not None])


@dataclass(frozen=True)
class StopResult:
    """A stop: the linkage at its pose, its axial stack, and the one fold of both."""

    stop: Stop
    point: PointResult
    stack: StopStack
    interval: Interval

    @property
    def open_refs(self) -> List[StudyRef]:
        """The refs reaching this stop (its stack or per-point) that are open."""
        return [r for r in (*self.stack.refs, *(g.ref for g in self.point.groups))
                if not r.completeness["complete"]]


def _driver_entry(study: KinematicStudy, sweep: Sweep, point: int) -> float:
    parameter = sweep.driver.get("parameter")
    return (sweep.entries(study.measure, (parameter,), point)[0]
            if parameter in sweep.parameters else 0.0)


def _stack_edges(stop: Stop) -> List[str]:
    return [t.edge for ref in stop.axial_stack for t in ref.terms]


def stop_stack(study: KinematicStudy, sweep: Sweep, stop_id: str) -> StopStack:
    """Stop ``stop_id``'s axial stack at its own pose (:class:`StopStack`)."""
    stop = study.stop(stop_id)
    entry = _driver_entry(study, sweep, stop_index(study, sweep, stop_id))
    elsewhere = {e for other in study.stops if other.id != stop_id
                 for e in _stack_edges(other)}
    return StopStack(
        stop=stop_id, entry=entry, refs=stop.axial_stack,
        groups=tuple(study_ref_group(ref, entry) for ref in stop.axial_stack),
        position=fold([Term(sub.dimension, sub.sign, sub.ratio)
                       for ref in stop.axial_stack for sub in ref.terms]),
        shared=tuple(e for e in _stack_edges(stop) if e in elsewhere))


def fold_at_stop(study: KinematicStudy, sweep: Sweep, stop_id: str) -> StopResult:
    """A stop's band: the linkage terms at its pose plus its axial stack, one fold.

    The direct terms are :func:`fold_at`'s at the stop's point; the stack's
    leaves enter at ``|J| x`` their ratios, ``J`` the driver's entry there
    (first order, at the stop's nominal driver value).
    """
    point = fold_at(study, sweep, stop_index(study, sweep, stop_id))
    stack = stop_stack(study, sweep, stop_id)
    terms = [r.term for r in point.rows if r.term is not None]
    terms += [c.term for g in (*point.groups, *stack.groups)
              for c in g.children if c.term is not None]
    return StopResult(stop=study.stop(stop_id), point=point, stack=stack,
                      interval=fold(terms))


@dataclass(frozen=True)
class RangeTerm:
    """One physical term of the range between two stops.

    ``high``/``low`` are its signed weights at the two stops (``0.0`` where it
    is not in that stop's fold) -- for a band the Jacobian-chained entry, for a
    sphere the norm of its entries; ``coefficient`` is its weight in the range,
    the high stop's less the low stop's (for a sphere, the norm of the entry
    difference). ``shared`` -- it is in both stops' folds, so it cancels to
    that difference.
    """

    edge: str
    kind: str
    high: float
    low: float
    coefficient: float
    half: float
    shared: bool
    term: Optional[Term]

    @property
    def magnitude(self) -> float:
        return abs(self.coefficient) * self.half

    def as_dict(self) -> Dict[str, Any]:
        return {"edge": self.edge, "kind": self.kind, "shared": self.shared,
                "at_high": abs(self.high) * self.half, "at_low": abs(self.low) * self.half,
                "coefficient": self.coefficient, "magnitude": self.magnitude}


#: What a range term is: a linkage contributor at both poses, or a leaf of a
#: stop's axial stack. **This tuple is the definition.**
RANGE_TERM_KINDS = ("linkage", "stop_position")


@dataclass(frozen=True)
class RangeResult:
    """The range between the two stops: the high stop's measure less the low's.

    ``interval`` is variation only (each physical term once, at the difference
    of its two weights); ``nominal`` is the two sweep nominals' difference,
    folded as two constants so no value is combined outside :func:`fold`.
    """

    high: StopResult
    low: StopResult
    nominal: Interval
    interval: Interval
    terms: Tuple[RangeTerm, ...]


def range_between_stops(study: KinematicStudy, sweep: Sweep) -> Optional[RangeResult]:
    """The range between a two-stop study's stops (``None`` with any other count).

    The same build reaches both stops, so a dimension in both folds is one
    variate: it enters once, weighted by the difference of its two weights --
    which is why the shared terms nearly cancel where the two poses' slopes
    are alike. A term in one stop's fold only enters at that stop's weight.
    """
    if len(study.stops) != 2:
        return None
    lo_stop, hi_stop = sorted(study.stops, key=lambda s: s.target)
    high = fold_at_stop(study, sweep, hi_stop.id)
    low = fold_at_stop(study, sweep, lo_stop.id)
    terms: List[RangeTerm] = []
    for contributor in study.contributors:
        if contributor.dimension is None:
            continue
        e_hi = sweep.entries(study.measure, contributor.parameters, high.point.index)
        e_lo = sweep.entries(study.measure, contributor.parameters, low.point.index)
        diff = tuple(h - l for h, l in zip(e_hi, e_lo))
        sign, coefficient = zone_coefficient(contributor.zone, diff)
        terms.append(RangeTerm(
            edge=contributor.edge, kind=RANGE_TERM_KINDS[0],
            high=zone_coefficient(contributor.zone, e_hi)[1],
            low=zone_coefficient(contributor.zone, e_lo)[1],
            coefficient=sign * coefficient, half=contributor.dimension.half_range,
            shared=True,
            term=Term(contributor.dimension, sign, coefficient) if coefficient else None))
    weights: Dict[str, Dict[str, Any]] = {}
    for result, key in ((high, "high"), (low, "low")):
        for kind, groups in ((RANGE_TERM_KINDS[0], result.point.groups),
                             (RANGE_TERM_KINDS[1], result.stack.groups)):
            for group in groups:
                for child in group.children:
                    slot = weights.setdefault(child.sub.edge, {
                        "sub": child.sub, "kind": kind, "high": 0.0, "low": 0.0})
                    slot[key] = group.entry * child.sub.sign * child.sub.ratio
    for edge, slot in weights.items():
        sign, coefficient = zone_coefficient("band", (slot["high"] - slot["low"],))
        both = slot["high"] != 0.0 and slot["low"] != 0.0
        terms.append(RangeTerm(
            edge=edge, kind=slot["kind"], high=slot["high"], low=slot["low"],
            coefficient=sign * coefficient, half=slot["sub"].dimension.half_range,
            shared=both,
            term=Term(slot["sub"].dimension, sign, coefficient) if coefficient else None))
    nominal = fold([
        Term(Dimension(id=f"{hi_stop.id}__nominal", name=hi_stop.label,
                       nominal=high.point.nominal, min=high.point.nominal,
                       max=high.point.nominal), 1),
        Term(Dimension(id=f"{lo_stop.id}__nominal", name=lo_stop.label,
                       nominal=low.point.nominal, min=low.point.nominal,
                       max=low.point.nominal), -1)])
    return RangeResult(high=high, low=low, nominal=nominal,
                       interval=fold([t.term for t in terms if t.term is not None]),
                       terms=tuple(terms))


def check_at_stop(study: KinematicStudy, sweep: Sweep, check_id: str) -> CheckResult:
    """One authored check, applied at its named stop.

    Three shapes, one fold. With a ``limit`` and a ``bound``
    (:data:`CHECK_BOUNDS`), a **reach** check on the stop's own measure: the
    sweep's nominal there (a constant), the stop's folded variation and the
    limit, through ``fold()`` -- ``at_least`` is nominal + variation - limit,
    ``at_most`` is limit - nominal - variation, so the margin is the signed
    worst-case distance to the bound either way. With a ``limit`` and no
    ``bound``, the topology's shape: the limit ``+1`` less the stop's variation
    ``-1``, a budget on its spread. Without a limit, the stop's interval
    unchanged. Never applied to the whole sweep at once: a budget is a
    statement about one configuration, and the envelope is many.
    """
    spec, at_stop = _check_spec(study, sweep, check_id)
    point = at_stop.point
    units = sweep.units.get(study.measure)
    open_refs = at_stop.open_refs
    limit = spec.get("limit")
    if limit is None:
        interval = at_stop.interval
    else:
        interval = _check_fold(study, spec, at_stop, at_stop.interval.min,
                               at_stop.interval.max)
        units = limit.get("units", units)
    return CheckResult(
        check_id=spec["check_id"],
        label=spec.get("label", spec["check_id"]),
        configuration=spec.get("configuration", {}),
        interval=interval,
        criterion=spec.get("criterion", ">= 0"),
        units=units,
        guidance=spec.get("guidance"),
        complete=bool(spec.get("complete", True)) and not open_refs,
        excluded_terms=tuple(spec.get("excluded_terms") or ()) + tuple(
            f"{r.study_id} (a study_ref on {r.parameter}): {r.completeness['reason']}"
            for r in open_refs),
    )


def rss_check_at_stop(study: KinematicStudy, sweep: Sweep, check_id: str) -> Interval:
    """The same check with the stop's RSS band in place of its worst case.

    Its ``min`` is the RSS margin a reader sees beside the worst-case one:
    the stop's ``rss_min``/``rss_max`` enter the check's one fold exactly where
    :func:`check_at_stop` puts the worst-case ends.
    """
    spec, at_stop = _check_spec(study, sweep, check_id)
    if spec.get("limit") is None:
        return at_stop.interval
    return _check_fold(study, spec, at_stop, at_stop.interval.rss_min,
                       at_stop.interval.rss_max)


def _check_spec(study: KinematicStudy, sweep: Sweep,
                check_id: str) -> Tuple[Dict[str, Any], StopResult]:
    spec = next((c for c in study.checks if c.get("check_id") == check_id), None)
    if spec is None:
        raise KinematicStudyError(f"kinematic study {study.id!r} has no check {check_id!r}")
    bound = spec.get("bound")
    if bound is not None and bound not in CHECK_BOUNDS:
        raise KinematicStudyError(
            f"kinematic study {study.id!r}: check {check_id!r} has bound {bound!r}; "
            f"a bound is one of {CHECK_BOUNDS}")
    if bound is not None and spec.get("limit") is None:
        raise KinematicStudyError(
            f"kinematic study {study.id!r}: check {check_id!r} has a bound and no limit")
    return spec, fold_at_stop(study, sweep, spec["configuration"]["stop"])


def _check_fold(study: KinematicStudy, spec: Dict[str, Any], at_stop: StopResult,
                low: float, high: float) -> Interval:
    """A limited check's one fold, with the stop's band given as ``low``..``high``.

    No ``bound``: the limit less the band (a budget on its spread). A
    ``bound``: the sweep's nominal at the stop and the band, on the side the
    bound names, against the limit.
    """
    check_id, limit, point = spec["check_id"], spec["limit"], at_stop.point
    limit_dim = Dimension(
        id=f"{check_id}__limit", name=spec.get("label", check_id),
        nominal=float(limit["value"]), min=float(limit["value"]),
        max=float(limit["value"]),
        source_ref=SourceRef.from_dict(limit["source_ref"]))
    total_dim = Dimension(
        id=f"{check_id}__stop_total", name=f"{study.id} at {point.index}",
        nominal=at_stop.interval.nominal, min=low, max=high)
    bound = spec.get("bound")
    if bound is None:
        return fold([Term(limit_dim, sign=1), Term(total_dim, sign=-1)])
    nominal_dim = Dimension(
        id=f"{check_id}__nominal", name=f"{study.id} nominal at {point.index}",
        nominal=point.nominal, min=point.nominal, max=point.nominal)
    side = 1 if bound == CHECK_BOUNDS[0] else -1
    return fold([Term(nominal_dim, sign=side), Term(total_dim, sign=side),
                 Term(limit_dim, sign=-side)])
