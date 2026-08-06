# Archetype — `thermal_fit`

The repo's **second** archetype. Isothermal heat soak over a chained diametral
interference fit, evaluated at every corner of (fit condition × temperature),
with the criterion that interference never reaches zero.

Written 2026-08-05 by handoff `hub_bearing_thermal_stack` from Jeff's
`260209_Hub Bearing Fits.xlsx`. The first archetype — the linear grip-length
stack the three seeded stacks use — has no document of its own; it *is* the SOP.
This file exists because the two differ in ways the SOP does not anticipate, and
naming those differences is the design input for an archetype registry, which is
future work and deliberately not built here (a registry wants three archetypes,
not two).

> **This is not a framework.** There is no registry, no dispatch table, no
> `archetype` plugin interface. There is a documented JSON convention, a ~430-line
> module that turns it into term lists, and this file. If a third archetype
> arrives and wants the same shape, *then* generalise.

---

## What the archetype is for

A chain of cylindrical members shrink-fitted one inside the next, where the
members have **different coefficients of thermal expansion** and the assembly
runs over a temperature range. Heating a steel sleeve inside an aluminium hub
loosens the joint, because the aluminium grows almost twice as fast. If it
loosens enough, the inner member can turn in its seat.

The criterion is therefore not a margin, it is a **sign**: interference must stay
positive everywhere. A slip fit is a failure, not a marginal result — a rotating
bearing outer ring that can turn wears its seat away, and the seat is the hub.

## Inputs

Per **chain** (one bearing seat), four elements and three materials:

| element | what it is | material direction |
|---|---|---|
| `hub_bore` | the outer member's bore | internal — LMC is the **larger** bore |
| `sleeve_bore` | the middle member's bore | internal — LMC is the **larger** bore |
| `sleeve_wall` | the middle member's **radial wall** | external — MMC is **thicker** |
| `bearing_od` | the inner member's OD | external — MMC is the **larger** OD |

plus, per chain, a **stiffness ratio** `k` — the fraction of stage-1 interference
that closes the sleeve's bore rather than opening the hub's — and per **stack**, a
set of named temperature scenarios and a reference temperature.

Declared in the stack JSON as a `thermal_fit` block; see
`stack_hub_bearing_thermal_fit_m2.json` for the worked instance.

```json
"thermal_fit": {
  "reference_temperature_c": 20.0,
  "temperatures_c": {"cold": -20.0, "room": 20.0, "hot": 72.0},
  "chains": [
    {"id": "lower_seat",
     "members": {
       "hub":     {"bore_element": "hub_bore_lower",    "material": "AL_7050_T7451"},
       "sleeve":  {"bore_element": "sleeve_bore_lower",
                   "wall_element": "sleeve_wall_lower", "material": "SS_AISI_420_AMS5621"},
       "bearing": {"od_element":   "bearing_od_lower",  "material": "BEARING_STEEL_52100"}},
     "stiffness_ratio": {"value": 0.8, "source_ref": { ... }}}
  ],
  "stiffness_sensitivity": [0.0, 1.0]
}
```

### There is no `sleeve_od` element, and that is the load-bearing decision

Neither sleeve drawing dimensions its OD. Both dimension the **bore** (as datum
B, with perpendicularity to A) and the **radial wall**, and let the OD fall out.
So the archetype does too: the wall enters each term list with `coefficient: 2`.

Modelling the OD as its own element would require inventing its tolerance, and
inventing it *narrower* than the drawing licenses — see the divergence section.

## Outputs

Two stages per chain, each folded at each temperature into one `check_result`
carrying nominal, worst-case min/max and RSS. **Interference is positive.**

| stage | id | what it is |
|---|---|---|
| 1 | `hub_to_sleeve` | sleeve OD against the hub bore, before anything is installed |
| 2 | `sleeve_to_bearing` | bearing OD against the sleeve bore **after** the sleeve is installed |

`criterion` is `">= 0"` on interference, so the repo's existing three-word
verdict vocabulary reads correctly with no new logic:

| verdict | means, for a fit |
|---|---|
| `pass` | the loosest corner still has interference |
| `marginal` | nominal has interference, the loosest corner does not — **no single build is guaranteed** |
| `fail` | even nominal has clearance |

