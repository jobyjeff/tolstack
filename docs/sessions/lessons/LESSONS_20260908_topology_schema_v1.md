# Lesson — topology_schema_v1 (worked 2026-09-08)

Handoff `HANDOFF_20260908_topology_schema_v1.md`, branch
`handoff/topology_schema_v1`, cut from `integration`. Deliverable: close the
short list of schema gaps that kept a linear stack and a topology existing as
separate rendered classes, and make `docs/SOP_TOLERANCE_STACK.md` topology-first.

## What changed

- **`tolerance_stack/topology.py`**
  - `Topology` gains an optional `joint: Dict[str, Any]` field (default `{}`),
    the same free-form assembly/context block a stack's `joint` carries
    (`assembly_drawing`, `assembly_revision`, `sheet`, `view`, `zone`,
    `zone_note`, `description`, `scope`). Unvalidated prose, never read by
    `fold`/`traverse`/`summarize`. `load_topology` reads it off `data.get(
    "joint", {})`.
  - `Study` gains an optional `configuration: Dict[str, Any]` field (default
    `{}`), the same descriptive-only shape a stack check's own `configuration`
    already has. Picked up automatically by `Study.from_dict`'s existing
    generic field filter — no change needed there.
  - `check_study()`'s `limit` is now **optional**. With a `limit`, behaviour is
    byte-for-byte unchanged (the branch is the same code that was there
    before). With no `limit`, the criterion applies directly to the study's
    own `summarize().interval` — no second fold introduced, since that
    interval is already the output of the one `fold()` inside `summarize()`.
    This is deliverable 1's acid test: `study_vpa_output_shank_out.json` now
    carries a `checks` entry, `worst_case_shank_out`, with no `limit`, and
    `check_study()` reproduces `stack_vpa_output_to_pitch_plate.json`'s own
    published `worst_case_shank_out` — interval, verdict, criterion, units —
    exactly (`tests/test_topology.py::
    test_the_l1_studys_own_authored_check_matches_the_stacks_check_exactly`).

- **`docs/topologies/study_vpa_output_shank_out.json`**: the `checks` entry
  above, plus a note explaining why it carries no `limit`.
- **`docs/topologies/topology_vpa_output_to_pitch_plate.json`**: a `joint`
  block mirroring its stack's field for field (the worked example for
  deliverable 2). `topology_pitch_system.json` deliberately carries none — it
  spans a whole mechanism, not one joint.
- **`docs/topologies/topology_pitch_system.json`**: `provenance.worksheet:
  "docs/tolerance_stacks/WORKSHEET_end_stop_graft.md"` — the worksheet-home
  field (deliverable 3), homing the pre-existing, previously orphaned
  worksheet.
- **`docs/topologies/study_pitch_system_gas_spring_branch.json`**: a
  `configuration` block naming its load case (`"collective"`) — the worked
  example for deliverable 5's gap 3.
- **`scripts/build_topology_projection.py`**: a new `worksheet_for()` (mirrors
  `scripts/build_viewer_projection.py`'s own, declared-`provenance.worksheet`-
  first, then `topology_X.json` → `WORKSHEET_X.md` by name), wired into
  `project_topology()` as `worksheet_file`/`worksheet_source`. `project_
  topology()` also emits `joint`; `project_study()` emits `configuration`.
- **`docs/DAG_TOPOLOGY.md`**: documents all of the above; sweeps "What v0
  cannot do" (see below); adds a versioning section; adds a fencing paragraph
  for path-referencing check terms (see below).
- **`docs/SOP_TOLERANCE_STACK.md`**: a new "Topology first: a stack is the
  linear degenerate case" section, right after the intro/reviewer-checklist
  paragraph and before "The one rule" — states the 2026-09-08 workspace
  decision, says which document to start from, and says explicitly that the
  citation core (this file) and Steps 2–6 apply unchanged to a topology edge's
  `Dimension`. A one-sentence cross-reference was also added to "The four
  schemas" section, just after the four-row table. Deliberately **not** a full
  restructuring into a topology-first document — see "What I chose not to do",
  below.
- **`ARCHITECTURE.md`**: the `topology.py` table gets rows/notes for `joint`,
  `configuration`, and `check_study` (which the table never mentioned at all
  before this session, though it existed since 2026-09-06 — an omission from a
  prior handoff, quietly fixed here rather than filed, since I was already
  editing the same table for the same module).
- Tests: `tests/test_topology.py` §1 (the acid test) and a new §11 (`joint`,
  `configuration`, the no-`limit` check shape); `tests/test_topology_projection.py`
  gains four tests for the same four additions through the projection.

## Deliverable 4 — path-referencing check terms: fenced, not built

**Investigated and fenced.** `stack_tan_link_to_pitch_plate.json`'s checks mix
a named `path` term with individually-signed elements
(`shank_out__13_thick`'s terms are `{"path": "bore_max_grip_thick"}`,
`{"element": "fastener_grip_13", "sign": -1}`,
`{"element": "thread_transition", "sign": -1}`). A stack's `path` is a name
resolved by `StackDefinition.paths`, a dict local to the **same file**. A
topology's nearest analogue is a `Study`, and studies are deliberately
separate documents — nothing in this repo indexes them by id the way a stack
indexes its own paths, so building the equivalent means either a new
cross-study lookup passed into `check_study` (which currently needs nothing
outside the one topology and the one study it is given), or resolving another
study by re-reading the topology directory from inside `topology.py`, which
would give the module filesystem-search behaviour it does not otherwise have.

