# Lesson — linear_stack_conversions (worked 2026-09-08)

Handoff `HANDOFF_20260908_linear_stack_conversions.md`, branch
`handoff/linear_stack_conversions`, cut from `integration`. Deliverable:
re-express the remaining linear stacks as `dimension_ref` topologies, one
topology + studies per stack, following `topology_vpa_output_to_pitch_plate.json`'s
L1 pattern.

## What converted, and what didn't

- **`pitch_link_to_pitch_plate`** (6 elements, 3 paths, 2 checks) — converted.
  `topology_pitch_link_to_pitch_plate.json` + three studies
  (`study_pitch_link_shank_out.json`, `study_pitch_link_cotter_hole_clearance.json`,
  `study_pitch_link_thread_region_t.json`).
- **`rotor_fastener_length`** (11 elements, 1 path, 9 checks) — converted.
  `topology_rotor_fastener_length.json` + **nine** studies (one per grip
  option), not the one study the handoff's shorthand described — see "Nine
  studies, not one" below.
- **`tan_link_to_pitch_plate`** (take 1) — **NOT converted, per the handoff's
  own instruction**: `topology_schema_v1`'s lesson investigated and fenced
  path-referencing check terms rather than shipping a shape for them
  (`docs/DAG_TOPOLOGY.md`'s "A study, in outline" section, the paragraph
  ending "Path-referencing check terms stay stack-side"). This stack's six
  checks each mix a `path` term with individually-signed elements
  (`shank_out__13_thick`'s terms are `{"path": "bore_max_grip_thick"}`,
  `{"element": "fastener_grip_13", "sign": -1}`, `{"element":
  "thread_transition", "sign": -1}`), which is exactly what is fenced. It
  stays classic-rendered. `tests/test_topology_conversions.py::
  test_tan_link_to_pitch_plate_take_1_has_no_topology` pins the absence.
- **`tan_link_to_pitch_plate_take2`** (9 elements, 1 path, 1 check) —
  converted. `topology_tan_link_to_pitch_plate_take2.json` + one study
  (`study_tan_link_take2_worst_case_protrusion.json`). The stack's own three
  `nut_geometry` elements (diametral, unused by any path or check there) are
  **not modelled** — see "What the topology leaves out", below.
- `hub_bearing_thermal_fit_m1/m2` and `vpa_output_to_pitch_plate` were out of
  scope per the handoff (thermal archetype stays classic; VPA is already the
  L1 proof) and are untouched.

Every check number is pinned exactly (no `pytest.approx`) against the
stack's own `check()`/`path()` output in `tests/test_topology_conversions.py`
— 12 checks plus one path cross-check, 13 value-level assertions total, all
green on the first design (verified interactively against a live
`load_topology`/`check_study` call before committing any file, not derived
by hand-tracing signs and hoping).

## Nine studies, not one (rotor_fastener_length)

The handoff described this deliverable as "One study, nine authored checks."
That shape is not reachable with `tolerance_stack.topology.check_study` as it
stands, and the handoff explicitly put `tolerance_stack/` out of scope, so I
built nine studies instead rather than either (a) modifying the module or (b)
silently accepting a check that doesn't match the stack's own published
numbers.

The reason: `check_study`'s `limit` branch builds a **zero-width point**
Dimension (`min == max == nominal == limit["value"]`) — correct for its
designed case, an external fixed requirement, but it collapses any real
tolerance band handed to it. Each of the nine `fastener_grip_uXh` elements
carries its own genuine ±.010 in band, and the check's own published
worst-case/RSS fields depend on that band surviving the fold. The "no
`limit`" branch is fully ranged but reads a `Study`'s own fixed `selection` —
one chain per `Study` object, chosen once. A single study's chain cannot be
"the two washers plus u2h" for one check and "the two washers plus u10h" for
another; `Study.selection` does not vary per `check_id`. So nine ranged,
mutually-exclusive fastener options need nine chains, which — given
`check_study` cannot be extended this session — means nine `Study`
documents. Filed as `docs/issues/ISSUE_20260908_check_study_limit_cannot_carry_a_ranged_value.md`
(`audience: strategy`) for whether a future schema pass wants a cheaper
shape (e.g. a per-check additional ranged term). `docs/DAG_TOPOLOGY.md`'s new
section for this topology and the topology's own `notes` both record the
same reasoning, so a future reader hits it from either direction.

The nine-parallel-edge shape this forced turned out useful on its own terms:
selecting more than one of the nine `fastener_grip_uXh` edges in one study's
`selection` is refused by `BranchAmbiguity` at both `head_bearing_face` and
`shank_full_dia_end` — the topology mechanically enforces "exactly one dash
is ever installed" rather than only saying so in prose.

## What the element-order reading had to decide

Every conversion reads nodes and edge orientation off the stack's own element
order and notes, exactly as `topology_vpa_output_to_pitch_plate.json`'s own
`provenance.structure` does for L1 — **not** a sourced claim about which
faces actually touch. A future reviewer should re-derive these, the same way
L1's own "OPEN, for Jeff" notes ask for a re-check against DETAIL X:

