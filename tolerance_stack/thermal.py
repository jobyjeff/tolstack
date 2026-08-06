"""The thermal-fit archetype: isothermal heat soak over a diametral interference fit.

The second archetype in this repo (the first being the linear grip-length stack
the three seeded stacks use). Written 2026-08-05 by handoff
``hub_bearing_thermal_stack`` from Jeff's ``260209_Hub Bearing Fits.xlsx``.

What the archetype is
---------------------
A chain of cylindrical members shrink-fitted one inside the next, evaluated for
**interference at every corner of (fit condition x temperature)**. The criterion
is that interference never reaches zero anywhere: a slip fit is a failure, not a
marginal result, because a rotating bearing outer ring that can turn in its seat
wears the seat away.

The hub-bearing instance is two stages deep -- a thin-wall stainless sleeve
shrink-fitted into an aluminium hub bore, then a steel bearing shrink-fitted into
the sleeve -- and the stages are **chained**: installing the sleeve closes its own
bore, so stage 2's interference depends on stage 1's. That chaining is visible in
the generated term lists, where the hub bore appears in the stage-2 check.

Why this needs no new arithmetic engine
---------------------------------------
Everything the archetype does reduces to *weights on term entries*:

* an isothermal soak multiplies a diameter by ``1 + dT * alpha`` -- one factor per
  member material per temperature (:func:`thermal_factor`);
* a **diametral** term is twice a radial one, because the sleeve OD is
  ``bore + 2 x wall`` -- so the wall enters with ``coefficient=2``, on ONE element,
  which is also the correct fully-correlated RSS treatment (the two walls are one
  turned dimension);
* the installed interference is **split between the two members** by a stiffness
  ratio ``k``, which enters as ``k`` and ``1 - k`` weights.

So the whole archetype folds through the repo's single :func:`~tolerance_stack.fold`.
This module computes weights; it never combines two element values. See
ARCHITECTURE.md, "Where computation may live -- and the coefficient".

Sign convention: interference is POSITIVE
-----------------------------------------
The workbook's fit rows are signed the other way ("negative is inx"). The checks
generated here negate that, so that ``criterion: ">= 0"`` -- the only criterion
:class:`~tolerance_stack.CheckResult` knows -- means "no clearance anywhere", and
the existing ``pass`` / ``marginal`` / ``fail`` vocabulary reads correctly with no
new verdict logic:

===========  ==============================================================
``pass``     the loosest corner still has interference
``marginal`` nominal has interference, the loosest corner does not
``fail``     even nominal has clearance
===========  ==============================================================

The worksheet reports the workbook's sign alongside, because a reader comparing
against the spreadsheet needs both.

The worst case is WIDER than the workbook's columns
---------------------------------------------------
This is the one thing to understand before reading a number out of here. The
workbook evaluates three *coherent material corners* per temperature (all
features at nominal, all at LMC, all at MMC). A worst-case fold takes each
feature to whichever limit is worst for the result, independently -- which is what
independently-toleranced drawing callouts license.

For **stage 2** the two happen to coincide exactly, because the sleeve bore enters
with a negative weight and the wall with a positive one, so LMC (bigger bore,
thinner wall) *is* the loose extreme.

For **stage 1** they do not. Both the sleeve bore and its wall enter with the same
sign, while LMC moves them in opposite directions -- so the loosest real sleeve OD
is "smallest bore *and* thinnest wall", a combination the workbook's column layout
structurally cannot express. The fold is wider by exactly the sleeve bore's
tolerance width times the soak factor: **0.05003 mm at every stage-1 corner** of
this workbook. That is not a transcription disagreement, it is a methodological
one, and it changes a conclusion -- see the worksheet's findings.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from tolerance_stack.stack import (
    CheckResult,
    SourceRef,
    StackDefinition,
    load_stack,
)

SCHEMA_MATERIAL = "joby.tolerance_stack/material_entry/v0"

#: The two stages of the archetype, in physical order (outermost joint first).
STAGE_IDS = ("hub_to_sleeve", "sleeve_to_bearing")


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MaterialEntry:
    """One material + condition, and the CTE a stack may cite for it.

    Same shape discipline as ``hardware_entry/v0``: values live ``inline`` for
    now, ``library_ref`` is held ``None`` until a materials library exists,
    ``values_source`` is mandatory and says where the number came from, and
    ``gaps`` is non-empty because an entry claiming no gaps is an entry whose
    gaps were not looked for.

    ``designation_source`` is this schema's own addition: the material's *name*
    and the material's *number* have different provenance. Every designation here
    but one is traced to a drawing note; not one CTE value is traced to anything.
    Keeping them in separate fields is what makes that statable.
    """

    id: str
    designation: str
    cte_1e6_per_c: float
    values_source: SourceRef
    gaps: List[str]
    specification: Optional[str] = None
    condition: Optional[str] = None
    cls: Optional[str] = None
    cte_temperature_range_c: Optional[List[float]] = None
    applied_over_c: List[List[float]] = field(default_factory=list)
    values_status: str = "inline"
    library_ref: Optional[str] = None
    designation_source: Optional[SourceRef] = None
    cindas_request: Optional[str] = None
    used_by: List[str] = field(default_factory=list)
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.values_status not in ("inline", "library", "not_transcribed"):
            raise ValueError(f"material {self.id!r}: bad values_status {self.values_status!r}")
        if self.values_status == "inline" and self.values_source is None:
            raise ValueError(f"material {self.id!r}: inline values need a values_source")
        if not self.gaps:
            raise ValueError(f"material {self.id!r}: gaps must be non-empty")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "MaterialEntry":
        if d.get("schema") != SCHEMA_MATERIAL:
            raise ValueError(f"expected schema {SCHEMA_MATERIAL!r}, got {d.get('schema')!r}")
        src = d.get("values_source")
        dsrc = d.get("designation_source")
        return cls(
            id=d["id"],
            designation=d["designation"],
            cte_1e6_per_c=float(d["cte_1e6_per_c"]),
            values_source=SourceRef.from_dict(src) if src else None,
            gaps=list(d.get("gaps", [])),
            specification=d.get("specification"),
            condition=d.get("condition"),
            cls=d.get("class"),
            cte_temperature_range_c=d.get("cte_temperature_range_c"),
            applied_over_c=[list(r) for r in d.get("applied_over_c", [])],
            values_status=d.get("values_status", "inline"),
            library_ref=d.get("library_ref"),
            designation_source=SourceRef.from_dict(dsrc) if dsrc else None,
            cindas_request=d.get("cindas_request"),
            used_by=list(d.get("used_by", [])),
            note=d.get("note"),
        )


def load_materials(path: str | Path) -> Dict[str, MaterialEntry]:
    """Read ``docs/tolerance_stacks/materials.json`` into ``{id: MaterialEntry}``."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    entries = [MaterialEntry.from_dict(m) for m in data["materials"]]
    by_id: Dict[str, MaterialEntry] = {}
    for entry in entries:
        if entry.id in by_id:
            raise ValueError(f"duplicate material id {entry.id!r}")
        by_id[entry.id] = entry
    return by_id