The **worst-case minimum is the binding number**, always. It is the loosest
corner, and looseness is what the criterion is about. (Contrast the seeded grip
stacks, where the binding end depends on the check — SOP Step 5c.)

## The arithmetic, in full

Both stages are signed, weighted term lists, folded by the repo's one `fold()`.
With `f_h`, `f_s`, `f_b` the soak factors of hub, sleeve and bearing:

```
f_m(T)  =  1 + (T − T_ref) · α_m · 1e−6                    thermal_factor()

I₁      =  f_s·sleeve_bore  +  2·f_s·sleeve_wall  −  f_h·hub_bore

I₂      =  f_b·bearing_od
           −  (1−k)·f_s·sleeve_bore
           +  2k·f_s·sleeve_wall
           −  k·f_h·hub_bore
```

`I₂` is the workbook's three-step install chain, collected:
`od_installed = od − k·(od − hub_bore)`, `id_installed = od_installed − 2·wall`,
`I₂ = bearing_od − id_installed`. Substituting and gathering gives the four terms
above — and the **hub bore appearing in stage 2 is the chaining**: how much of
stage 1's interference survives into the sleeve's bore is exactly what `k`
decides.

Two degenerate cases fall out and are worth knowing:

- `k = 0` — none of stage 1 reaches the sleeve bore, so `I₂ = f_b·bearing_od −
  f_s·sleeve_bore`. Both the wall and the hub bore drop out.
- `k = 1` — the sleeve's bore closes by the full interference, so its own free
  size drops out and `I₂ = f_b·bearing_od + 2·f_s·wall − f_h·hub_bore`.

Zero-weight terms are **omitted** rather than carried at zero, because a `Term`'s
coefficient must be positive. Same arithmetic; only one of the two is
expressible.

### Why no new arithmetic engine

Every one of those weights is a per-term scale. None of them is a new way to
*combine* two element values. So `Term` gained a positive `coefficient` and the
whole archetype folds through the existing primitive — see ARCHITECTURE.md,
"Where computation may live — and the coefficient". `thermal.py` computes weights
and never combines element values. **That is the line to hold for archetype
three.**

One function in the module reads `lmc`/`mmc`: `workbook_corner()`, which exists
solely to reproduce a source spreadsheet's coherent-corner method for comparison.
It is not routed through `fold()`, and `fold()` still never reads them.

---

## The one thing to understand: coherent corners ≠ worst case

**A hand-built fit spreadsheet almost certainly evaluates coherent material
corners. A worst-case fold does not. Sometimes they coincide and sometimes they
do not, and you have to check which.**

A *coherent corner* puts every feature at the same material condition at once —
all LMC, or all MMC. That is what a spreadsheet column is. A *worst-case fold*
puts each feature at whichever of its own limits is worst for the result,
independently, which is what independently-toleranced drawing callouts license.

For **stage 2** they coincide exactly. The weights are `+f_b` on the bearing OD,
`−(1−k)f_s` on the sleeve bore, `+2k·f_s` on the wall and `−k·f_h` on the hub
bore. The loose direction wants a small bearing OD, a large sleeve bore, a thin
wall and a large hub bore — and least-material delivers all four at once.

For **stage 1** they do not. The sleeve bore and the wall enter with the **same
sign**, while a least-material sleeve has a *larger* bore and a *thinner* wall.
Those pull opposite ways, so no single material column contains the loosest
sleeve OD, which is *smallest bore with thinnest wall*. The fold is wider by the
sleeve bore's full tolerance width times the soak factor, on both sides:

> **0.0500268 mm at the hot corner, every seat, both configurations.**

That is not a transcription disagreement. It is a methodological one, the
drawings support the wider reading, and **it changes a conclusion** — see the
worksheet's finding F1.

### The general rule this instance is a case of

> For each term, compare the sign of its weight against the direction its
> material condition moves it. If **every** term in the expression agrees, the
> coherent least-material corner *is* the loose extreme and a spreadsheet's LMC
> column is the worst case. If **any** term disagrees, the spreadsheet is
> narrower than the truth, and the gap is the disagreeing features' tolerance
> widths.

