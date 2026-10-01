---
type: review
handoff: docs/sessions/active/HANDOFF_20260930_columns_ordered_to_minimise_crossings.md
reviewer: review agent (opus)
date: 2026-09-30
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-30 — columns_ordered_to_minimise_crossings

Branch `handoff/columns_ordered_to_minimise_crossings` (7 commits, `901d4fe`),
merged into `review/columns_ordered_to_minimise_crossings` at `8cde0a3` — clean
merge, no conflicts; the merged tree differs from the handoff tree only by two
sibling lessons that `integration` had already taken.

**Verdict: APPROVE.** The pass does what Jeff asked for, the search provably
reaches the minimum of the objective the handoff specified, and both of the two
guards that would catch a regression fire when mutated. Three prose corrections
made inline (below), one issue filed, two overlay entries added.

## What I verified, and how

### The arithmetic, independently

Not by reading the lesson's table — by re-running it. With `order_columns`
patched out and `_crossing_incidences` driven directly, I enumerated **all 9!
orders** of both wide topologies' non-trunk columns against the three-term
objective:

| topology | brute-force minimum | minimising order | what the pass ships |
|---|---|---|---|
| `pitch_system` | **17** | `(6, 8, 9, 7, 5, 3, 4, 1, 2)` | 17, `column_order: "exact"` |
| `rotor_fastener_length` | **36** | every order ties | 36, `column_order: "exact"` |

So the lesson's two load-bearing claims hold: 17 **is** the minimum, and the
order that reaches it **is** the shortest-leg-first order the handoff named —
Jeff's sentence and the objective converge, which is the nicest thing about
this result. `rotor_fastener_length`'s 36 is a proved floor, not a shortfall.

Every figure in the lesson's five-topology table recomputes (branch 20→0,
close 49→54, leader 52→0, total 121→54; the per-row sums add up), and the
links-only alternative really does total 41 — I measured that independently
when I mutated the leader term out of the search.

### The search optimises the counter, not a model of it

`order_columns` does not call `layout_crossings` per candidate; it re-expresses
the objective as `_crossing_incidences`' id-level pairs and triples. That is
two implementations of one rule, which is this repo's most-repeated defect
shape, and the author knew it — `test_no_other_column_order_beats_the_one_the_
search_chose` samples ~300 orders through the public counter. I went further
and paired the two **exactly**: 300 random permutations each on `pitch_system`,
`rotor_fastener_length` and `pitch_link_to_pitch_plate`, model score against
`layout_crossings` of the renumbered layout — **900 permutations, 0
mismatches.**

Reading the two: the triple is registered under the link's two endpoints and
not under the rail's column, which is correct because a rail placed *last* of
the three is by definition not between the other two; and `step_cost` counts
each pair/triple exactly once, at whichever member is placed last. The bound
seeds from the heuristic and the prune is `cost < best`, so a tie keeps the
first-enumerated order and `candidates` arrives shortest-first — the
determinism and the tie-break the handoff asked for are both real.

### The new guards were observed failing

Not accepted on green (canonical universal check). Two mutations, both on a
scratch copy, both restored:

