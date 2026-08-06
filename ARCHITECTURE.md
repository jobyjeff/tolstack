# tolstack — architecture

Tolerance-stack authoring + review, and the spec/datasheet inbox. For the
platform-wide design and the data contracts this repo builds on, see forge's
`DESIGN.md` and `CONVENTIONS.md`. This repo follows the forge standard repo
layout: data in `data/`, code at the top level, projections rebuilt from the
event log.

Founded 2026-08-03 by handoff `tolstack_founding`, importing the
`tolerance_stack_slice1` material from drawing-checker (`PROVENANCE.md`).

## Package layout

```
tolerance_stack/
  __init__.py       re-exports the public names
  stack.py          the shapes + the fold. ~330 lines, stdlib only.
```

`stack.py` is deliberately the whole implementation. Its contents:

| name | what it is |
|---|---|
| `SourceRef` | where a value came from; `confidence`, plus `element_id`/`run_id` held open for feature identity |
| `StackElement` | one ordered element: `nominal`/`min`/`max` lengths, `lmc`/`mmc` as transcribed, `hardware_ref`, `source_ref` |
| `Term` | an element, a sign (`+1`/`-1`), and a positive `coefficient` (default `1.0`), all validated |
| `Interval` | a fold result: nominal, worst-case min/max, RSS center/half |
| `fold(terms)` | **the only place element values are combined** |
| `CheckResult` | a check outcome + the `verdict` property |
| `StackDefinition` | elements + paths + checks; `path()`, `check()`, `all_checks()` |
| `load_stack(path)` | read + schema-check a stack-definition JSON |

```
tolerance_stack/
  thermal.py        the thermal-fit archetype: materials + the corner expander.
                    ~200 lines, stdlib only, no arithmetic of its own beyond
                    thermal_factor(). Added 2026-08-05.
```

| name | what it is |
|---|---|
| `MaterialEntry` | one material's CTE with a `values_source`-shaped citation and a `gaps` list |
| `load_materials(path)` | read + schema-check `docs/tolerance_stacks/materials.json` |
| `thermal_factor(cte, dT)` | `1 + dT * cte * 1e-6` — the archetype's one new arithmetic primitive |
| `ThermalFitInterface` | one member-pair: inner/outer element ids, materials, stiffness split |
| `expand_thermal_fit(stack, materials)` | turn a `thermal_fit` block into `checks` whose terms carry the weights, then hand them to `fold()` |

There is no pipeline, no CLI, no service. A stack is authored by hand (by an
agent following the SOP) into JSON, and the module makes that JSON *executable*
so tests can pin the numbers. Nothing generates a stack automatically yet.

### Why one `fold()`