# ---------------------------------------------------------------------------
# The one new arithmetic primitive
# ---------------------------------------------------------------------------


def thermal_factor(cte_1e6_per_c: float, delta_t_c: float) -> float:
    """Isothermal free-expansion factor: ``1 + dT * alpha``.

    ``cte_1e6_per_c`` is in the units material tables print, 1e-6 per degree C, so
    the ``/ 1e6`` lives here rather than in every caller.

    This reproduces the workbook's own formula -- ``G13`` is
    ``=C13*(1+($C$7-$C$4)*$C$5/1000000)`` -- and it is *free* expansion: an
    unconstrained diameter growing uniformly. The members in a shrink fit are not
    free, they are pressing on each other, and the model handles that with the
    stiffness ratio rather than by coupling the expansions. See the isothermal
    caveat in ``docs/tolerance_stacks/ARCHETYPE_thermal_fit.md``.
    """
    return 1.0 + delta_t_c * cte_1e6_per_c / 1_000_000.0


# ---------------------------------------------------------------------------
# The archetype
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ThermalFitChain:
    """One two-stage shrink-fit chain: a hub bore, a sleeve inside it, a bearing
    inside that.

    Element ids, material ids and the stiffness ratio -- the inputs the archetype
    needs, and nothing else. No arithmetic is stored: every number a check contains
    is computed at expansion time, so a stack file cannot carry a stale
    coefficient.
    """

    id: str
    hub_bore_element: str
    hub_material: str
    sleeve_bore_element: str
    sleeve_wall_element: str
    sleeve_material: str
    bearing_od_element: str
    bearing_material: str
    stiffness_ratio: float
    label: Optional[str] = None
    stiffness_ratio_source: Optional[SourceRef] = None
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if not 0.0 <= self.stiffness_ratio <= 1.0:
            raise ValueError(
                f"chain {self.id!r}: stiffness_ratio {self.stiffness_ratio!r} is not a fraction")

    @property
    def element_ids(self) -> tuple:
        return (self.hub_bore_element, self.sleeve_bore_element,
                self.sleeve_wall_element, self.bearing_od_element)

    @property
    def material_ids(self) -> tuple:
        return (self.hub_material, self.sleeve_material, self.bearing_material)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ThermalFitChain":
        members = d["members"]
        src = d.get("stiffness_ratio", {}).get("source_ref")
        return cls(
            id=d["id"],
            hub_bore_element=members["hub"]["bore_element"],
            hub_material=members["hub"]["material"],
            sleeve_bore_element=members["sleeve"]["bore_element"],
            sleeve_wall_element=members["sleeve"]["wall_element"],
            sleeve_material=members["sleeve"]["material"],
            bearing_od_element=members["bearing"]["od_element"],
            bearing_material=members["bearing"]["material"],
            stiffness_ratio=float(d["stiffness_ratio"]["value"]),
            label=d.get("label"),
            stiffness_ratio_source=SourceRef.from_dict(src) if src else None,
            note=d.get("note"),
        )