- **Drop the leader term from `_best_order`** (`leaders = {}`) → **2 failed**:
  `test_the_pitch_systems_short_legs_now_sit_nearest_the_trunk` and
  `test_no_other_column_order_beats_the_one_the_search_chose`, the second
  naming the exact disagreement ("the search returned 41 but renumbering its
  own output by (8, 3, 4, 5, 6, 1, 9, 7, 2) reaches 33"). This is the mutation
  the overlay's *"a measured deviation from the handoff, shipped with nothing
  pinning the rule that replaced it"* entry demands: **putting the handoff's
  literal reading back is loud.**
- **`close: 17` → `close: 16` in the README's claim fence** → `tests/
  test_claims_registry.py::test_every_declared_claim_agrees_with_its_source`,
  naming `apps/viewer/README.md:578` and both values. The new
  `layout_crossings` metric re-derives from the committed document rather than
  from `data/projections/`, which is the right call for the reason the author
  gives.

### Deliverables 3 and 4, where the lesson says "nothing to do"

Both checked rather than taken on trust.

- `docs/DAG_TOPOLOGY.md` genuinely does not state the column rule (grepped
  `column|fork|rail|git-log`; the only hits are worksheet columns and an
  unrelated "forked" vocabulary line). The lesson is right that widening it
  would move a fact out of the file that owns it.
- `VA.leaderGeometry`'s comment was indeed already corrected — `5714742`,
  2026-09-14. It states the premise, states that it stopped holding, gives
  `y2[i] >= y1[i+1]` and cites the issue. Deliverable 4 was closed before this
  handoff was written.

But the file had a **second** statement of the retired rule, which the handoff's
"ONE comment block" fence kept the author away from — see the inline fixes.

### Tests

Pre-merge risky subset (diff matched the Python/tests, projection-builder,
`apps/viewer/` and tracked-prose rows): `tests/test_topology_projection.py
test_architecture_inventory.py test_claims_registry.py
test_projection_provenance.py test_viewer_readme_doc_facts.py
test_js_python_vocabulary.py` — **130 passed**.

Post-merge, in this review worktree:

| tier | result |
|---|---|
| `pytest -q` | **1 failed, 1274 passed** — the one failure is `test_viewer_js_suite.py`, the deliberate worktree red (`CLAUDE.md`: no `data/projections/` here) |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | **516/516** |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | **25/25 browser checks**, every sub-check green |
| `node apps/annotate/run_tests.cjs --repo <scratch>` | 150/151 — see below |
| `node scripts/run_mutation_witness_tests.mjs --repo <scratch>` | **117 WITNESSED, 0 NOT WITNESSED**, 10 skipped — see below |

`<scratch>` is the author's own recipe from the lesson, re-run for this merged
tree: a short-path root with `data/inbox` and `data/meshes` junctioned to the
main checkout, a real `data/projections/` built from **this** tree with
`--data-root`, `docs` junctioned to the worktree, and `node_modules` junctioned
in for playwright. It works, and the issue the author filed about it
(`…_a_worktree_has_no_supported_way_to_run_the_real_tiers_against_its_own_
projection`) is a fair description of how much ceremony it is.

**I did not rebuild the main checkout's `data/projections/`** and deliberately
did not run the tiers there: the main checkout is on `master`, and while I was
reviewing, `handoff/vpa_pitch_linkage_topology_and_feature_fits` rebuilt that
shared projection from its own branch (stamp `1d63844728`, 2026-10-01T03:55Z).
Any `[real]` number read there belongs to that branch's tree, not this one.

### The mutation tier — the run only this merge can make

The overlay's reason for running it here is that a review merge is the one
point in the lifecycle where nothing re-runs it, and **a drop in the witnessed
count is a finding against the merge, not against either branch.** Result:

- **117 of 117 reachable declared mutations WITNESSED. Zero NOT WITNESSED.**
  The merge took no coverage away.
- **10 `annotate__` entries SKIPPED**, every one with the runner's own
  `TIER_ALREADY_RED` reason: the annotate tier is red from the shared mesh
  store's classification floor (above), so a mutated run there would prove
  nothing. Loud, not silent. This branch touches no `apps/annotate/` file and
  no mesh, so the skip is not attributable to it — but it does mean those ten
  were not re-asked at this merge, and they will stay unaskable until the
  floor is back.
- The 8 `python__` specs (10 declared mutations) **needed a second run.** The
  first one crashed: the runner resolves the pytest interpreter off `--repo`
  (deliberately — in a worktree the venv is main-checkout-only), my scratch
  root had no `venv-win`, and the `spawn` ENOENT came back as an unhandled
  `error` event that killed the process. I junctioned `venv-win` into the
  scratch root and re-ran all eight with `--only`: **10/10 WITNESSED.** The
  crash itself is a defect in the tool and is filed —
  `ISSUE_20260930_a_missing_interpreter_crashes_the_whole_mutation_run_where_
  the_preflight_promised_a_miss.md` — because the runner's own preflight had
  said one screen earlier that those entries would "be reported as a MISS",
  and instead the run ended with no summary line at all.

The annotate tier's single red is **`[real] every installed mesh classifies,
and the rate over the whole store stays above the floor`** — 30.3% against a
45% floor, on a mesh store that is still being written to by that same parallel
worktree (newest files 20:33, after the window the lesson measured). Nothing in
this branch touches a mesh or a classifier; it is already filed as
`ISSUE_20260930_meshes_installed_into_the_shared_store_mid_session_took_the_
annotate_classification_floor_red.md`, and I confirmed the attribution from the
store's mtimes rather than taking the lesson's word for it.

### Hygiene

- No production data touched: everything was written to the scratch root; the
  main checkout's `data/` moved only under the other worktree's hand.
- `data/inbox/specs/` untouched, `docs/reference/` untouched, nothing written
  into drawing-checker.
- The handoff's fences held: no change to `apps/viewer/views/**`,
  `topology.css`, `style.css` or `nav.js`.
- The screenshots are real and show the thing: the before shot's branch links
  hop across two full-height rails and its leaders cross the lot; the after
  shot is a clean staircase with the long early legs pushed outboard.
- The four issues the author filed all carry well-formed frontmatter, correct
  `type`/`priority`/`status`, and `found_by:` (not `handoff:`) pointing at this
  handoff. Two carry `audience: strategy`, correctly.

## The one deliberate deviation — read this before quoting the DoD

**The handoff's definition of done asks for `pitch_system` branch+close ≤ 7.
What shipped is 17.** This is not a miss, and I am not treating it as one:

- The handoff's *objective* paragraph says **"Count all three, equally
  weighted"** — branch, close **and leader**. Its DoD says ≤ 7. Those two have
  no common solution: the links-only minimum is branch 6 / close 1 / **leader
  34**, 41 all told, against the three-term minimum's 0 / 17 / 0 = 17. The 7
  was measured before the leader term joined the objective.
- The author took the objective, and the result is the order Jeff described in
  words. Taking the 7 would have shipped a diagram whose leaders cross 34 rails
  — re-creating the defect `viewer_dag_spine_layout` existed to remove, and
  leaving the 09-14 brief's "43 remaining branch-leader crossings" row open
  instead of closing it to zero.
- It is pinned, not just argued: the test's failure message spells out the
  whole trade, and mutating the objective back to links-only reddens two tests.
- The brief's own `PARTIALLY CONSUMED` marker (still uncommitted in the main
  checkout) quotes the links-only 7, so read alone it says this under-delivered.
  The author filed `…_the_dag_layout_briefs_consumption_marker_quotes_a_links_
  only_minimum_the_shipped_pass_does_not_reach.md` rather than editing another
  tree's strategy record — the right call, and the issue carries the one-line
  answer item 2's open question now has.

If Jeff wants the 7, it is one weight change away and the counter already
reports the three terms separately. But it is a different decision from the one
the handoff's objective states, and the diagram would be worse.

## Findings

### Fixed inline (3) — all prose, none changing designed behaviour

1. **`apps/viewer/README.md`, "The rails" — a justification contradicted by the
   test it cites.** The paragraph said the as-allocated baseline is pinned by
   hand "because a layout that no longer exists cannot be re-derived from this
   tree". It *is* re-derivable, and this diff's own `_as_allocated()` helper
   re-derives it on every run by patching `order_columns` out of the walk —
   that re-derivation is exactly what the `before == {...}` assertion compares
   against. The real limit is narrower: `_derive_layout_crossings` goes through
   `serialize_topology`, which always orders. Corrected the reason; left the
   decision alone. Same claim corrected in the lesson with a dated reviewer
   blockquote.
2. **`apps/viewer/README.md` — the mirror paragraph's before/after attribution
   went stale while its digits stayed live.** `96 → 43` became `139 → 0`
   automatically, because a `[real]` test computes both sides from the live
   projection. But the sentence still credits `VA.spineRight` alone, and `139`
   is now "what the page would draw if it did not mirror, at a column order
   chosen *for* the mirrored page" — a state that has never existed. Added one
   clause saying the before-side is a counterfactual and the zero is the two
   mechanisms together. The two regexes `apps/viewer/tests.js` matches on are
   untouched; re-ran the tier to confirm (516/516).
3. **`apps/viewer/topology.js`, the `VA.spineRight` comment block — the last
   statement of the retired rule, in the file that consumes the ids.** It said
   the projection gives "every fork a fresh column to its RIGHT, which is
   git-log's convention", with nothing about the renumbering. The mirror's own
   argument is untouched (column 0 is still the mainline), so this is four
   sentences added, no code. Worth noting *why* it was left: the handoff fenced
   this file to "ONE comment block (item 4)", and item 4 turned out to be
   already done — so the fence quietly excluded the one edit the file needed.
   The mutation tier's shadow snapshot predates this commit; a comment cannot
   move a witness.

### Should-fix, filed (2)

- **`ISSUE_20260930_the_readmes_as_allocated_baseline_is_a_hand_copy_of_a_test_
  literal.md`** (`chore`/`low`). The README's prose carries `branch 20, close
  12, leader 52` and `tests/test_topology_projection.py` carries the same three
  digits as a literal; nothing pairs them, so editing the test's pin leaves the
  README stale with nothing red. Now that finding 1 establishes the layout *is*
  derivable, the fix is cheap: a `pass: applied | as_allocated` field on the
  `layout_crossings` metric, or drop the digits and point at the test by name.
  Not urgent — both copies agree and the walk is not under change.

- **`ISSUE_20260930_a_missing_interpreter_crashes_the_whole_mutation_run_where_
  the_preflight_promised_a_miss.md`** (`bug`/`med`). Out of scope for this
  handoff — found while running the tier this review owes. `runTier()` in
  `scripts/run_mutation_witness_tests.mjs` attaches no `error` handler to its
  `spawn`, so a child that cannot be started re-throws at the process and ends
  the run with no summary. Second sighting in the same tool in one day of
  "three outcomes, not two" on a spawned child; the overlay's existing entry
  has been extended rather than duplicated.

### Nits (not fixed, not filed)

- `Layout.column_order`'s comment says `order_columns` is what "every
  serialisation ends with, so it is never absent". `serialize_chain` returns
  early on an empty chain without calling it. The field is present anyway (the
  constructor default is `COLUMN_ORDERS[0]`), so there is no defect — just a
  slightly stronger sentence than the code.
- `_best_order` computes `_crossing_incidences` and `score(heuristic)` before
  the `n > EXACT_ORDER_MAX_COLUMNS` early return, so a wide topology pays for
  an objective it will not search. Both are linear in the layout; not worth a
  change, worth knowing if the cap is ever raised.
- `_shortest_first` ranges over `range(layout.columns)`, so a column id that is
  allocated but holds no rail would take a position slot. Cannot happen today
  (`allocate` always appends a rail), and it would not change any crossing
  count if it did.

## For the next reviewer / the batch merge

**`handoff/vpa_pitch_linkage_topology_and_feature_fits` adds a sixth committed
topology, and this diff's README sentence is bound to there being five.**
`apps/viewer/tests.js` matches `/crossings went \*\*(\d+) → (\d+)\*\*, (\w+) of
the\s+five to zero/` and indexes `["zero"…"five"][zeroed]`. When that branch
lands, both the sentence and the regex need the new count. It fails **loud**
(the `ok(totals, …)` assertion, not a silent miss), and the coupling pre-dates
this diff — but it is a predictable red at the next batch merge, so do not
spend time bisecting for it.

Also worth carrying forward: the new topology will run through `order_columns`
at build time. If it has ten or more non-trunk columns it falls back to
`shortest_first` and says so (that path has a test); if it has exactly nine,
expect up to ~1.2 s added to every projection build and every `pytest -q`.

## Overlay

Two entries appended to `docs/prompts/REVIEW_AGENT.md`, "Recurring bugs to
check", and one existing entry extended with its second sighting (the spawned-
runner one, now covering "the child never started" as well as "the child
started and threw"). The two new ones:

- *A "this cannot be derived, so it is pinned by hand" justification, in a diff
  whose own test derives it.* The claims registry made "declare it or nothing
  checks it" the house rule, so authors now write a sentence explaining the
  exception — and that sentence is an argument, which nothing checks.
- *A published before/after pair whose BEFORE side quietly became a
  counterfactual, because the diff moved the baseline.* The quiet twin of the
  existing counterfactual entry: the digits recount perfectly from live data,
  and the **attribution** is what went stale.