A path through the joint ("bore min grip length") and a check over it ("fastener
grip minus that path") are the same object: a list of `{element|path, sign}`.
Modelling them identically means worst-case and RSS are computed in one place,
and **there is exactly one line where a sign can be wrong** — the single most
consequential arithmetic error a stack can contain, and the one an eyeball check
of plausible-looking totals will not catch.

Signs multiply through nesting: a `{"path": p, "sign": -1}` term expands to `p`'s
own terms with every sign flipped, so nesting never changes the arithmetic. The
same holds for coefficients, which multiply through.

### Where computation may live — and the coefficient

The rule that matters is not "no new code does arithmetic". It is **one place
where element values get combined**. A second combiner is what makes a sign error
undetectable; a per-term *weight* does not, because it is visible in the JSON next
to the sign it scales.

So when the two-stage thermal fit arrived (2026-08-05,
`hub_bearing_thermal_stack`) needing three things `fold()` could not express —
a diametral term worth twice a radial one, an isothermal soak that multiplies a
diameter by `1 + ΔT·α`, and an interference split across two members by a
stiffness ratio `k` — the answer was **not** a second engine. `Term` gained a
positive `coefficient` (default `1.0`), the effective weight is
`sign * coefficient`, and the whole archetype folds through the existing
primitive. Every stack authored before it folds to the same numbers; the seeded
three re-derive against the 260729 workbook with a largest delta of 6.4e-15,
unchanged.

Two consequences worth knowing:

- **Direction stays in `sign`.** `coefficient` must be `> 0` and a test enforces
  it. A term with a negative coefficient would have two places to be backwards,
  which is the property this design exists to remove.
- **A coefficient scales the RSS half-range linearly**, where duplicating a term
  scales it by √2. That difference is the reason a sleeve's two walls are
  `coefficient: 2` on one element rather than the element listed twice: the two
  walls are *one turned dimension*, perfectly correlated, and listing it twice
  understates the half-range by 29%.

`thermal.py` computes **weights** — thermal factors, `2k`, `1−k`. It never
combines two element values. That is the line, and it is the one to hold if a
third archetype wants its own layer.

### Material condition is not an extreme

`fold()` reads `min`/`max` **lengths** only. It never reads `lmc`/`mmc`. Those
are carried as transcribed so a worksheet can be checked against a source sheet
column-for-column, and because the mapping to min/max is not fixed: in the
seeded tan-link stack the bushing chamfer has **LMC 0.889 > MMC 0.635** (more
material removed = least material), and the chamfer is subtracted. Code that
derives `max` from `mmc` gets that element backwards and still totals plausibly.

### What RSS here does and does not claim

`fold()` combines each term's half-range in quadrature about the *midpoint* sum.
That treats every band as an independent, symmetric, equal-confidence variate.
Two element kinds in the seeded stacks are not:

- `role="allowance"` (the thread transition, min 0 / max 1.5875) is a
  deterministic geometric bias. RSS re-centers it at 0.794, which is most of why
  `shank_out__14_thick` reads nominal −0.7153 but RSS center −0.077.
- one-sided bands (the spherical bearing, −0.05/−0) are not symmetric about
  their midpoint.

So RSS is a **relative softening indicator**, not a probability statement, and
is not directly comparable to the worst-case columns. `CheckResult.verdict`
deliberately never reads RSS.

## Data flow

```
data/inbox/specs/         (append-only spec + datasheet pile — the trace targets)
data/inbox/tolerance_stacks/  (source workbooks; gitignored, provenance committed)
        |
        |  hand transcription, by an agent following docs/SOP_TOLERANCE_STACK.md
        v
docs/tolerance_stacks/*.json   (stack_definition + hardware_entry — COMMITTED)
        |
        |  tolerance_stack.fold  (via load_stack / path / check)
        v
check_result/v0  (produced on demand, never stored)
        |
        v
docs/tolerance_stacks/WORKSHEET_*.md   (the human-readable result + findings)
```

Nothing lands in `data/runs/` yet: no run-producing pipeline exists here. The
`data/runs/` and `data/projections/` skeletons are the standard-layout
requirement, held for when a stack synthesizer does produce runs for forge to
ingest.

## Cross-repo dependencies

Read-only, one way:

- **drawing-checker** — `data/runs/<run>/*_balloons.json` (parts list + balloons)
  and the drawing PDFs are how an element gets traced to a callout. Two of the
  imported debug tools take a drawing-checker path as an argument. Nothing here
  writes into that repo.
- **forge** — the atomic-notes attachment stream is the upstream of the source
  workbook (see `data/inbox/tolerance_stacks/PROVENANCE.md`). Forge attachments
  are immutable; treat copies as read-only.

## Known modelling gaps (inherited, not fixed)

Both seeded joints are retained by a **slotted/castellated nut + cotter pin**.
The governing constraint there is castellation-slot vs cotter-hole alignment,
which *quantises* acceptable grip rather than bounding it. The stacks model a
plain nut and a continuous grip, so their shank-out numbers do not settle either
joint. This is stated, not hidden — see the SOP's castellated-nut caveat and
findings F8/F16 in `docs/reference/`.

The binding constraint on nearly every value is the **absence of a fastener-spec
library**: 1 of 17 element instances across the three seeded stacks is `traced`.
`hardware_entries.json` carries a per-entry `gaps` list, and those lists are that
library's intake queue.
