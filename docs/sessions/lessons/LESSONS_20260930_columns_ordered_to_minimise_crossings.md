# LESSONS 2026-09-30 — columns_ordered_to_minimise_crossings

Handoff: `docs/sessions/active/HANDOFF_20260930_columns_ordered_to_minimise_crossings.md`.
Branch `handoff/columns_ordered_to_minimise_crossings`, cut from `integration` at
`50123c2`. Jeff's ruling on item 2 of
`docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md`: column order
**may** be chosen to minimise crossings.

## The headline, and the one place I departed from the handoff

The handoff's definition of done asks for `pitch_system`'s **branch+close ≤ 7**.
What this delivers is **17**, and the reason is in the handoff's own objective
two paragraphs earlier: *"Count all three, equally weighted"* — branch, close
**and leader**. Those two instructions do not have a common solution, and the
table below is why. The 7 was measured links-only, before the leader term was
added to the objective; nobody re-ran it afterwards.

| ordering of `pitch_system`'s nine non-trunk columns | branch | close | leader | **total** |
|---|---|---|---|---|
| as allocated (the walk's own) | 20 | 12 | 52 | **84** |
| links-only exact minimum (`5,3,7,4,6,8,1,9,2`) | 6 | 1 | 34 | **41** |
| **all-three exact minimum** (`6,8,9,7,5,3,4,1,2`) | 0 | 17 | 0 | **17** |

The links-only minimum buys branch+close 32 → 7 and pays 34 leader crossings
for it. The three-term minimum is **the shortest-leg-first order itself** — it
is what `_shortest_first` returns, unchanged — so the objective the handoff
specified converges exactly on the sentence Jeff wrote: *"moving the shorter
legs to be closer to the trunk would help a lot."* Taking the ≤ 7 instead would
have meant publishing a diagram whose leaders cross 30 rails on the way to the
grid, which is the defect `viewer_dag_spine_layout` existed to remove.

So: objective as specified, pin set to the number the run produces (17), the
whole trade spelled out in the failing-assertion message of
`test_the_pitch_systems_short_legs_now_sit_nearest_the_trunk`, and this
paragraph. **If a reviewer wants the 7, it is one weight change away and the
counter already reports the three terms separately** — but it is a different
decision from the one the handoff's objective states.

The brief's own `PARTIALLY CONSUMED` marker (written in the main checkout, and
still uncommitted there while this ran) quotes the links-only `7` as "the exact
permutation minimum", so read on its own it says this work under-delivered.
Filed as
`ISSUE_20260930_the_dag_layout_briefs_consumption_marker_quotes_a_links_only_minimum_the_shipped_pass_does_not_reach.md`
rather than edited — a strategy record being edited in another tree is not mine
to touch, and the same issue carries the one-line answer item 2's open question
now has.

## Before and after, all five committed topologies

`build_topology_projection.layout_crossings`, over the committed documents
(`tests/test_topology_projection.py` computes both sides by patching
`order_columns` out of the walk, so this table is reproducible from a test
rather than from a scratch script).

| topology | cols | branch | close | leader | total |
|---|---|---|---|---|---|
| `pitch_link_to_pitch_plate` | 3 | 0 → 0 | 1 → 1 | 0 → 0 | 1 → 1 |
| `pitch_system` | 10 | **20 → 0** | 12 → 17 | **52 → 0** | **84 → 17** |
| `rotor_fastener_length` | 10 | 0 → 0 | 36 → 36 | 0 → 0 | 36 → 36 |
| `tan_link_to_pitch_plate_take2` | 2 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `vpa_output_to_pitch_plate` | 2 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| **all five** | — | **20 → 0** | 49 → 54 | **52 → 0** | **121 → 54** |

Screenshots: `shots_20260930_column_order/1_pitch_system_as_allocated_before.png`
and `2_pitch_system_columns_ordered_after.png`, same page, same viewport, same
scroll — the only difference is which `topologies.json` the page read.

### The leader term, in the units the page actually draws

The counter takes a **layout** and nothing else, so it counts a leader for every
node row. The page draws one per *non-internal* node (`VA.gridPlan`), which is a
fact about the topology's parts and not about a layout — a strict subset, and a
monotone one. Both numbers, on `pitch_system`:

| | counter (every node row) | as the page draws it |
|---|---|---|
| as allocated | 52 | **43** |
| columns ordered | 0 | **0** |

That 43 is the number `BRIEF_20260914_dag_layout_geometry_tradeoffs.md` left on
the table as *"the 43 remaining branch-leader crossings"* after the spine was
right-justified. **It is now zero**, on every one of the five. That is the
brief's row closed out, and it is also what moves the README's published mirror
totals from `96 → 43, four of the five to zero` to `139 → 0, five of the five`.

