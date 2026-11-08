---
type: bug
priority: high
status: resolved
area: tests
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
handoff: docs/sessions/HANDOFF_20261106_the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id.md
resolution: triaged 2026-11-06 (triage) -- the batch merge took it onto master as a known red; staged the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id -- handoff completed 2026-11-08 -- closed automatically by dispatch when handoff `the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id` moved to completed/; not independently verified.
---

# Two kinematic-page browser checks still match the edge names `2e97a77a` renamed

`2e97a77a` (stack_wording_drops_filler_and_the_hover_says_the_same_thing)
shortened every element and edge name in
`docs/topologies/topology_vpa_pitch_linkage.json`, including:

| edge | before | after |
| --- | --- | --- |
| `pitch_plate_attach_height` | pitch plate spindle axis to pitch-link attachment bore, height | spindle axis to pitch-link bore height |
| `tan_link_mount_height` | tangential link mount base face to attachment bore | base face to attachment bore |

Two checks in `scripts/run_viewer_browser_tests.mjs`'s "kinematic study page"
suite still match the old phrases, so both are red on `integration`:

- `[real] hovering a sensitivity shows its curve across the sweep, both signs of
  the mount height's on its axis` matches `/tangential link mount/` on the card.
- `[real] clicking a term row selects pitch_plate_attach_height in place: …`
  matches `/pitch-link attachment bore, height/` on `#detail`.

**Measured:** red on a detached worktree at integration `5f9a95bf`, with
projections rebuilt from that tree and inputs bridged: `--only "kinematic
study page"` gave 22/24, and these two were the reds. They are red in the same
way on the review branch of
`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`. The
stack-wording review did not run the browser tier. The
everything-in-3d-is-transparent review's 41/41 ran on a tree without
`2e97a77a`. I have not checked which suites made up the rail review's 40/42.

**Fix:** match each check on the edge's new name, or better, on
`data-id` plus the name read from the projection, so a later rename cannot
redden it again. Each check's mutation spec should still witness it after the
change.

## Addendum 2026-11-06 (review of the_grid_and_the_dag_move_with_the_mechanism, round 2)

While this suite is red, the witness gate proves nothing for any spec in it.
At the merged tree `085bc82f`, `--changed-since integration` reached 14 such
entries (12 specs), and every one came back NOT WITNESSED ("the tier was red before the
mutation"):

- `browser__real-at-the-72-stop-the-stack-has-no-travel-and-every-le__40c16feb`
- `browser__real-colouring-by-body-puts-the-overlay-s-ink-on-the-dag__211510a9#1`
- `browser__real-colouring-by-body-puts-the-overlay-s-ink-on-the-dag__211510a9#2`
- `browser__real-hovering-a-stop-s-limit-opens-its-citation-card-s46__f38e2fa9`
- `browser__real-on-the-first-screen-the-verdicts-beside-the-model-t__d19f46ad`
- `browser__real-picking-a-graph-width-in-view-widens-the-drawn-dag__5c3dea5d#1`
- `browser__real-picking-a-graph-width-in-view-widens-the-drawn-dag__5c3dea5d#2`
- `browser__real-the-plot-draws-each-stop-as-an-error-bar-at-its-own__e9fdd0f6`
- `browser__real-the-study-page-reads-one-verdict-chip-per-stop__8aa72944`
- `browser__real-the-toolbar-s-unused-toggle-hides-the-unlit-model-a__38a0757c`
- `browser__real-the-travel-is-one-folded-sub-stack-that-opens-onto__dca7f56b#1`
- `browser__real-toggling-unused-leaves-the-results-pane-s-dom-ident__42842da7`
- `browser__the-kinematic-page-draws-the-model-and-its-stack-in-the__437d3e8b`
- `browser__the-nav-s-kinematic-row-brings-the-page-back-after-a-top__3f89b311`

Once the two checks are fixed, re-run these with `--only`.

## Addendum 2026-11-06 (triage sweep batch merge, `found_by: dispatch/docs/sessions/lessons/LESSONS_20261106_triage_sweep.md`)

This red is **now on master**. The batch merge fast-forwarded master
`66159c33` → `405bad81` (the pre-merge master did not contain `2e97a77a`),
which makes it `merged-with-known-red`. The browser tier ran in the main
checkout after the actuator rebuild stamped `master @ 405bad818750`:
`node scripts/run_viewer_browser_tests.mjs` gave **42/43**, 1640 s. The only
failing suite was `kinematic study page (deep link, chart hover,
contributors, no projection)`, at 25/27, and these two sub-checks were the reds:

- `[real] hovering a sensitivity shows its curve across the sweep, both signs of the mount height's on its axis`
- `[real] clicking a term row selects pitch_plate_attach_height in place: the page stays the study, the model marks it, the preview pane shows it`

Every other tier was green on the candidate: default (1738 passed, 1 skipped),
viewer (666/666), annotate (295/295), and the witness gate (51/51 reached).
The merge went ahead because this red is explained (the test matches stale
prose and the product is fine) and filed, and because holding the merge would
have aged 204 commits. The fix is still unstaged.
