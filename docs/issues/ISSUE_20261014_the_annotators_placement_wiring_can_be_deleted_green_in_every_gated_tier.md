---
type: chore
priority: med
status: triaged
area: apps/annotate/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20261014_parts_sit_where_the_assembly_puts_them.md
handoff: docs/sessions/HANDOFF_20261015_annotate_gated_browser_suites_follow_the_three_part_mock.md
class: gated_tier_not_run_by_the_handoff_that_changed_its_subject
---

# The annotator's placement wiring can be deleted green in every gated tier

## What was measured (review of `parts_sit_where_the_assembly_puts_them`, 2026-10-14)

The handoff's central deliverable is that every opened part is drawn where the
assembly puts it. On the scene side it is one composition in `app.js`:

```
state.scene.placementsFor = async (sha256) => { ...; return rest.placements.length ? rest.placements : null; };
```

The mutation used: that return was changed to `return null;`, which puts every
part back at its own origin, the pre-handoff picture. Results:

- `node apps/annotate/run_tests.cjs`: **182/182**. The fast tier pins the pure
  helpers (`AA.readMeshOccurrences`, `AA.restPlacements`, `AA.sweepDrawPlan`),
  and it cannot boot `app.js`.
- `node scripts/run_viewer_browser_tests.mjs --only annotate`: **5/5**. One run
  showed a single red on "a real click on the face tints it", but that is the
  known edge-on flake (`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`),
  and the `--only "rail filter"` replay was green.
- `node apps/annotate/run_browser_check.mjs` (mock pass): **red**, on "an opened
  part is drawn at EVERY occurrence the assembly records, at its own placement,
  outside sweep mode".

So the only check that sees the deliverable is in `run_browser_check.mjs`, and
neither a gate nor the mutation tier reaches that file. Row 4 of
`ISSUE_20261001_four_sweep_mode_gaps_the_handoff_left_and_nobody_owns.md` is
the general form of this gap. This issue is the measured instance for the
placement rule, and it is the shape the review overlay's "two pure helpers both
pinned, and their composition in `app.js` pinned by nothing" entry warns about.

## The fix shape

Port one assertion into a gated tier, so the mutation tier can witness it. The
candidate is `scripts/run_viewer_browser_tests.mjs`'s annotate suites, whose mock
part has two recorded occurrences. The assertion is
`window.__scene.drawnPlacements(sha)` equals the fixture's two
`placement_world`s after an `open-part`, plus a mutation spec that nulls
`placementsFor`'s return. The pick-on-a-repeat assertion (same `(sha, face)`
on occurrence 1 as on occurrence 0) has the same problem and the same fix,
because the fast-tier guard for it feeds `AA.geometryKeyOfPick` a hand-built
pick and never raycasts a repeat.