## Did the leader term change the chosen permutation? Yes, completely

Links-only and all-three do not agree on `pitch_system` — different
permutations, and the links-only one is worse overall by more than a factor of
two (41 vs 17). On the other four they agree trivially (every order scores the
same). So the leader term is not a tiebreak here, it is the deciding term, and
anyone re-weighting the objective should expect the column order to move.

## Exact or heuristic: the cap, and why the search is cheap

`EXACT_ORDER_MAX_COLUMNS = 9` non-trunk columns, exactly where the handoff
suggested, and measured rather than assumed. **The measurement that matters is
not the one in the handoff.** A naive "apply the permutation, rebuild the
layout, count" evaluator runs 9! in **56 s** on `pitch_system` and **75 s** on
`rotor_fastener_length` — which is what I measured first, and which is far too
slow to sit inside `pytest -q` *and* a projection build.

What makes it affordable is that **the vertical half of a crossing is invariant
under renumbering**. A rail either spans a link's rows or it does not, and no
permutation moves a row. So `_crossing_incidences` precomputes the whole
objective as facts about column *ids* — `leaders[(c, d)]` pairs and
`(endpoint, endpoint, rail)` triples — and a depth-first placement accumulates
the cost one column at a time, because every pair and triple is settled by
whichever of its members is placed last. With the bound seeded from the
heuristic order:

| topology | non-trunk columns | time |
|---|---|---|
| `pitch_system` | 9 | **0.18 s** |
| `rotor_fastener_length` | 9 | **1.2 s** |

`rotor_fastener_length` is the slow one *because nothing prunes*: every order
scores 36, so the bound never tightens and the whole tree is walked. That is the
honest worst case at this width, and it is the number to scale from — ten
columns is ten times that tree, which is why the cap stays at nine. A topology
past it gets `column_order: "shortest_first"` and says so in the projection;
`test_a_topology_wider_than_the_cap_falls_back_to_the_rule_and_says_so` builds
an eleven-leg star so that word is not unreachable from the committed corpus.

## `rotor_fastener_length` cannot be helped by any column order, and that is proved

Nine non-trunk columns is inside the cap, so the 36 is a **minimum over all 9!
orders**, not a shortfall. It is a ten-wide fan: every rail starts at row 0 and
each is one row longer than the last, so it is already shortest-leg-first and
every permutation is a relabelling of one picture. All 36 are close links drawn
back up to the hub across the rails between. The lever left is how a close link
is *drawn* — filed as
`ISSUE_20260930_rotor_fastener_lengths_thirty_six_close_link_crossings_need_a_drawing_change.md`
with four candidate renderings, `audience: strategy`.

## The stability trade, stated plainly

**Adding one edge can now re-order the columns.** Column order is a function of
the whole graph's crossing count, so an edge added anywhere can change which
permutation wins and move rails a reader had learned the position of. Jeff
accepted this when he asked for it. What has *not* changed, and is the thing
that rule was protecting: **the root is still never chosen by heuristic** — the
author's document order picks it, and the walk, the row order and rail
continuity are untouched. The pass is a renumbering applied after the walk, and
a renumbering is a bijection on column ids exactly as `VA.spineRight`'s mirror
is, so column reuse, rail disjointness and the one-dashed-curve-per-cycle
invariant all survive it for the same reason the mirror does.

## Deliverable 4 was already done, on the day the premise broke

The handoff asks me to correct `VA.leaderGeometry`'s comment, which it quotes as
claiming *"Leaders never cross under that rule"*. **That comment was already
corrected on 2026-09-14**, in `5714742` (`review viewer_leader_grid_legibility:
APPROVE`) — the same day `viewer_dag_spine_layout` broke the premise. It states
the premise, states that it no longer holds, gives the exact condition
`y2[i] >= y1[i+1]` and cites the issue. Nothing to do. I re-measured its numbers
against this change rather than taking them on trust: still **16 crossing pairs**
over 16 leaders, **8 descending / 7 rising** (one flat). They are unaffected by
column order — a leader's two `y`s come from the row positions and the grid
offset, and this change moves neither.