- **`pitch_link_to_pitch_plate`**: the missing pitch-link eye (unsourced —
  no document in this repo gives its width) sits physically between the
  bushing and the pitch-plate lug per the stack's own notes, but is **not**
  modelled as a node or edge — there is no element to hang one on, and
  inventing a placeholder would be exactly the invention the repo's one rule
  forbids. The topology's `bushing_pitch_plate_face` interface reads the
  stack's own arithmetic (which simply omits the eye), not a claim that the
  bushing and the lug actually touch. The bolt's own three fastener
  dimensions (grip, overall length, cotter-hole-to-point) are read as edges
  sharing two additional interfaces (the bolt's point, the cotter-hole
  centreline) not present in any other conversion here — this is the one
  conversion whose graph is not a simple chain (2 grounded loops, 3 branch
  points), and a reviewer should confirm the bolt-point/cotter-hole reading
  against NAS6403 sheet 1's own figure, the same figure the stack's
  `cotter_hole_from_point` element's own `source_ref.note` already flags as
  worth a second look.
- **`rotor_fastener_length`**: the nine grip options are modelled as one part
  (`fastener_family`) rather than nine, because they are mutually-exclusive
  alternatives of a single selected feature, never simultaneously present —
  see the part's own note for why nine separate part ids were rejected
  (`Node.parts` refuses more than two per interface outright, and nine
  simultaneous parts would misrepresent alternatives as members). This is a
  repo-first modelling pattern; a reviewer new to it should read that note
  before assuming it is an error.
- **`tan_link_to_pitch_plate_take2`**: `flange_bushing_flange` and
  `flange_bushing_L` are modelled as two dimensions of **one** flanged-bushing
  part (unlike L1's `bushing_flange_thickness`, whose part is left
  deliberately unidentified and separate from the straight bushing) — because
  the stack's own element names ("flange bushing flange", "flange bushing
  L") say so directly, where L1's referenced element named no part at all for
  its flange. `bushing_chamfer` is the one genuine **inverting element**
  across all three conversions: authored running from the effective clamped
  face back to the raw barrel end, so a forward-walking chain crosses it
  against its own orientation and subtracts it — the same mechanism the
  module docstring describes for a negative-vs-oriented-edge sign, applied
  for the first time in this repo's committed topologies to a genuinely
  subtracted feature (L1 and L2 have none).

## What the topology leaves out (nothing invented, but named)

`tan_link_to_pitch_plate_take2`'s stack carries three `nut_geometry`
elements — `nut_minor_diameter`, `nut_cbore_diameter`, `nut_chamfer_depth` —
that its own notes call "UNUSED by any path or check", diametral quantities
starting a castellation-engagement analysis the workbook itself never
finished. These are **not** modelled as topology nodes/edges: they sit on a
different geometric axis (a diameter, not a length along the bolt) than
everything else in this graph, they contribute to no check being reproduced,
and modelling them would require either inventing a plausible connection to
the rest of the graph or accepting a disconnected component with no
precedent in this repo's committed topologies. Recorded as an absence in the
topology's own `provenance.structure`, the same way L1 records the
castellated nut as out of scope rather than modelled.

## Verification

- `venv-win\Scripts\python.exe -m pytest -q`: 739 passed, 1 skipped (the
  skip is the same pre-existing, gitignored-data-absent skip prior sessions
  recorded — unrelated to this session).
- Every new check/path reproduction was validated interactively (a live
  Python call comparing `check_study`/`summarize` against the referenced
  stack's own `check()`/`path()`) before being locked into
  `tests/test_topology_conversions.py`, catching two sign/count mistakes
  before they became committed numbers:
  - the rotor topology's cycle-rank prose said "8 grounded loops" (one per
    grip option) where the graph's actual independent-cycle count is 9 —
    fixed after computing it, not guessed at.
  - two DAG_TOPOLOGY.md/topology-note sentences accidentally became
    two-or-more-label "inventory sentences" under
    `tests/test_topology.py`'s doc-scan (`stated_counts`/`inventory_sentences`)
    by pairing an unrelated small number ("two more interfaces", "one part")
    next to a correct one in the same sentence — reworded to drop the
    stray digit rather than silence the guard.
- `scripts/build_topology_projection.py` run against a **scratch**
  `--data-root` (not the shared main-checkout `data/`): exits 0, all three
  converted topologies and their studies (13 total) appear with correct
  contribution counts and no orphan studies. **Not** run against
  `C:\workspace\tolstack\data` itself — the provenance gate refused
  (`master` is 7 commits ahead of this branch), and forcing it with
  `--allow-older-tree` would have overwritten the shared projection every
  other concurrent worktree reads, which is exactly
  `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`'s
  own scenario. The scratch-root run proves the script's logic is correct
  for this tree without touching shared state; the reviewer or the operator's
  eventual `integration` → `master` batch merge is the right point to run it
  against the shared root for real.
- Did not run `forge check` — no new top-level directory or layout change,
  only new `docs/topologies/*.json`, `docs/issues/*.md`, and one new
  `tests/*.py` module.