Worse than the plumbing: combining two studies' totals under independently
authored signs reopens the branch/cycle question `traverse()`'s guards exist
to refuse. Two different studies over one topology may legitimately share
edges or nodes (the four pitch-system studies all touch edges the others do
too), and nothing would check whether a given combination is two independent
contributions or one physical quantity counted twice — a guarantee the cycle
guard gives for free *inside* one chain, and would not give across two chains
combined after the fact. That is exactly the shape of thing "Not a solver"
fences: not literally choosing a branch, but silently assuming two studies'
outputs compose additively when nothing checked that they do.

**Verdict for `linear_stack_conversions` to read**: path-referencing check
terms stay stack-side. Converting `tan_link_to_pitch_plate` to a topology
means either flattening each such check's term list by hand (inlining the
named path's own terms into the check, which changes nothing arithmetically —
signs and coefficients already multiply through nesting — but does mean the
check is no longer *authored* against a reusable named path) or keeping that
stack's checks on the stack side of a `dimension_ref` re-expression rather
than porting them onto the topology's own `study.checks`. Documented in
`docs/DAG_TOPOLOGY.md`'s "A study, in outline" section and in "What v0 cannot
do" (added as a fifth, schema-pass-only item, since it was found writing this
handoff rather than building L2).

## "What v0 cannot do" — swept, per the handoff's instruction

Of the four gaps recorded 2026-08-31:

- **Gap 3 (load cases) — closed.** `Study.configuration`, the cheap shape the
  document itself already named.
- **Gaps 1 (a weight from `properties`), 2 (a non-chain contributor) and 4
  (position-dependent transforms) — still open, re-fenced with a dated
  (2026-09-08) note each**, rather than silently left as written on
  2026-08-31. None of the three had a real value to design against this
  session (the affected rows are still `kind: "assumed"` placeholders), so
  building a shape for any of them now would be designing against nothing —
  the same trap this repo's "don't invent" rule exists to catch one level up
  the stack. Left for whichever session next has a real sourced number behind
  one of these three.

## Schema versioning — stayed at `/v0`

Every field this handoff added is optional, defaults to an empty value, and is
read by nothing `fold()`/`traverse()`/`summarize()` touches — a document
authored before any of them existed loads and folds identically, because there
is nothing in it for the new fields to be missing. That is the exact shape
`hardware_entry/v0` already used for `values_source` (`docs/SOP_TOLERANCE_STACK.md`
Step 4: "`hardware_entry` stays `/v0` because the field is additive and no
reader breaks on it"), so I followed the repo's own precedent rather than
inventing a `/v1`. Both existing topologies and all eight studies load and
fold to the identical numbers before and after — checked, not merely claimed:
the whole pre-existing test suite (676 tests, 1 pre-existing skip) is green
unchanged, and the new tests added this session check the new fields
specifically rather than replacing any old assertion.

## What I chose not to do

- **A full topology-first rewrite of `docs/SOP_TOLERANCE_STACK.md`.** The
  handoff's wording ("becomes the procedure... presented as the degenerate
  case") could be read as restructuring the whole document. I added a framing
  section at the top instead, and left every existing anchor (`test_sop_
  vocabulary.py`'s two pipe-list anchors, the traced-ratio numbers, the Step
  0–8 headings) untouched. Reasoning: the file is paired against the code by
  several fragile string-anchored tests (a `body.find(anchor)` that must match
  **exactly once**), and the handoff's own "the citation core... moves
  intact" instruction argues for the same conclusion — moving prose around a
  1000-line, heavily cross-referenced procedural document, under a session's
  time budget, is a good way to silently break an anchor a doc-scan guard
  reads and not notice until a much later session's edit lands on the wrong
  line. If a future session wants the fuller restructuring, the new
  "Topology first" section is the seam to cut along.
- **Deliverable 4's cross-study check composition.** Fenced, not built — see
  above.
- **Populating `configuration` on every existing study.** Only
  `study_pitch_system_gas_spring_branch.json` got one, as the worked example
  the gap-3 closure needed. The other six studies (blade-angle worst/average,
  the two end-stop studies, vertical-hub, gas-spring-stroke, and L1's own)
  were left alone: none of them represents an ambiguous or contested load
  case the way the gas-spring branch does (it is explicitly one of two
  statically-redundant parallel paths), so writing something for the sake of
  it would be exactly the "fill it in to look finished" failure mode this
  repo's citation discipline exists to refuse, one level removed from
  citations.

## Verification

- `venv-win\Scripts\python.exe -m pytest -q`: 676 passed, 1 skipped (the
  skip is `REQUIREMENTS_PULL`-gated and pre-existing, gitignored data absent
  in this worktree — unrelated to this session).
- Ran the topology/projection/SOP test modules individually at each stage
  while editing, not only at the end.
- Did not run `forge check` (Step 7's forge-conformance step) this session —
  no new top-level directory or layout change was made, only edits inside
  `tolerance_stack/`, `scripts/`, `docs/`, and `tests/`, so nothing this
  session could plausibly have broken there.
