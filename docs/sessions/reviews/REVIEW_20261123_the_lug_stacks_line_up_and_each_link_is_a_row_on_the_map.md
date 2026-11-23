---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map.md
reviewer: agent
date: 2026-11-23
verdict: APPROVE
blockers: 0
---

# Review — the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map

Reviewed `handoff/…` at `3b7c68fe`. The merge into `review/…` was a **fast-forward**:
the branch already contained `integration` (`04a21d1c`), so the merged tree is the
handoff tip (tree `6441710d`). Branch history checked first: no prior review attempt.
The branch worked the `active/` handoff, and every lesson and issue it adds arrives as `A`.
The one `M` on a record is the 11-20 box-colour issue, which the branch resolved (deliverable 6).

## What I verified

**Code (`apps/viewer/map.js`, `views/map.js`, `map.css`).** I read every hunk:
- `routesCross`: the strict segment test, plus a corner lying on another route.
- The symbol-on-route note, `nearerOutside` and `detourOrder` in the pin order, and the
  pin sort now looping over `a.order.length`.
- `detourFlank` (the emptier flank), and the detour lane following its pin's side.
- `centreOf`/`reach`, and the box sized from the reach.
- The dimension geometry and `dimensionLine()`.
- `register()` writing the base class. I checked every caller: each `base` is a
  superset of the class the element was created with, so nothing is dropped.

There is still one `fold()`, and nothing reads `lmc`/`mmc`. Model ids, nodes and
edges are untouched. Only `places` moved in `map_vpa_end_stop_v2.json`.

**Numbers, re-derived** with `tests/debug_map_arrangement.mjs` on a root built from
this tree:

| metric | result |
|---|---|
| v2 notes | 0 |
| routes | 50 |
| crossings | 0 |
| diagonals | 3, the three the lesson names |
| bounds | 3034 × 3394 (7.22 × 9.98 cells) |
| closest parallel legs | 44 in every district |
| v1 notes | 138 |
| 11-21 layout, its own code: diagonals | 10 |

**Deliverables against the handoff.**

| # | deliverable | verdict |
|---|---|---|
| 2 | each link a row of five | met; both links are one line, the shots confirm it |
| 5 | crossings counted on the page | met; the crossing note is the page's own, and v2 is at 0 |
| 6 | a box wears its body's colour from the first paint | met, and pinned by a fast check |
| 3 | a link's length drawn as a dimension | drawn, but pinned by nothing (should-fix 1) |
| 1 | each lug stack one straight line | partly met, honestly reported |
| 4 | room around the plate; the empty middle shrinks | partly met, honestly reported |

On 1 and 4: each lug is a column with the plate beside it at a corner. The empty
block under the tangential row remains, at the same bounds. The lesson names the
rule that blocks the rest (bodies' rectangles do not overlap), shows the search,
and files `ISSUE_20261122_a_lug_stack_cannot_be_one_straight_line_while_each_body_is_one_rectangle.md`
(`audience: strategy`). The handoff allowed exactly that exit. The study-lit
check is unmet for a filed reason: the map draws no study yet
(`ISSUE_20261116_what_the_map_does_not_draw_yet`).

**Shots.** I read `05_3840_whole_map` and `01_1536_map_plate_and_links_region`. They
match the claims, including the faint dimension extension lines and the long
base column the lesson lists as untidy.

**Tolerance-stack mandatory checks 1–7.** None apply. The diff changes no stack,
element, band, `confidence` or `source_ref`, so the traced ratio is unchanged and
this review does not restate it. No spec-library event is involved.
`data/inbox/specs/` was not touched, and nothing was written into drawing-checker.

## Tests

The tactical record is complete and consistent with the diff:
- the default tier, with its counts;
- the two fast tiers;
- browser `--only` runs for the map and Groups suites;
- witness `--only` runs for both new specs and the four re-pointed ones.

So the benefit of the doubt holds.

**Pre-merge risky subset**, run on the handoff tip in its own worktree:

| run | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo …/lug1123` | 630/630 |
| `pytest -q tests/test_topology_map.py tests/test_topology_projection.py tests/test_mutation_witnesses.py tests/test_app_type_scale.py tests/test_architecture_inventory.py` | 156 passed |

**Post-merge.** I built a fresh scratch root, `data/scratch/rv_lug_1123`, from this
clean tree: all eight builders, `--data-root`, every stamp `3b7c68fe`. The one
`dirty: true` is the copied spec library, which no builder writes.

| run | result |
|---|---|
| viewer fast tier `--repo rv_lug_1123` | 630/630, `[real]` paired at `3b7c68fe` |
| annotate fast tier | 335/335 |
| `pytest -q -p no:cacheprovider`, review worktree | 1 failed, 2619 passed, 3 skipped, 4 deselected, 498 s (recorded, inside budget) |
| whole browser tier `--repo rv_lug_1123` | 49/49 suites, 983 checks, 2089.5 s (ledger row self-recorded, over the 1800 s budget) |
| witness gate `--changed-since integration --budget-min 10` | 17/17 witnessed of 23 selected, 6 browser map entries left to the sweep (budget), exit 0 |
| witness `--only` on two of those six | both witnessed (4m24s, 2m13s) |

Notes on the runs:
- **The pytest failure** is the deliberate worktree red,
  `test_viewer_js_suite_is_green`. That same tier passed through `--repo`.
  tolstack's conftest prints no contention header lines.
- **The browser budget.** I appended a measurement to the open
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`
  rather than file a twin.
- **The two `--only` witnesses** were `962aacf2`, which this branch re-pointed, and
  `d3605357`, the unfilled-curve rule that the new arrowhead path relies on. For
  the rest, I cite the tactical `--only` runs, made on the same tree.

## Findings

### Should-fix (filed; not fixed here)

1. **A link's length drawn as a dimension is pinned by no check.** Location:
   `apps/viewer/map.js`, `j.dimension`; `views/map.js`, `dimensionLine`/`map__jumperext`.
   On a `git archive` export I renamed `j.dimension = {`, so every link length falls
   back to the old lane, and the viewer fixture tier stayed green (529 fixture checks).
   No test names the dimension class or the extension path. Deliverable 3, the
   drawing Jeff asked for, can be reverted green. Adding a test is outside the
   inline boundary → `docs/issues/ISSUE_20261123_a_links_length_drawn_as_a_dimension_is_pinned_by_no_check.md`.

### Nits

2. **`tests/debug_map_arrangement.mjs --code <older tree>` counts 0 crossings silently.**
   The older code has no `VA.mapRoutesCross`, and the header claims the counts are the
   script's own. Hand-run tool →
   `docs/issues/ISSUE_20261123_the_map_arrangement_scorer_counts_zero_crossings_on_code_without_the_crossing_rule.md`.

### Fixed inline (my own review artifacts and the lesson's arithmetic)

3. **The lesson's "before" crossing/notes count (1, 1)** was measured under the strict
   test, before the touch rule shipped. Under the shipped `VA.mapRouteNotes`, the 11-21
   layout has 5. I added a correction blockquote under the table; the other rows
   re-derive.

### Design (non-blocking, already filed by the author)

- The pitch bolt → straight bushing diagonal crosses the pitch link outline's name
  (`ISSUE_20261120_an_outlines_name_crossed_by_a_route_raises_no_map_note.md`).
- The dimension extension lines are faint at fit.

Nothing new to file.

## Overlay

Added a Recurring-bugs entry: "A new thing the map draws that no check pins". It
records the export-and-rename probe, and re-scoring a lesson's "before" under the
shipped rule.

## Verdict

**APPROVE.** No blockers. Landing into `integration`.
