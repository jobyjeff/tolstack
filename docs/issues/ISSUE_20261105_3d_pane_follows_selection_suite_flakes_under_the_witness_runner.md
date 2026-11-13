---
type: bug
priority: low
status: deferred
area: viewer/browser-tier
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in.md
class: flaky_check
defer_until: 2026-12-06
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# "3D pane follows the selection" fails a different sub-check on some witness-runner runs

Guard `browser__real-a-reload-reopens-the-pane-the-reader-left-open-at-t__09a1cf0a` read
"tier was red before the mutation" twice in the witness runner, each time on a different
sub-check ("clicking a contributor row in the nav selects it in the scene", then "resting on a
body row in the nav lights that body in the scene"). The same suite was 32/32 in the full
browser tier and in two isolated `--only` runs. Not baselined against integration, so whether
this change's pane-open/close glide widens the window is unknown; the checks click and hover
rows while the page may still be settling. The witness for this guard is therefore unproven on
this branch; the sweep should re-check it.

## 2026-11-08 recurrence (triage batch merge, main checkout at `6682b972`)

The full `node scripts/run_viewer_browser_tests.mjs` run reported this suite 31/32, failing
"[real] clicking a contributor row in the nav selects it in the scene, and the row shows it
selected". The witness runner's clean baseline of the same suite was red right after it
(so `browser__real-nothing-above-produced-an-uncaught-error__62500dca` read NOT WITNESSED,
"tier was red before the mutation"). Run alone with `--only "3D pane follows the selection"`
it passed 32/32 in 110 s. Same shape as above: batch-only, green alone.
(found_by: dispatch/docs/sessions/lessons/LESSONS_20261108_triage_sweep.md)

## 2026-11-10 recurrence (review of the_model_is_derived_once_and_the_left_column_is_its_tree, merged tree = `11ba4bd3`)

`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
selected 94 entries and reached 64 under the 30-minute cap; the clean baseline of this suite was
red, 31/32, on "[real] resting on a body row in the nav lights that body in the scene" (DIAG:
`rows 1; pane says {"hover":null,"sweep":true}` after the check's own 20 s leave-and-re-enter
poll), and **17 entries** -- every entry of this suite the diff reached -- read NOT WITNESSED,
"the tier was red before the mutation". The full browser tier had passed the same suite 32/32
in the same chain, alone on the slot, 30 minutes earlier. Two isolated re-runs afterwards,
`--only browser__real-resting-on-a-body-row-in-the-nav-lights-that-body-i__94144d6f` and
`--only browser__real-with-the-pane-open-the-left-column-is-the-model-s-t__835a52f7`, were clean
green and WITNESSED (3m40s, 6m11s). So the sub-check is red about one run in four for this
suite on this tree (1 of 4 across the chain and the re-runs), and the remaining 15 entries of
the suite are unproven on the merged tree; the sweep should re-check them.

New here: this handoff rewrote the sub-check (`scripts/run_viewer_browser_tests.mjs`, the
`bodyLit` poll) because the nav's body rows are no longer re-rendered by the pane's rail
rebuilds, and its own lesson records the pane clearing the hover on every rebuild for seconds
after a run loads. The red run polled for 20 s and never saw the light on, so the window is
not always inside 20 s. The fix is the pane's: stop clearing the hover on a rebuild (or re-post
the held hover after one), not a longer poll.
(found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md)

## Addendum 2026-11-12 (handoff a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown)

Still flaking: "[real] resting on a body row in the nav lights that body in the
scene" was red in 2 of 5 `--only "3D pane follows the selection"` runs on that
branch, and once more as the baseline of a witness run ("the tier was red before
the mutation"). The other 31 checks were green each time. That branch added one
nav repaint when the pane posts its feature-identity record. The page now skips
it when the record folds the same events as its own, which is the case at
pane load. The suite then passed in each of its last three runs. Measured
against the scratch projections at
`data/scratch/realtier_20261112` (built from that tree).

## Addendum 2026-11-12, review round 2 of a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown

The same check is red on the **integration tree** as well as on that merge.
Measured with the browser runner run from a `git archive integration`
extraction against scratch projections built from the merged tree
(`data/scratch/review_binding_r2`). It failed 31/32 there with the DIAG line
`pane says {"hover":null,...}`. On the merged tree it was red in the full tier
and red once more run alone. That second run's DIAG had the pane holding the
hover (`{"kind":"body","name":"base"}`), and the scene still did not light.
So the pane-clears-hover reading above is one of two ways it fails, not the
only one. The same check was green in round 1's full tier on the same merge.