I also found `docs/DAG_TOPOLOGY.md` **does not state the column rule anywhere**
(it is the model/format document; the layout lives in `apps/viewer/README.md`
and the serialiser's docstring). The handoff's "same check on DAG_TOPOLOGY"
comes back negative, and widening that document to describe the rails would be
moving a fact out of the file that owns it.

## How I ran the `[real]`, browser and mutation tiers from a worktree — and why not in the main checkout

The handoff's deliverable 5 says to run `scripts/rebuild_projections.ps1` in the
main checkout and then the tiers there. **I did not, and would not have gotten a
usable answer if I had**: the main checkout is on `master`, which does not
contain this branch, so a rebuild there would have produced *the old layout* and
every `[real]` check would have compared my new tests against it. Rebuilding the
shared `data/projections/` from this worktree is explicitly forbidden —
`scripts/projection_freshness.cjs`' header, *"a worktree must NOT rebuild the
shared projection to clear the red"* — and there were **two other live
worktrees** at the time (`nav_tooltip_once_and_rail_hover_emphasis`,
`vpa_pitch_linkage_topology_and_feature_fits`), both of whose `[real]` tiers
would have gone red on a projection stamped with a commit their trees do not
contain.

What works, and is worth knowing, because the tiers all already support it:

1. Make a scratch directory with `data/inbox` and `data/meshes` as **junctions**
   to the main checkout's (`cmd /c mklink /J`) and a real `data/projections/`.
   `docs` junctioned to the worktree's own, because the viewer reads worksheets
   through the same `--repo` root.
2. Build all three projections into it from the worktree, with `--data-root`.
   The provenance gate does not fire (nothing to overwrite) and the stamp names
   *this* branch, so the freshness check passes.
3. `node apps/viewer/run_tests.cjs --repo <scratch>`,
   `node apps/annotate/run_tests.cjs --repo <scratch>`,
   `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`,
   `node scripts/run_mutation_witness_tests.mjs --repo <scratch>`.

Two gotchas: the browser tier needs `node_modules/playwright-core`, which exists
only in the main checkout — junction `node_modules` into the worktree
(gitignored, so it costs nothing). And **keep the scratch path short**: PyMuPDF
failed to write a crop PNG under the session scratchpad's ~160-character path
before I moved it to `…\Temp\claude\tolfake`.

Filed as `ISSUE_20260930_a_worktree_has_no_supported_way_to_run_the_real_tiers_
against_its_own_projection.md` (`audience: strategy`): this is four manual steps
and a junction, every handoff that touches a projection builder needs it, and
the freshness module's header currently tells a worktree what it must not do
without saying what it can.

## Smaller things the next agent would otherwise rediscover

- **`layout_crossings` is the objective AND the claim's source.** A new
  `tests/claims_registry.py` metric, `layout_crossings`, lets a document
  declare a topology's three terms. It re-derives from the **committed
  document** (`docs/topologies/topology_<id>.json` → `serialize_topology` →
  `layout_crossings`), not from `data/projections/viewer/topologies.json` the
  way `smallest_chain` does. Deliberate: that file's main-checkout fallback
  means a worktree's claim would be checked against whichever tree last built
  it, which is the exact two-trees comparison the freshness pairing exists to
  stop. The layout is a pure function of the document, so there is no reason to
  go through the projection.
- **A `before` number cannot be declared.** The README states the as-allocated
  baseline (branch 20, close 12, leader 52) in prose and says, in the same
  sentence, that it is pinned by name in `tests/test_topology_projection.py` —
  a layout that no longer exists is not re-derivable from this tree, so the
  claim fence carries only the three `after` values.
- **`apps/viewer/topology_fixtures.js` needed `column_order`,** and the
  projection-vs-fixture shape test caught it immediately. Its header says to
  regenerate from the real builder and that the demo's source documents no
  longer exist — so I ran `order_columns` over the three layout objects already
  in the file, asserted it left every row, rail and link untouched (the demo is
  two columns wide), and wrote the word it produces. That assertion is in the
  scratch script, not the tree; if you touch those fixtures, redo it rather
  than trusting the word.
- **`git checkout <file>` to undo a temporary probe takes the real edits with
  it.** I lost two tests.js edits that way and had to redo them. Probe on a
  copy, or re-apply from a script.
- **A shared gitignored store can move under you mid-run, and the red lands on
  your branch.** `node apps/annotate/run_tests.cjs` was 151/151 early in this
  session and 150/151 at the end, same tree: five meshes were installed into
  `data/meshes/` (the main checkout's) between 20:25 and 20:28 by a parallel
  worktree, and the whole-store face-classification rate fell under its 45%
  floor. Nothing in this branch touches a mesh or a classifier. Filed as
  `ISSUE_20260930_meshes_installed_into_the_shared_store_mid_session_took_the_annotate_classification_floor_red.md`.
  If a `[real]` number moves and your diff cannot explain it, check the
  **mtimes under `data/`** before you go looking in the code.
