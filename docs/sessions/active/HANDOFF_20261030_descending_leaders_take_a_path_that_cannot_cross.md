---
priority: high
depends_on: [display_name_reaches_the_viewer_fixtures_and_fixture_drift_is_caught_without_a_projection]
model: opus
hitl: false
---

# HANDOFF 2026-10-30 — descending_leaders_take_a_path_that_cannot_cross: the topology grid's leaders cross each other, and a test says they do

Source: dispatch triage sweep 2026-10-30, from
`docs/issues/ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_centred.md`
(`priority: high`). It sat behind `BRIEF_20260914_dag_layout_geometry_tradeoffs`,
which a strategy session consumed on 2026-10-29 routing "item 1 (leaders
crossing)" into `a_leader_starts_at_the_mark_it_names_on_every_tier` — but that
handoff fixed which marks a leader joins, not whether leaders cross one
another; `VA.leaderGeometry`'s lanes are unchanged and the `[real]` test
`pitch_system's leaders really do cross…` in `apps/viewer/tests.js` still
asserts `> 0`. The issue gives four candidates and calls the choice a design
call; triage made it (below) and records the alternatives so review can check.
Baseline: tolstack master after the dependency lands. **Sequenced behind
`display_name_reaches_the_viewer_fixtures_and_fixture_drift_is_caught_without_a_projection`**
because that handoff edits `apps/viewer/tests.js`'s fixture checks and the
viewer fixtures this one's tests read, and today's `[real]` tier is red on
exactly those fixtures — a geometry change measured against a red tier proves
nothing. Scope: `apps/viewer/topology.js` (`VA.leaderGeometry` and the path
it emits), the leader-drawing code in `apps/viewer/views/topology.js`,
`apps/viewer/tests.js` and the browser checks for leaders, `apps/viewer/README.md`'s
leader section. Do NOT touch grid centring (`viewer_dag_spine_layout`'s
centring stays: measured 507 px → 208 px max jog on `pitch_system`), the DAG
column order, or `apps/annotate/`.

## The defect (inline)

`VA.leaderGeometry` allocates lanes strictly monotonically in walk order and
its comment says leaders therefore cannot cross. That proof rested on
"leaders always rise left-to-right (`y2 < y1`)", which stopped being true when
the grid was centred against the DAG (2026-09-14): a leader above the centre
now **descends**, and two leaders cross exactly when `y2[i] >= y1[i+1]`. The
issue's pure repro (no browser) prints **16** inclusive pairs on
`pitch_system` at comfortable density with a 782 px budget; a strict segment
intersection gives **12 pairs across seven leaders**, all among the descending
half (indices 0–6). In the **angled** leader style the same geometry has
**zero** crossings of either kind.

## Deliverables

1. **Descending leaders route so they cannot cross — decided: candidate 4
   (route around), measured against candidate 1.** Give a descending leader
   the path shape that the angled style already proves crossing-free on this
   geometry, keeping rising leaders as they are. Before committing to it,
   measure candidate 1 (order lanes by the grid-side seam) on the same
   repro; if candidate 1 reaches zero strict crossings on every committed
   topology at every density with less visual change, take it instead and
   say so in the lesson with both counts. **Rejected:** candidate 2 (reuse
   lanes — the file already argues it buys little width and nothing argues it
   removes crossings) and candidate 3 (stop centring — trades a measured
   507 → 208 px win for an unmeasured one).
2. **The claim in the code becomes true, and a test holds it.** Correct the
   `VA.leaderGeometry` comment to state the rule that actually holds. Turn
   the `[real] pitch_system's leaders really do cross…` test into its
   opposite — zero strict crossings — and extend it to **every** committed
   topology in `docs/topologies/`, at each density and leader style the
   viewer offers, with the coverage set asserting its own size (the
   registry's `guard_cannot_fail` lever: a test that iterates zero topologies
   must fail). Keep the endpoint-correspondence contract the browser tier
   already measures (every leader lands on its own dot and its own boundary
   row's seam).

Sites the fact reaches: the topology page's grid↔DAG leaders, the kinematic
page if it draws the same leaders, and the README's "Leaders" section. Name
any leader surface you leave alone.

## Definition of done

- The pure repro in the issue prints 0 (strict) for `pitch_system`, and the
  new all-topology test passes in both tiers; record the before/after counts
  per topology in the lesson.
- On the served viewer, `pitch_system` at comfortable density, 1600×1000: a
  screenshot in the lesson showing the descending leaders' new path.
- Default tier green per `CLAUDE.md`; the browser and mutation-witness merge
  tiers only for the specs you add or change
  (`node scripts/run_mutation_witness_tests.mjs --changed-since master`).
- Lesson (`docs/sessions/lessons/LESSONS_20261030_descending_leaders_take_a_path_that_cannot_cross.md`):
  which candidate won and the measurement that decided it, and the premise
  the new no-crossing rule rests on — written so the next layout change can
  tell whether it broke it.
