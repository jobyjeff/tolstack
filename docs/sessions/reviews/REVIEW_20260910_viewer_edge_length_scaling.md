---
type: review
handoff: viewer_edge_length_scaling
reviewer: agent (review/viewer_edge_length_scaling)
date: 2026-09-10
verdict: APPROVE
blockers: 0
---

# Review — viewer_edge_length_scaling

Two commits on `handoff/viewer_edge_length_scaling` (`6e27e58` work +
`b7bbc33` lesson), fast-forwarded onto `review/viewer_edge_length_scaling`
(cut from `integration` at `3031405`, the same tip the handoff branch was cut
from — no conflict, and `HEAD..integration` empty at verdict time). Scope
holds: the diff touches only `apps/viewer/`,
`scripts/run_viewer_browser_tests.mjs` and one lesson — nothing in the
do-not-touch list (`views/banner.js`, `storage/`, `apps/annotate/`, the
projection builders, `docs/topologies/`).

## The seven mandatory checks

Viewer display work, not a stack — each exits with its reason, not silently:

1. **Provenance of element values — N/A, verified no values moved.** No stack
   JSON, topology document or hardware entry changed. The shared
   `topologies.json` was built by the previous review's worktree at `e5a6981`,
   an ancestor of this tree, and `git diff e5a6981..HEAD` over every builder
   input (`docs/topologies/`, `docs/tolerance_stacks/`, the three build
   scripts, `tolerance_stack/`) is empty — the projection is provably current
   for the merged tree without a race-prone rebuild.
2. **Signs on path terms — N/A.** No term list touched. The new JS arithmetic
   is screen-proportion geometry (see the no-second-combiner note below).
3. **LMC/MMC direction — N/A.** No element fields read or written beyond
   `dimension.{nominal,min,max,plus_minus}` as bar-length inputs.
4. **RSS computed — N/A.** No check computation touched; `VA.fmt` unchanged,
   values still printed verbatim.
5. **Nominal inside min/max — N/A.** No transcription touched.
6. **Quantised constraints — N/A.** No joint hardware in scope.
7. **Traced ratio — unchanged by construction** (no stack files in the diff);
   not restated in any of the new/edited prose (checked README, legend,
   lesson).

## What was verified

- **Suites, re-run by me.** Fixture tier (worktree): 201/201. Real tier
  (`--repo C:/workspace/tolstack`): 247/247 — the tier ran, including the new
  `[real]` variation-only pin. Browser truth tier: 13/13 check groups, both
  file:// and http, topology page 111/111 sub-checks. `pytest -q` in the
  worktree: 759 passed, 1 skipped. Main checkout (`master`, lagging): 750
  passed, 1 failed — `test_viewer_js_suite_is_green` on the same
  `crops by_topology` fixture drift already recorded at `3031405` by the
  previous review (plus the known stale four-forks pin inside it,
  `ISSUE_20260908_pitch_system_four_forks_test_is_stale_not_a_race.md`).
  Master-side lag, untouched by this handoff (it changes neither
  `fixtures.js` nor any builder); the merged tree passes the same tests
  against the same shared data (247/247 above).
- **Both new guards observed failing.** (a) Dropped the `--floored` class in
  `views/topology.js`: the fixture-tier "a floored bar is rendered marked"
  test went red naming the right assertion. (b) Reverted the renderer's bar
  extent to the old `±rowHeight/2` arithmetic (ignoring the store): the
  browser tier's `BARS_MATCH_STORE_IN_PAGE` went red in both the mock and
  `[real]` sections, naming edges and exact drawn-vs-slot deltas
  ("post_height: drawn 24.00 vs slot 154.00") — the DOM-measured check the
  fixture tier structurally cannot make. Both mutations reverted; all tiers
  green after.
- **The lesson's projection field census, re-derived from the live
  projection.** All exact: pitch_system 24/24 dimensioned edges at
  `nominal: 0.0` with real bands (widths 0.03 … 0.2); `min`/`max` populated on
  every dimensioned edge in every topology (so the `2 × plus_minus` fallback
  is indeed dead against today's builds, as the lesson says — and it carries a
  fixture test anyway); `dimension: null` only on the five `value_source:
  "derived"` edges (2 + 1 + 1 + 1 as listed); the other four topologies carry
  real non-zero nominals.
