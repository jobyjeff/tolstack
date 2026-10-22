---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-22 — kinematic_citation_card_wiring_is_witnessed: the browser tier catches a deleted citation-card hookup, and a rail bar it cannot hover fails one check by name

Source: the 2026-10-22 triage sweep, from two issues in the same file and the
same failure class (`guard_cannot_fail`):
`docs/issues/ISSUE_20261022_the_kinematic_pages_citation_card_wiring_can_be_deleted_green_in_every_tier.md`
(bug, med) and, folded in because it is the same file and the same "fail by
name, not by abort" idiom,
`docs/issues/ISSUE_20261021_hoverrailbar_throws_so_a_bar_with_no_hit_path_aborts_the_topology_suite.md`
(bug, low). Baseline: master at or after `d209fc6` (the 2026-10-22 batch
merge, which carries `the_kinematic_study_checks_its_run_its_units_and_shows_its_limit`
and `browser_tiers_name_their_failure_instead_of_aborting`). Scope:
`scripts/run_viewer_browser_tests.mjs`, `scripts/mutation_witnesses/` (new
specs), and the browser guard-count pin if it moves. Do NOT touch
`apps/viewer/views/kinematic.js`, `apps/viewer/topology_app.js` or the study
schema except to read them. The staged siblings
`a_general_profile_note_bands_a_model_defined_term` and
`a_study_says_it_is_incomplete_without_inventing_a_check` own those, and
they may land first. If either one adds browser checks, recompute the
browser pin at merge. Do not chain behind them.

## Deliverables

1. **Witness the kinematic page's citation-card wiring.** `apps/viewer/topology_app.js`
   passes `onCardShow: showCard` into the kinematic view's ctx. That one line
   is the only reason a stop's verdict on
   `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops` opens
   the citation card with S461-607's adoption note. Delete it and
   `citationTrigger` (`apps/viewer/views/kinematic.js`) falls back to a
   native `title` tooltip that holds only the where-line. Every tier stays
   green: the fast-tier checks pass their own `onCardShow`, and no browser
   block hovers `span.kmverdict__limit`. The browser block is "the kinematic
   study page" in `scripts/run_viewer_browser_tests.mjs`, near line 7915.
   - Add one sub-check to that block's `[real]` half. Hover (or focus) the
     first `span.kmverdict__limit`. Assert that the hover card opens, that
     its title names `S461-607`, and that its body contains "closest
     available numeric acceptance criterion". Read that phrase off the live
     projection's note first and quote it exactly. If the study's wording
     has changed, use the current wording and say so in the lesson.
   - Enroll it. Add a mutation spec under `scripts/mutation_witnesses/` that
     deletes the `onCardShow: showCard,` line in `apps/viewer/topology_app.js`.
     `node scripts/run_mutation_witness_tests.mjs --unenrolled` prints the
     filename to use.
2. **`hoverRailBar` fails one check by name instead of aborting the suite.**
   `hoverRailBar(page, id)` (around line 1220) throws `hovering the rail bar
   <id> never opened its card — <why>` when it cannot find or hover
   `line.rail__barhit[data-id=…]`. The topology suite then stops with
   `ABORTED after 44 sub-checks`, and the mutation tier reads that as a MISS,
   not a red. Use the idiom `browser_tiers_name_their_failure_instead_of_aborting`
   set up: return `false` (or a reason string), let each caller `push` a named
   FAIL, and skip only the sub-checks that need the open card. It has callers
   near lines 2054 and 4606; find them all with grep. To reproduce, rename the
   bar hit path's class in `apps/viewer/views/topology.js`: both
   `VA.svg("line", "rail__barhit",` and its `base: "rail__barhit"`. You should
   then get named FAILs and no ERROR, and the hover block's `hitFor` guard
   should be reachable again. Witness it with a mutation spec for that rename
   if the census lets you enroll it; otherwise say in the lesson why not.

## Definition of done

- With deliverable 1's mutation planted, `node scripts/run_viewer_browser_tests.mjs`
  goes red on the new sub-check by name. With it restored, the run is green
  (29 blocks as of `d209fc6`, plus whatever the new sub-check adds).
- With the `rail__barhit` rename planted, the topology block reports named
  FAILs and no `ABORTED`/`ERROR` line.
- `node scripts/run_mutation_witness_tests.mjs` (branch mode) witnesses
  every spec you added. `venv-win/Scripts/python.exe -m pytest -q` is green
  in the main checkout after the merge, including the guard-count pin. Run
  every browser command under `dispatch slot run --class browser` (the
  runners queue for the slot on their own).
- Lesson (`docs/sessions/lessons/LESSONS_20261022_kinematic_citation_card_wiring_is_witnessed.md`):
  the exact card text you asserted, and any other `ctx` plumbing line in
  `topology_app.js` that no tier witnesses. List them; do not fix them here.