@dataclass(frozen=True)
class ThermalFitSpec:
    """The ``thermal_fit`` block of a stack-definition JSON, validated.

    The temperature scenarios are shared across chains -- they are a property of
    the assembly's duty cycle, not of a seat -- and one or more
    :class:`ThermalFitChain` describe the seats. The hub-bearing workbook puts two
    chains (the lower and upper bearing seats) on one sheet, and this mirrors that:
    one stack file per configuration, one chain per seat.
    """

    reference_temperature_c: float
    temperatures_c: Dict[str, float]
    chains: List[ThermalFitChain]
    stiffness_sensitivity: List[float] = field(default_factory=list)
    interference_fraction_target: Optional[float] = None
    note: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ThermalFitSpec":
        spec = cls(
            reference_temperature_c=float(d["reference_temperature_c"]),
            temperatures_c={k: float(v) for k, v in d["temperatures_c"].items()},
            chains=[ThermalFitChain.from_dict(c) for c in d["chains"]],
            stiffness_sensitivity=[float(k) for k in d.get("stiffness_sensitivity", [])],
            interference_fraction_target=d.get("interference_fraction_target"),
            note=d.get("note"),
        )
        if not spec.chains:
            raise ValueError("thermal_fit needs at least one chain")
        if len({c.id for c in spec.chains}) != len(spec.chains):
            raise ValueError("thermal_fit chain ids must be unique")
        if spec.reference_temperature_c not in spec.temperatures_c.values():
            raise ValueError("reference_temperature_c must appear in temperatures_c")
        return spec

    def delta_t(self, group: str) -> float:
        return self.temperatures_c[group] - self.reference_temperature_c

    def chain(self, chain_id: str) -> ThermalFitChain:
        for candidate in self.chains:
            if candidate.id == chain_id:
                return candidate
        raise KeyError(f"no thermal_fit chain {chain_id!r}")

    @property
    def hottest(self) -> str:
        return max(self.temperatures_c, key=lambda g: self.temperatures_c[g])

    @property
    def groups_by_temperature(self) -> List[str]:
        return sorted(self.temperatures_c, key=lambda g: self.temperatures_c[g])