- **The lesson's measured figures reproduce**: uniform pitch_system 1170px
  (45 rows × 26), tolerance-scaled 3325.4px, absolute all-24-floored at
  uniform height (the honest all-marked rendering). 6 × 26 = 156px max bar.
- **DoD walked clause by clause.** Three modes demonstrated in the browser
  tier against real pitch_system, with variation-only edges under both scaled
  modes and the floor applied and marked; leader correspondence re-measured at
  every mode stop, mock and real (`CORRESPONDENCE_IN_PAGE` survives unedited,
  exactly as the leader-grid lesson predicted, because scaled modes only
  stretch — verified structurally: floor = one uniform row, so node ys never
  rise above their uniform positions and stay monotone in walk order, which is
  the fence the prior review told this one to honour); fixture-tier unit
  coverage for `edgeLengthValue` and the floor rules including the
  zero-width-band vs no-dimension distinction and the unstated-nominal-is-
  null-not-zero case; README updated where it documents toggles.
- **Keyed-position seam (deliverable 3)**: `VA.rowPositions` returns id-keyed
  stores; both geometry passes take the store as an argument and default to
  uniform, so every pre-existing caller kept its signature; no animation
  built; the seam (lift the one `rowPositions` call out of the paint) recorded
  in the lesson. The grid deliberately stays out of the store — correct per
  the leader-grid contract.
- **Persistence parity**: no localStorage anywhere in `topology_app.js`; the
  new mode is in-memory session state exactly like `rowDensity` /
  `edgeValueOnly`, and `selectTopology()` doesn't reset it. Unknown mode
  values fall back loudly-enough (uniform label, uniform layout) — pinned by
  the "cozy" test.
- **Vocabulary guards**: `EDGE_LENGTH_MODES` is a UI-preference table like
  `ROW_DENSITIES`, outside the Python-pairing class (no producer writes the
  mode), so no `JS_PAIRINGS` row is due — consistent with the established
  boundary.
- **Hygiene**: `git diff -w` identical to plain diff (no whitespace
  re-emit), zero NUL bytes in all five touched JS files, no harness residue in
  the created lesson, README heading diff adds one section and deletes none,
  `data/inbox/` untouched, nothing written to drawing-checker (no Python or
  pipeline surface in the diff). Shared projections hash-identical before and
  after every suite run (no pollution); main checkout carries only the
  pre-existing untracked `tests/debug_topology_real_render.mjs` noted by the
  prior review.
- **Sibling landings**: `HEAD..integration` empty; `HEAD..master` board
  bookkeeping only — the ordinary trunk-lag shape.

## Findings

**Blockers: none.**

**Should-fix, fixed inline (disclosed):** the handoff introduces the first
genuine arithmetic on projection dimension fields in `apps/viewer/`
(`VA.edgeLengthValue`: `max − min`, `2 × plus_minus`, `|nominal|`) — mandated
by the handoff, correctly commented in place as screen-proportion arithmetic,
and verified here to feed bar lengths only (its callers are `rowPositions`
alone; the value is never printed, rounded into a display string, or compared
into a verdict). But three live documents still stated the old absolute with
no exception, the exact shape
`ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages.md`
documents one layer up: `ARCHITECTURE.md`'s data-flow caption ("renders,
combines nothing"), `apps/viewer/README.md`'s module row (topology.js
inheriting "no arithmetic" via "the same"), and this overlay's own
no-second-combiner entry (which also still named the deleted `app.js` for its
false-positive example). All three corrected inline: the caption and module
row now state the exemption and its boundary (pixels only, never a printed
number), and the overlay entry records the declared exemption plus what a
future diff touching it must be checked for. Also appended checkout
attribution to the lesson's pytest count line (the overlay's own
pasted-suite-line rule). Suites re-run green after all edits.

**Nits: none worth carrying.**

## Note for the next reviewer

The staged flyout/hover-card handoffs will draw near these bars. Two fences to
hold: (1) the floor guarantees scaled modes only stretch — a future mode that
can *shrink* an edge below one row height invalidates both the leader
monotonicity argument and `CORRESPONDENCE_IN_PAGE`'s bbox reading, per the
lesson; (2) any new consumer of `VA.edgeLengthValue` that formats, prints or
branches a verdict on the value is the second combiner the overlay entry now
explicitly refuses — the exemption is for bar-length pixels alone.
