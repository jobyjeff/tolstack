---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-04 — the_viewer_real_tier_follows_the_slide_re_author: clear the six viewer `[real]` reds the slide re-author left on trunk

Source: the 2026-11-04 triage sweep's batch merge of tolstack (integration -> master, 140 commits).
The merge candidate, with all six declared `candidate_inputs` bridged and every projection rebuilt
from the candidate tree by `scripts/rebuild_projections.ps1` (provenance `dirty=False
behind_trunk=0`), ran `node apps/viewer/run_tests.cjs --repo <candidate>` at **629/635**. The same
six reds are already filed three times, each by a review that measured them on `integration` alone:

- `docs/issues/ISSUE_20261103_the_slide_re_author_leaves_six_viewer_real_checks_red_on_integration.md` (high, `fixture_drift`)
- `docs/issues/ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md` (high, `integration_red_real_tier`) — a twin of the one above
- `docs/issues/ISSUE_20261103_the_pitch_system_real_pins_are_one_leader_behind_the_merged_topology.md` (med)

No handoff routed any of them, and the sweep merged past them (merged-with-known-red), so they are
now trunk's. The cause is `b4b641db` ("topology: the pitch plate's slide is the mount's bushings on
the piston body", handoff `the_slide_joint_is_the_mounts_bushings_against_the_piston_body`), which
re-authored `docs/topologies/topology_vpa_pitch_linkage.json` and the topology builder. Its review
listed the viewer `[real]` tier under "Not run", so nothing measured it before it landed. Later
landings moved the counts further (`each_stop_is_its_own_stack`,
`the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit`).

Baseline: tolstack master `3062127c` (the 2026-11-04 batch merge of integration `d52b50f7`); trunk itself measured 629/635 with the same six after the post-merge rebuild. Scope:
`apps/viewer/tests.js` (the pins), `apps/viewer/README.md` (its declared spine/fit/centring numbers),
`apps/viewer/topology_fixtures.js` (regenerated, never hand-edited), `docs/topologies/topology_vpa_pitch_linkage.json`
(only the one authoring defect below), `docs/issues/`. Do NOT touch the mutation-witness registry
(`scripts/mutation_witnesses/`) except for specs whose anchor your own edit moves, and do not touch
`apps/annotate/`.

## The six reds (measured 2026-11-04 on the candidate)

1. `[real] the pitch system's grouping is the leader rule at work: internal interfaces are omitted, boundaries are drawn, and a part revisited on a later branch gets a merged row per visit` — `not equal: 63 !== 62`
2. `[real] on pitch_system, a band polygon wears its own leader band's parity and a rendered row its own body's tint, value for value` — `62 leaders cut the grid into 63 bands: 64 !== 63`
3. `[real] every number apps/viewer/README.md states about the spine, the fit and the centring is re-derivable from the live projection` — `README's before-total: 223 !== 219`
4. `[real] the pitch system's five forks are marked` — `expected 25 branch points, got 24`
5. `[real] every live dot answers the SAME on hover and on click, and no live node declares a part it is not incident on` — `vpa_pitch_linkage/pitch_plate_pilot_in_piston_id declares part pitch_plate_215177_001, which no edge incident on it carries: an authoring error in the topology document, not a display bug`
6. `[real] the topology fixture's shapes still match the builder's` — `topologies[].nodes[]: the projection writes [face, hardware_ref] and apps/viewer/topology_fixtures.js does not — REGENERATE it (its header says how)`

## Deliverables

1. **Root-cause each red and say which side is wrong — the pin or the product.** Reds 1–4 look like
   layout counts the re-author moved on purpose (only one pin was updated at the time). Confirm that
   from the diff of `b4b641db` and its successors before updating a pin, and cite the commit that
   moved each count in the pin's comment. If a count moved for a reason nobody intended, the fix is in
   the builder or the topology, and the pin stays.
2. **Red 5 is an authoring defect, not a pin.** Either the node `pitch_plate_pilot_in_piston_id`
   should not declare `pitch_plate_215177_001`, or an incident edge should carry it. Decide from the
   topology document's own `source_ref`s and the slide re-author's lesson
   (`docs/sessions/lessons/LESSONS_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md`).
   Never weaken the guard.
3. **Red 6: regenerate `apps/viewer/topology_fixtures.js`** as its header says; do not hand-edit it.
   The class (fixture drift when the builder gains a node key) recurs —
   `ISSUE_20261026_topology_fixtures_lack_the_tags_fields…` and
   `ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures…` are the last two.
   Say in the lesson whether the builder change that adds a key can be made to regenerate the fixture
   in the same change (a suggestion to investigate, not a requirement).
4. **Close the three issues above** with a verified `resolution:` naming your commit; mark the twin as
   a duplicate of the first.

## Definition of done

- Against projections built from your branch's tree (`dispatch bridge-test-inputs C:/workspace/tolstack .`,
  then `powershell -NoProfile -File scripts\rebuild_projections.ps1` in the worktree, from a committed
  tree), `node apps/viewer/run_tests.cjs --repo <worktree>` passes with zero reds, and
  `node apps/annotate/run_tests.cjs` stays green.
- `venv-win/Scripts/python.exe -m pytest -q` green apart from the documented worktree red
  (`tests/test_viewer_js_suite.py`).
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
  for the specs your hunks reach.
- Lesson (`docs/sessions/lessons/LESSONS_20261104_the_viewer_real_tier_follows_the_slide_re_author.md`):
  per red, pin-stale vs product-wrong, the evidence, and the commit that moved it.
