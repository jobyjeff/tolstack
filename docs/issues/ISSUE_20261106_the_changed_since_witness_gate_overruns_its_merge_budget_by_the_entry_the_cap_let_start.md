---
type: chore
priority: low
status: deferred
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/active/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
defer_until: 2026-12-06
resolution: deferred 2026-11-06 (triage) -- low defers by default; suite_over_budget has no program; 30 days
---

# The `--changed-since` witness gate overruns its merge budget by the entry the cap let start

`node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo <worktree>/data/scratch/root`
on branch `handoff/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`
(2026-11-06) ran for 1875 s of wall time. The runner reported "38/38 witnessed,
38/55 reached in 29m26s; 17 left to the sweep" and exited 0. `suite-time record
--tier merge` said **OVER BUDGET by 1m15s**.

The 30-minute `--budget-min` cap decides whether to start an entry. It does
not bound the wall time. The last entry it starts can finish after the cap,
and the runner's startup and teardown come on top of the runner's own
"29m26s". A capped run therefore lands just past a 30-minute budget by design.

There are two ways to fix it:

- **Recommended:** start an entry only if its expected duration still fits
  before the cap. The runner already knows each browser suite's cost from the
  previous run.
- Alternatively, record the gate against a budget that includes one entry of
  slack.

## Addendum 2026-11-06 (review round 2, same branch)

The same gate ran again after the round-2 merge of `integration`. It took 1875 s
wall. The runner reported "34/43 witnessed, 43/60 reached in 30m50s; 17 left
to the sweep" and exited 1. `suite-time record --tier merge` said **OVER BUDGET
by 1m15s** again. The runner's own count is 50 s past the 30-minute cap, which
is the entry that started just inside it. The exit 1 comes from nine
kinematic-page entries whose baseline was red for the reason in
`ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`.
It has nothing to do with this overrun. An earlier round-2 run the same day
took 2359 s (30m36s reached), and was recorded as **OVER BUDGET by 9m19s**. About 9 minutes of that fall outside the runner's own clock, which I take to be the wait for the browser slot. I did not measure it.

## 2026-11-08 measurement (triage batch merge)

`node scripts/run_mutation_witness_tests.mjs --changed-since 783515c1`, main checkout at
`6682b972`, right after the batch merge (`783515c1 -> 7d9772e6`): **2042 s wall** against the
30-minute merge budget. `suite-time record --tier merge` printed **OVER BUDGET by 4m02s**.
Runner summary: "65/66 witnessed, 66/111 reached in 33m32s; 45 left to the sweep". The
overrun is this issue's shape again. The entry the cap let start was the 5m59s
`browser__real-nothing-above-produced-an-uncaught-error__62500dca` (its suite's clean run
was red, a load flake that passed alone afterwards).
That entry ran right after a full browser tier, so the slot was not contended. Slowest entries
(runner's own timing):

    5m59s  browser__real-nothing-above-produced-an-uncaught-error__62500dca
    1m07s  annotate__a-model-that-reuses-another-s-ids-reads-that-model-s-rec__2a4aa28c
      52s  fast__a-collapsed-body-is-remembered-per-topology-per-reader-a__a17039c2
      36s  annotate__real-p2-the-spindle-coaxiality-pair-is-one-joint-at-the__020b8ea4#1
      34s  annotate__real-p2-the-spindle-coaxiality-pair-is-one-joint-at-the__020b8ea4#2
      34s  annotate__planhighlight-tints-a-bound-face-only-where-its-part-is__e95c3cac
      34s  annotate__highlight-narrows-to-one-end-of-an-edge-and-a-selected-l__b0323cf6
      34s  annotate__under-a-topology-that-declares-occurrences-a-mesh-only-c__7dc5f5b4
      34s  annotate__nexteventseq-numbers-from-seq-when-built-from-events-are__b23d3481
      34s  annotate__memoryadapter-never-overwrites-an-existing-filename-is-b__1b42eea5
      34s  annotate__embedstate-names-the-mode-and-the-subject-in-one-line-th__bd227e9f
      34s  annotate__a-proposal-never-stands-the-row-s-state-is-proposed-with__09392b85
      33s  annotate__an-event-on-an-id-a-model-shares-with-the-model-it-reuse__8a1a5db8
      33s  annotate__sweep-a-part-the-topology-puts-in-a-body-rides-it-one-re__28550e1f#2
      33s  annotate__a-part-that-declares-an-occurrence-is-drawn-there-alone__457a9310

(found_by for this measurement: dispatch/docs/sessions/lessons/LESSONS_20261108_triage_sweep.md)

**Sighting, 2026-11-09** (handoff
`the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`):
`--changed-since integration` selected 18 entries and reached 16 in 32m45s.
2 were left to the sweep (budget), and the run was 33m03s wall: the same
overrun shape, from the last browser entry the cap let start.
