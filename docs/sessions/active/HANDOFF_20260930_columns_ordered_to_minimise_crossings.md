---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-30 — columns_ordered_to_minimise_crossings: the DAG's rail columns are ordered so links and leaders cross as few rails as possible, shortest legs nearest the trunk

Source: Jeff, live, 2026-09-30, with a screenshot of `pitch_system`'s DAG:
*"When possible, rearrange the dag to minimize self-crossings (makes it hard
to trace the lines). In the attached screenshot, moving the shorter legs to be
closer to the trunk would help a lot."* This is Jeff's ruling on item 2 of
`docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md` ("re-pack the
columns … it makes column order a heuristic … that tension is the decision,
and it is Jeff's") — column order **may** now be chosen to minimise crossings.
The brief carries the PARTIALLY CONSUMED marker; items 1, 3 and 4 stay open.

Baseline: trunk `master` after the 2026-09-30 batch (board root empty; the
three `HANDOFF_20260930_*` guard handoffs completed). Scope:
`scripts/build_topology_projection.py` (the serialiser), `tests/test_topology_projection.py`,
`apps/viewer/README.md` ("The rails" — the paragraph quoted below and its
numbers), `docs/DAG_TOPOLOGY.md` wherever it states the column rule, and ONE
comment block in `apps/viewer/topology.js` (item 4). Do NOT touch
`apps/viewer/views/**`, `apps/viewer/topology.css`, `apps/viewer/style.css`
or `apps/viewer/views/nav.js` — owned by the parallel
`HANDOFF_20260930_nav_tooltip_once_and_rail_hover_emphasis`. Do not change
what a respine *means* (whole-walk emphasis in place, no re-columning on
selection — Jeff, 2026-09-15); this handoff changes the projection's column
numbering once, the same on both sides of every respine.

## What is wrong, measured on the live projection (2026-09-30)

`serialize_topology` allocates a fresh column at each fork in walk order, lowest
free column first (`_Serializer.allocate`). On `pitch_system` the two branches
opened at row 0 run almost the whole diagram (columns 1 and 2, rows 0–43 and
0–44) and sit nearest the trunk, so **every later fork off the trunk** (rows
4, 10, 14) opens its columns outside them and its branch link hops over both;
the short legs end up farthest out. Measured with a scratch counter over
`data/projections/viewer/topologies.json` (a link crosses a rail when the rail
occupies a column strictly between the link's two columns and spans the
link's row(s); rails opened at the **same fork** are excluded — a fan-out is a
junction, not a crossing):

| topology | columns | branch-link crossings | close-link crossings | total |
|---|---|---|---|---|
| `pitch_system` | 10 | 20 | 12 | **32** |
| `rotor_fastener_length` | 10 | 0 | 36 | 36 |
| `pitch_link_to_pitch_plate` | 3 | 0 | 1 | 1 |
| `tan_link_to_pitch_plate_take2` | 2 | 0 | 0 | 0 |
| `vpa_output_to_pitch_plate` | 2 | 0 | 0 | 0 |

The rails and links on `pitch_system` today (column, start row, end row):
`0: 0–20` (trunk), `1: 0–43`, `2: 0–44`, `3: 4–41`, `4: 4–42`, `5: 10–40`,
`6: 14–28`, `7: 14–38`, `8: 26–30`, `9: 26–34`; branch links at rows 0
(0→1, 0→2), 4 (0→3, 0→4), 10 (0→5), 14 (0→6, 0→7), 26 (6→8, 6→9); close
links at rows 41 (3→0), 42 (4→7), 43 (1→8), 44 (2→9).

Two re-orderings were measured on the same counter (a permutation of the
non-trunk column ids; the trunk stays column 0, which the page mirrors to the
right-hand side):

| ordering of columns 1..9, nearest trunk first | branch | close | total |
|---|---|---|---|
| as allocated today | 20 | 12 | 32 |
| **shortest leg nearest the trunk** (by rail end row, ascending): `6, 8, 9, 7, 5, 3, 4, 1, 2` | 0 | 17 | 17 |
| **exact minimum** over all 9! permutations (5 s): `3, 5, 7, 4, 1, 6, 8, 9, 2` | 7 | 0 | **7** |

`rotor_fastener_length`'s 36 are all close links and **no permutation moves
them** (exact search, 6 s) — that topology's remaining lever is how a close
link is *drawn*, which is out of scope here; say so in the lesson rather than
chasing it.

## Deliverables

1. **A column-ordering pass after the walk, in the serialiser.** Keep the
   walk exactly as it is (author-first root, DFS row order, rail continuity,
   column *reuse* when a branch has ended — `test_a_column_never_holds_two_rails_at_the_same_row`
   and `test_reuse_is_what_this_invariant_guards` must stay green). After the
   walk, **renumber** the non-trunk column ids by a permutation that minimises
   the crossing count, and apply it to every `rows[].column`,
   `rows[].closes_column`, `rails[].column`, `links[].from_column/to_column`
   (the same three collections `VA.spineRight` mirrors — a renumbering is a
   bijection on ids exactly as the mirror is, so continuity, reuse and the
   one-dashed-curve-per-cycle invariant survive untouched). The trunk — the
   column of the walk's first node — stays `0`.
   - **Objective**: total crossings = branch-link crossings + close-link
     crossings (definitions above, same-fork siblings excluded) **+ leader
     crossings**: a node's leader runs from its dot toward the grid on the
     trunk side, so it crosses every rail with a *smaller* column index that
     spans the node's row. Count all three, equally weighted. Suggested but
     not binding: the leader term is what the 09-14 brief measured as the
     43 remaining branch-leader crossings; include it and report its before/
     after separately so the brief's table can be closed out.
   - **Exact search when it is cheap, the rule when it is not**: enumerate
     permutations when there are ≤ 9 non-trunk columns (9! = 363 k
     evaluations ran in 5 s in plain Python on `pitch_system`; cap at that
     and measure — if 10 non-trunk columns stays under ~60 s, raise it);
     beyond the cap, use **shortest-leg-nearest-the-trunk** (sort by the
     rail's end row ascending, then by allocated id) and record that the
     layout is heuristic in the layout dict (`"column_order": "exact" |
     "shortest_first"`). Ties in the exact search break toward the
     shortest-first order, so the result is deterministic and matches Jeff's
     words wherever the count does not care.
   - A reused column holds several rails with disjoint spans; a permutation
     moves them together. That is correct (they are one column) — do not split
     them.
2. **The crossing counter is a public function and a test.** Put the counter
   beside the serialiser (`layout_crossings(layout) -> {"branch": n, "close":
   n, "leader": n}`), and pin on the live projection: `pitch_system`'s
   branch+close total ≤ 7 (the measured exact minimum — pin the number the
   run produces, with its derivation in the assertion message), and **every**
   committed topology's total is ≤ its as-allocated total (compute both in the
   test by running the walk with and without the pass; a layout the pass
   makes worse is a bug). Add `rotor_fastener_length`'s 36 as a pinned fact
   with the sentence that no permutation moves it.
3. **The documents that state the old rule say the new one.**
   `apps/viewer/README.md` "The rails" says *"The projection still allocates
   the mainline column 0 and each fork a fresh column to its right — git-log's
   convention, and a claim about the graph that a pytest pins"* and quotes
   crossing totals (`96 → 43`, `47 → 43`). Rewrite that paragraph: the walk
   still allocates in order; the **column ids are then ordered to minimise
   crossings**, shortest legs nearest the trunk, and the author's node/edge
   order still steers the row order and the root. Re-measure and replace the
   numbers (the lesson table is the source). Same check on
   `docs/DAG_TOPOLOGY.md` and the serialiser's own docstring (which
   currently explains the eager allocation as preventing a branch being
   "drawn straight through branch 1's rows" — still true of the walk; add that
   the renumbering is what decides *where*). The "no heuristic root" rule
   stands and should be restated as what it now is: the root is never
   chosen by heuristic; the column order is.