Two features of one part on the same sign is the smell. It happens whenever a
derived dimension (here an OD) is built from two independently-toleranced ones.

---

## Caveats that travel with the archetype

Each of these is a property of the *model*, not of this workbook, so a third
thermal-fit stack inherits all of them.

1. **Free expansion, not constrained.** `thermal_factor()` grows an unconstrained
   diameter. The members in a shrink fit are pressing on each other, so their
   real expansion is coupled. The model handles that only through the stiffness
   ratio, and only for the install step — not for the thermal step.
2. **Isothermal.** One temperature for the whole assembly. A real hub with a hot
   bearing and a cooler rim has a gradient, and a gradient is the direction that
   makes a bearing seat *looser* (the hot inner region wants to grow into a
   cooler outer one that resists).
3. **The stiffness ratio is a judgement, not a calculation.** In this workbook it
   is labelled "estimate", differs between two seats with no stated reason, and
   does not move when a sleeve's thickness changes by 6%. It has no element
   because it is dimensionless; declare it in the block with its own
   `source_ref`, list it as a gap, and generate `[SENSITIVITY]` checks at `k = 0`
   and `k = 1` so a reader can see its reach. Stage 1 never depends on it.
4. **CTE is temperature-dependent and a scalar hides that.** Record what range
   each value is a mean over. If the source states none, say so — do not invent
   one. See `materials.json`.
5. **Interference is not torque capacity.** A positive interference says the
   parts touch, not that the joint can carry the torque that would spin the
   inner member. Contact pressure, friction coefficient and hoop stress are all
   outside this archetype. This is the direct analogue of the SOP's
   castellated-nut caveat: the number is computed correctly and does not settle
   the question, and it must say so **next to the number**.
6. **Surface roughness reduces effective interference**, always unfavourably —
   asperities flatten on assembly. Unmodelled.
7. **Coatings.** Plating and anodize thickness sit at the interface, and parts
   may disagree about whether limits apply before or after treatment. Check both
   drawings' notes; they can use opposite conventions.
8. **RSS means less here than in a linear stack.** Quadrature about the midpoint
   still assumes independent symmetric bands — and on top of that, **temperature
   is a scenario, not a variate**. An RSS half-range within one temperature check
   says nothing about the likelihood of being at that temperature, and the
   temperature scenarios must never be RSS'd against each other. Verdicts never
   read RSS.

## What this archetype needed that the linear stack did not

The registry design input, as a list.

| need | linear grip stack | `thermal_fit` |
|---|---|---|
| term weights | `±1` is enough | real coefficients: `2` diametral, `1 + ΔT·α` soak, `k` / `1−k` split |
| element role vocabulary | grip-length features | a `sleeve_wall` is a `bushing` under duress; a bore is a `clamped_member` under more |
| where checks come from | hand-authored, readable in the JSON | **generated**, so a reporter has to put the terms back on a page |
| what a corner is | one worst-case envelope | a corner **grid**: fit condition × temperature, and the two methods can disagree |
| non-dimensional inputs | none | CTE, temperature, stiffness ratio — none of which can be a `StackElement`, all of which need `source_ref`s |
| material properties | irrelevant | a `materials.json` with its own schema, and CINDAS as the source of record |
| criterion | `≥ 0` on a length, binding end varies | `≥ 0` on interference, binding end is always the worst-case minimum |
| what the source workbook is | a stack to re-derive | a stack to re-derive **and** a method to disagree with |

The two that a registry has to solve, rather than just record:

- **Generated checks cost reviewability.** A hand-authored term list is the
  repo's whole safety property. Generating them buys correctness (no stale
  coefficient in a data file) at the price of a reader not seeing the signs. The
  compromise here is `tests/debug_report_thermal_fit.py --terms --markdown`
  pasted into the worksheet, and it is a compromise, not a solution.
- **Non-dimensional inputs have no home.** CTE, temperature and stiffness ratio
  are the *least* traced numbers in this stack and the ones with no
  `StackElement` to carry their `source_ref`. They ended up in three different
  ad-hoc places (a materials file, a `temperature_source` key, a per-chain
  `stiffness_ratio.source_ref`). A third archetype will add more. That wants one
  shape.
