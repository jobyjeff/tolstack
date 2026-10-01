---
type: bug
priority: high
status: open
area: viewer / projections
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260930_nav_tooltip_once_and_rail_hover_emphasis.md
---

# Since the freshness gate, one worktree's rebuild does not redden the others — it DISARMS them, retroactively

The shared-projection coupling is a known class, triaged into
`docs/strategy/BRIEF_20260914_real_tier_shared_projection_coupling.md` via
`ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`.
This is not a second report of that. It is filed because **the consequence
changed on 2026-09-30** and the brief describes the old one.

## What the brief says happens, and what now happens instead

The brief's mechanism: two worktrees each rebuild the shared projection, and
each then sees a `[real]` failure naming a field it did not add. Red, confusing,
but *the tier runs* and the failure is about fixtures.

What happened on 2026-09-30, measured:

* At ~19:55–20:05 this handoff's session ran its full suites against
  `C:\workspace\tolstack\data\projections\viewer\` and recorded them green —
  `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` **522/522 with
  no tier skipped**, including the pairing check `[real] the projection this
  tier reads was built from this tree`, and `node
  scripts/run_viewer_browser_tests.mjs --repo …` **25/25 suites**.
* At **20:25:57, 20:27:17 and 20:29:00** the three projection files were
  rewritten by another session.
* Their stamps are `5e69149`, `afaa60e` and `4bbc869`. All three commits exist
  on **`handoff/vpa_pitch_linkage_topology_and_feature_fits` and nowhere
  else** — an in-flight, unreviewed, unlanded handoff branch. `integration`
  does not contain them.
* From that moment the same command in this worktree does not go red on a
  fixture. It **refuses the whole `[real]` tier**:

  > `projection NOT paired with this tree -- the [real] tier is stale`
  > `FAIL [real] the projection this tier reads was built from this tree`
  > `… 4 of its input file(s) differ in this tree: docs/topologies/part_mesh_aliases.json, docs/topologies/topology_vpa_pitch_linkage.json, tolerance_stack/feature_geometry.py, tolerance_stack/topology.py`

  ~86 `[real]` checks stop running, and `tests/test_viewer_js_suite.py` is red
  for a reason that has nothing to do with the branch it is run on.

## Why this is worse than the brief's version, not just different

1. **It is retroactive.** A session that had already finished verifying had its
   verification invalidated by a write it did not make and cannot see. The
   record in its report is still true *of the moment it ran* and unreproducible
   afterwards — which is exactly the property a test record is supposed not to
   have.
2. **It takes the mutation-witness tier with it.** Every `fast` spec reports
   `TIER_ALREADY_RED` — 59 of 132 declared mutations proving nothing in the run
   measured here — because the clean run is red before any mutation is applied.
   The runner says so and exits 1, correctly; the point is that the whole tier's
   fast half is unavailable to every worktree until the projection is arbitrated.
3. **The provenance gate cannot catch it, by construction.** The builders refuse
   a tree they do not *contain* (`scripts/projection_provenance.py`, exit 3).
   The rebuilding branch contained `integration`, so the gate correctly let it
   through. The gate is about *older*; this is *divergent*, and divergence
   between two live handoff branches is the normal state of this repo.

## The question for a strategy agent

Not "whose rebuild wins" — that is a scheduling answer to a design problem. The
two shapes worth weighing:

* **Nobody rebuilds the shared projection from a handoff branch.** Rebuilds
  happen at the batch merge, from `integration`, and a worktree that needs a
  paired projection builds a private one under its own gitignored root. Cost:
  the builders' inputs (`data/inbox/`, the crop PNGs, drawing-checker's venv for
  `build_viewer_crops.py`) are all main-checkout paths today, so "build a
  private one" is not currently a thing an agent can do — that is the work.
* **The `[real]` tier stops reading one shared projection at all.** The brief's
  own territory; this instance is evidence for it rather than a new idea.

Either way the immediate operator question stands and is not an agent's to
answer: `data/projections/viewer/` currently belongs to an unlanded branch, and
every other live worktree's `[real]` tier is refused until that is resolved.
