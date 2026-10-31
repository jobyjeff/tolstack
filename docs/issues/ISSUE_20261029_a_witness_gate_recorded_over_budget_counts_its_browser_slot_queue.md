---
type: chore
priority: low
status: deferred
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/active/HANDOFF_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md
defer_until: 2026-11-28
resolution: triage 2026-10-29: low, deferred by default (30 days)
---

# A witness gate recorded over budget counts the time it waited for the browser slot

The review merge of `the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances`
ran

    node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack/data/scratch/rv_kinband --changed-since master

It reached 84 of 173 selected entries and witnessed 83 of them, with 89 left
to the sweep. The runner's own clock read **29m04s**, so the
`--budget-min 30` cap held. The shell's wall time was **2050 s**, and that is
what was recorded with `dispatch suite-time record --tier merge`, which
printed `OVER BUDGET by 4m10s`. The difference is time spent queued for the
machine's one browser slot. Another review
(`a_study_is_a_translucent_group_on_the_dag`) held it, and the runner printed
`waiting for browser slot held by …` before it launched anything.

So the overage is contention, not suite growth. Two cheap fixes:

- have the witness runner print its own elapsed time **excluding** slot wait
  on its last line (it already prints `in 29m04s`), and record that number;
  or
- have `suite-time record` accept a `--queued-seconds` field, so the budget
  is judged on the run alone while the queue time stays visible.

There is no per-entry top 15 to give: the runner prints per-entry times, and
none of this run's entries was slow out of line with its tier.

## Measurement 2026-10-29 (tactical, a_face_is_picked_the_way_cad_picks_it)

Same shape again. `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack` from the handoff worktree: 2187 s (36m27s) by the outer wall clock, recorded `--tier merge` and reported OVER BUDGET by 6m27s; the runner's own clock read 31m38s for `58/60 witnessed, 60/61 reached; 1 left to the sweep (budget)` (61 of 586 entries reached by the diff's hunks). The gap between the two is clean runs and the browser-slot queue, not mutated runs. Slowest entry 2m13s.

## Measurement 2026-10-29 (review, a_face_is_picked_the_way_cad_picks_it)

The command was `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack/data/scratch/review_face_pick --changed-since integration`,
run on the review merge `08eb5d23`. Wall time was 1995 s (33m15s);
`suite-time record` said OVER BUDGET by 3m15s. The runner's own figure was
"63/63 reached in 25m38s; 0 left to the sweep", so the other ~7.5 min was the
browser-slot queue. 59/63 were witnessed. The four NOT WITNESSED were fast
entries whose tier was already red with no mutation: integration's
`display_name` fixture drift
(`ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures_so_the_real_tier_is_red_on_integration.md`).
Each of the four was witnessed by hand instead: apply the mutation, watch the
named check go PASS→FAIL.

## Measurement 2026-10-30 (review, a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark)

The command was `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack/data/scratch/review_preview --changed-since integration`,
run on the review merge `fb3eace0` (a fast-forward). Wall time was 1881 s
(31m21s), and `suite-time record` said OVER BUDGET by 1m21s. The runner's own
figure was "45/75 witnessed, 75/83 reached in 30m55s; 8 left to the sweep".
So this time almost all the overrun was the cap letting its last browser entry
finish, not the slot queue. All 30 NOT WITNESSED were fast entries where "the
tier was red before the mutation" (the `display_name` drift again). Three of
them were witnessed by hand.

## Measurement 2026-10-30 (triage batch merge, main checkout, trunk `17e3caf4`)

    node scripts/run_mutation_witness_tests.mjs --changed-since da9593c4

(`da9593c4` is the pre-merge trunk sha: after the merge `--changed-since master`
selects nothing.) Shell wall time **1827 s**, recorded `--tier merge`:
`OVER BUDGET by 0m27s`. Runner clock **29m47s** — the `--budget-min 30` cap held;
the 27 s is start-up and shadow build outside the runner's clock, so no slot
queue this time. 180/335 reached, 76/180 witnessed, 155 left to the sweep; the
104 not witnessed were all "the tier was red before the mutation" (79 `fast`,
from the `display_name` fixture-drift red; 25 `browser`, the `3D pane follows
the selection` suite red under load), none a decayed witness. So a capped run
always lands at ~30 m plus overhead and records over a 30-minute budget: the
fix above (record the runner's own clock) covers this case too.