4. **The false comment in `apps/viewer/topology.js`** — the no-regrets item
   of the 09-14 brief: `VA.leaderGeometry`'s comment states *"Lanes are
   strictly monotone in walk order. Leaders never cross under that rule"*,
   a proof whose premise (leaders always rise) stopped holding on 2026-09-14.
   Correct the comment to state the premise and that it no longer holds
   (`ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_centred.md`
   has the exact condition `y2[i] >= y1[i+1]`). Comment only — no code in that
   file.
5. **Rebuild and run the tiers in the main checkout**, in the order
   `CLAUDE.md` prescribes: `scripts/rebuild_projections.ps1` first, then
   `venv-win/Scripts/python.exe -m pytest -q`, `node apps/viewer/run_tests.cjs`,
   `node scripts/run_viewer_browser_tests.mjs`,
   `node scripts/run_mutation_witness_tests.mjs`. The `[real]` test *"right-
   justifying pitch_system takes its spine leaders off every branch rail they
   used to cross"* asserts the total improves and leaves the branch-side
   number unpinned on purpose — it should stay green; if a `[real]` test pins
   a column index on `pitch_system`, update the pin with the new number and
   say which in the lesson.

## Definition of done

- `pitch_system` renders with its long early legs (today's columns 1 and 2)
  farthest from the trunk and the short legs beside it; branch+close
  crossings ≤ 7 (from 32), measured by deliverable 2's counter and recorded
  in the lesson as a before/after table over all five committed topologies,
  leaders included. A screenshot of the new `pitch_system` DAG beside the
  2026-09-30 one goes in `docs/sessions/lessons/shots_20260930_column_order/`.
- Every test named in deliverable 1 green; the new pins in deliverable 2
  green; README / DAG_TOPOLOGY / docstring paired text updated and the doc-
  scan guards green.
- Lesson (`docs/sessions/lessons/LESSONS_20260930_columns_ordered_to_minimise_crossings.md`):
  the before/after table; exact vs heuristic decision and the measured search
  time at the cap; whether the leader term changed the chosen permutation
  versus links-only; the stability trade (an added edge can now reorder
  columns — state it plainly, Jeff accepted it when he asked); and the
  `rotor_fastener_length` finding with the one lever left (close-link
  drawing), filed as an issue if it is worth one.