def stage_terms(
    spec: ThermalFitSpec,
    chain: ThermalFitChain,
    materials: Dict[str, MaterialEntry],
    stage: str,
    group: str,
    stiffness: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """The JSON term list for one stage at one temperature. Interference positive.

    ``stage 1``, hub bore to sleeve OD::

        I1 = f_s * sleeve_bore + 2 * f_s * sleeve_wall - f_h * hub_bore

    ``stage 2``, installed sleeve bore to bearing OD. Substituting the workbook's
    install chain (``od_installed = od - k * (od - bore)``,
    ``id_installed = od_installed - 2 * wall``) and collecting terms::

        I2 = f_b * bearing_od
             - (1 - k) * f_s * sleeve_bore
             + 2 * k    * f_s * sleeve_wall
             - k        * f_h * hub_bore

    The hub bore in that last term is the chaining: how much of stage 1's
    interference survives into stage 2's bore is what ``k`` decides.
    """
    if stage not in STAGE_IDS:
        raise ValueError(f"unknown stage {stage!r}")
    k = chain.stiffness_ratio if stiffness is None else stiffness
    dt = spec.delta_t(group)
    f_hub = thermal_factor(materials[chain.hub_material].cte_1e6_per_c, dt)
    f_sleeve = thermal_factor(materials[chain.sleeve_material].cte_1e6_per_c, dt)
    f_bearing = thermal_factor(materials[chain.bearing_material].cte_1e6_per_c, dt)

    if stage == "hub_to_sleeve":
        return [
            {"element": chain.sleeve_bore_element, "sign": 1, "coefficient": f_sleeve},
            {"element": chain.sleeve_wall_element, "sign": 1, "coefficient": 2 * f_sleeve},
            {"element": chain.hub_bore_element, "sign": -1, "coefficient": f_hub},
        ]
    terms = [
        {"element": chain.bearing_od_element, "sign": 1, "coefficient": f_bearing},
    ]
    # k == 1 zeroes the sleeve-bore weight, k == 0 zeroes both the hub-bore and
    # the wall weight. A Term's coefficient must be > 0, so a zero-weight term is
    # omitted rather than carried at 0 -- omitting a term and weighting it zero are
    # the same arithmetic, and only one of them is expressible.
    if k > 0.0:
        terms.append({"element": chain.sleeve_wall_element, "sign": 1,
                      "coefficient": 2 * k * f_sleeve})
        terms.append({"element": chain.hub_bore_element, "sign": -1,
                      "coefficient": k * f_hub})
    if k < 1.0:
        terms.append({"element": chain.sleeve_bore_element, "sign": -1,
                      "coefficient": (1.0 - k) * f_sleeve})
    return terms


STAGE_LABELS = {
    "hub_to_sleeve": "hub bore to sleeve OD (stage 1)",
    "sleeve_to_bearing": "installed sleeve bore to bearing OD (stage 2)",
}

STAGE_GUIDANCE = {
    "hub_to_sleeve": (
        "Interference at the hub-to-sleeve joint, positive = interference. The "
        "worst-case minimum is the LOOSEST corner and is the binding one: the "
        "criterion is that it never reaches zero. This stage's worst case is "
        "WIDER than the workbook's LMC column by the sleeve bore's tolerance "
        "width, because the loosest real sleeve OD is smallest-bore-with-thinnest-"
        "wall and the workbook's coherent-corner layout cannot express that."
    ),
    "sleeve_to_bearing": (
        "Interference at the sleeve-to-bearing joint after the sleeve has been "
        "installed, positive = interference. Chained: the hub bore appears here "
        "because the stiffness ratio decides how much of stage 1's interference "
        "closes this bore. This stage's worst case coincides EXACTLY with the "
        "workbook's LMC and MMC columns."
    ),
}


def build_checks(
    spec: ThermalFitSpec,
    materials: Dict[str, MaterialEntry],
    stack_id: str = "",
) -> List[Dict[str, Any]]:
    """Every check the archetype generates: chains x 2 stages x N temperatures.

    Plus, per chain, at the governing (hottest) temperature only, a stage-2
    stiffness-ratio sensitivity check per value in ``stiffness_sensitivity`` --
    because ``k`` is a workbook estimate with no derivation behind it, and a reader
    deserves to see how much of the answer rests on it. Those are labelled
    ``[SENSITIVITY]`` and are not results. Stage 1 does not depend on ``k``, so it
    gets no sensitivity checks.
    """
    checks: List[Dict[str, Any]] = []
    for chain in spec.chains:
        where = chain.label or chain.id
        for stage in STAGE_IDS:
            for group in spec.groups_by_temperature:
                checks.append({
                    "check_id": f"{chain.id}__{stage}__{group}",
                    "label": (f"{where}: {STAGE_LABELS[stage]} @ {group} "
                              f"({spec.temperatures_c[group]:g} C)"),
                    "configuration": {
                        "chain": chain.id,
                        "stage": stage,
                        "temperature": group,
                        "temperature_c": f"{spec.temperatures_c[group]:g}",
                        "stiffness_ratio": f"{chain.stiffness_ratio:g}",
                    },
                    "criterion": ">= 0",
                    "guidance": STAGE_GUIDANCE[stage],
                    "workbook_cells": None,
                    "terms": stage_terms(spec, chain, materials, stage, group),
                })
        for k in spec.stiffness_sensitivity:
            if k == chain.stiffness_ratio:
                continue
            suffix = f"k{k:g}".replace(".", "p")
            checks.append({
                "check_id": f"{chain.id}__sleeve_to_bearing__{spec.hottest}__{suffix}",
                "label": (f"[SENSITIVITY] {where}: {STAGE_LABELS['sleeve_to_bearing']} @ "
                          f"{spec.hottest} with stiffness ratio {k:g} instead of "
                          f"{chain.stiffness_ratio:g}"),
                "configuration": {
                    "chain": chain.id,
                    "stage": "sleeve_to_bearing",
                    "temperature": spec.hottest,
                    "stiffness_ratio": f"{k:g}",
                    "sensitivity": "true",
                },
                "criterion": ">= 0",
                "guidance": (
                    f"NOT A RESULT. The stiffness ratio {chain.stiffness_ratio:g} is a "
                    "workbook estimate with no derivation, no source and no stated "
                    "confidence; this shows what stage 2 reads if it is wrong. k = 1 "
                    "means the sleeve absorbs all of stage 1's interference, so its "
                    "bore closes by the full amount; k = 0 means the hub bore opens "
                    "up instead and the sleeve bore is unaffected. Stage 1 does not "
                    "depend on k at all, so it has no sensitivity check."
                ),
                "workbook_cells": None,
                "terms": stage_terms(spec, chain, materials, "sleeve_to_bearing",
                                     spec.hottest, stiffness=k),
            })
    if not checks:
        raise ValueError(f"stack {stack_id!r}: thermal_fit generated no checks")
    return checks


def load_thermal_fit_stack(
    path: str | Path,
    materials: Dict[str, MaterialEntry] | str | Path | None = None,
) -> StackDefinition:
    """Load a thermal-fit stack JSON and attach its generated checks.

    The returned object is an ordinary :class:`~tolerance_stack.StackDefinition`:
    ``check()``, ``all_checks()`` and ``verdict`` are the same code paths every
    other stack in this repo uses. The stack file's own ``checks`` array must be
    empty -- the checks are *derived*, and a hand-written one in the file would be
    a second, unverified source of coefficients.
    """
    path = Path(path)
    if materials is None:
        materials = path.parent / "materials.json"
    if not isinstance(materials, dict):
        materials = load_materials(materials)

    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("checks"):
        raise ValueError(
            f"{path}: a thermal_fit stack must not hand-write checks; they are generated")
    stack = load_stack(path)
    spec = ThermalFitSpec.from_dict(data["thermal_fit"])
    referenced = set()
    for chain in spec.chains:
        for element_id in chain.element_ids:
            stack.element(element_id)  # raises KeyError if a chain names a stranger
            referenced.add(element_id)
        for material_id in chain.material_ids:
            if material_id not in materials:
                raise KeyError(f"{path}: chain {chain.id!r} names unknown material "
                               f"{material_id!r}")
    stranded = sorted({e.id for e in stack.elements} - referenced)
    if stranded:
        raise ValueError(
            f"{path}: elements referenced by no thermal_fit chain: {stranded}. "
            "An element nothing folds in is either a chain that was forgotten or a "
            "value that does not belong in this stack -- say which in a note and "
            "give it a chain, or remove it.")
    stack.checks = build_checks(spec, materials, stack.id)
    stack.thermal_fit = spec           # type: ignore[attr-defined]
    stack.materials = materials        # type: ignore[attr-defined]
    return stack


# ---------------------------------------------------------------------------
# Reporting -- so the generated coefficients are reviewable, not just tested
# ---------------------------------------------------------------------------


def expanded_terms_table(stack: StackDefinition) -> List[Dict[str, Any]]:
    """Every generated term of every check, flattened, for the worksheet.

    Generated checks are not readable in the stack JSON, which is a real cost:
    the repo's central safety property is that a reviewer can read every sign and
    every weight. This puts them back on the page.
    """
    rows: List[Dict[str, Any]] = []
    for check in stack.checks:
        for term in stack.terms(check["terms"]):
            rows.append({
                "check_id": check["check_id"],
                "element": term.element.id,
                "sign": term.sign,
                "coefficient": term.coefficient,
                "weight": term.weight,
                "min": term.element.min,
                "max": term.element.max,
                "nominal": term.element.nominal,
            })
    return rows


def workbook_corner(
    stack: StackDefinition,
    chain_id: str,
    stage: str,
    group: str,
    corner: str,
) -> float:
    """One of the workbook's **coherent material corners**, for comparison only.

    The stack's own checks are worst-case folds, which take each feature to its
    own worst limit independently. The workbook instead evaluates three coherent
    corners -- every feature simultaneously at nominal, at LMC, or at MMC. That is
    a narrower and different question, and reproducing it is what lets the
    worksheet put the two side by side and quote the difference.

    Deliberately **not** routed through :func:`~tolerance_stack.fold`: a coherent
    corner is a single-valued evaluation of one point, not a fold over a band, and
    pretending otherwise would be the second arithmetic path this repo refuses.
    It reads ``lmc`` / ``mmc`` for exactly the same reason -- those fields are the
    material conditions the workbook's columns *are*, and this is the one function
    in the repo that needs them. ``fold()`` still never does.
    """
    spec: ThermalFitSpec = stack.thermal_fit  # type: ignore[attr-defined]
    materials: Dict[str, MaterialEntry] = stack.materials  # type: ignore[attr-defined]
    chain = spec.chain(chain_id)
    if corner not in ("nom", "lmc", "mmc"):
        raise ValueError(f"corner must be nom | lmc | mmc, got {corner!r}")

    def at(element_id: str) -> float:
        element = stack.element(element_id)
        if corner == "nom":
            return element.nominal
        value = element.lmc if corner == "lmc" else element.mmc
        if value is None:
            raise ValueError(f"element {element_id!r} carries no {corner} value")
        return value

    dt = spec.delta_t(group)
    f_hub = thermal_factor(materials[chain.hub_material].cte_1e6_per_c, dt)
    f_sleeve = thermal_factor(materials[chain.sleeve_material].cte_1e6_per_c, dt)
    f_bearing = thermal_factor(materials[chain.bearing_material].cte_1e6_per_c, dt)
    k = chain.stiffness_ratio

    sleeve_bore = at(chain.sleeve_bore_element) * f_sleeve
    wall = at(chain.sleeve_wall_element) * f_sleeve
    hub_bore = at(chain.hub_bore_element) * f_hub
    sleeve_od = sleeve_bore + 2 * wall

    if stage == "hub_to_sleeve":
        return sleeve_od - hub_bore
    if stage == "sleeve_to_bearing":
        od_installed = sleeve_od - k * (sleeve_od - hub_bore)
        return at(chain.bearing_od_element) * f_bearing - (od_installed - 2 * wall)
    raise ValueError(f"unknown stage {stage!r}")


def results(stack: StackDefinition) -> List[CheckResult]:
    """``all_checks()``, spelled for readers who arrive at this module first."""
    return stack.all_checks()
