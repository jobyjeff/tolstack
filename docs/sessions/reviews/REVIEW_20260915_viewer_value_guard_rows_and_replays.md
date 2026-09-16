---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
reviewer: review agent (review/viewer_value_guard_rows_and_replays)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — viewer_value_guard_rows_and_replays

Four deliverables, all four delivered, one of them knowingly larger than the
handoff asked for and right to be. Every guard in the diff was broken by hand
and watched fail. **APPROVE**, 0 blockers, 3 nits. The one should-fix I found
was removed by a sibling handoff that landed on `integration` mid-review, so it
is recorded below rather than filed.

## What I verified, and how

Merged `handoff/viewer_value_guard_rows_and_replays` into
`review/viewer_value_guard_rows_and_replays` (clean), then `integration` on top
of that (one conflict — see "The integration merge" below), and ran every tier
from this worktree. The numbers below are the **post-merge** run; the guard
mutations in the sections that follow were all re-run against the merged tree.

| tier | result |
|---|---|
| `venv-win/Scripts/python.exe -m pytest -q` | **1093 passed, 1 failed, 1 skipped** — the one red is the pre-existing `test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`, on a strategy brief this branch does not touch |
| `node apps/viewer/run_tests.cjs` (fixture tier) | **311/311**, node-fs tier SKIP as designed |
| `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` | **385/386** — the one red is `[real] the pitch system's grouping is the leader rule at work…`, red on `integration` alone (reproduced against `git archive integration apps`), filed as `ISSUE_20260915_the_shared_projection_predates_the_shortened_part_names_so_a_real_test_is_red_on_integration.md`. Before the integration merge this branch was **373/373** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` | **19/19 browser checks**, both in-page suites 297/297 (`file://` and http) |
| `node scripts/run_mutation_witness_tests.mjs --repo … --only card-layout` | NOT WITNESSED — reproduces the issue the author filed; nothing in the diff touches a mutated file |

Every guard mutation below was re-run on the merged tree and reddens there too.

The lesson's pytest count (886 passed) is right for its own base; the extra
pass was `tests/test_tolerance_stack.py` et al. arriving with the first
integration state I measured (887); the second integration merge took it to
1093. Every other number in the lesson re-derives correctly (below).

### Deliverable 1 — the new `TOPO_VALUE_GUARDS` rows

Six rows added, 9 → 15. Both arms demonstrated per row, by mutation in a
scratch copy of `apps/`:

- `known: () => false` on all six new rows → `[real] no live topology value is
  one the page cannot render` reddens naming **every** live value of each:
  `worksheet_source {null, "declared"}`, `zero_width {false, true}`,
  `nodes[].branch {true, false}`, `layout.rows[].branch {true, false}`,
  `verdict {pass, fail, marginal}`, `verdict_scope {budget, joint}`. So no new
  row's collector is blind and none is vacuous.
- `known: () => true` on all six → the bite test reddens listing all six as
  toothless.

I re-derived the live values independently from
`C:\workspace\tolstack\data\projections\viewer\topologies.json` in Python and
they match the lesson's table value for value, including the two counts that
are easy to get wrong: `layout.rows[].branch` is **163 false / 10 true** over
**node** rows, and the **164** edge rows carry no `branch` key at all — so the
`kind === "node"` filter is load-bearing, not a softening, exactly as the
lesson says.

Branch attributions spot-checked against the source and all correct, including
the one the handoff itself got slightly wrong: `nodes[].branch` drives the
BRANCH POINT chip (`views/topology.js:1433`) while the rail dot's class and
radius read `layout.rows[].branch` through `topology.js:1421`'s
`branch: !!row.branch` (`views/topology.js:805`/`:812`, `topology.js:1768`).
Splitting those across two rows is the right call.

**The deviation, and it is a good one.** The handoff said
`studies[].checks[].verdict` / `verdict_scope` / `worst_confidence` were
"rendered nowhere" and must **not** be rows. That measurement went stale
between the audit and this session: `viewer_study_verdicts_and_gaps` landed the
verdict strip, and `verdict` / `verdict_scope` are read today by
`VA.studyCheckRow` (`topology.js:405-423`) through `VA.studyVerdict`, rendered
at `views/topology.js:1197`. Confirmed by grep. `worst_confidence` is still
read only by `views/stack.js`, off the other projection, so it stayed a
non-row. Two deliberate non-rows are recorded as a comment block inside the
array — the place the handoff asked for and the place the next auditor
actually reads.

### Deliverable 2 — the stack-side empty-collector replay

`unexplainedValues` and `replayBlindCollectors` hoisted above `VALUE_GUARDS`,
both tables calling one copy. Verified:

- Deleting the empty-collector `push` reddens **both** bite tests
  (`source_ref.confidence and elements[].confidence: … 0 !== 1` and
  `layout.rows[].kind: … 0 !== 1`).
- Instrumented `replayBlindCollectors` prints `REPLAY_ROWS 15` twice — 15
  stack-side and 15 topology rows, so the loop reaches the last row rather
  than throwing on the first.
- The stack-side row's `crops` argument still reaches the collectors
  (`guard.values(projection, crops)`); the topology rows ignore the third
  argument.

### Deliverable 3 — "17 of the 46 live nodes", paired

Re-derived from the live projection in Python, independently of the test:
5 topologies, **46** nodes, **17** string-diverged, **10** set-diverged,
**7** same-set-different-order, **0** declaring a part no incident edge
carries. All four published digits match.

Four separate mutations, each reddening on its own assertion with the right
message:

| mutation | failure |
|---|---|
| README `17` → `18` | *"README's count … that wording is the STRING count, not the membership one: 18 !== 17"* |
| comment `17` → `11` | *"renderNodeDetail's comment must state the same number as the README, under the same noun: 11 !== 17"* |
| comment `10` → `9` | *"renderNodeDetail's membership count: 9 !== 10"* |
| comment `7` → `6` | *"renderNodeDetail's count of same-set, different-order nodes: 6 !== 7"* |

The regex pins the *wording* as well as the digit, which is the part worth
keeping: rewriting the sentence to the membership noun fails the match rather
than passing with the other number. `ok(divergedFromDeclared > 0, …)` is
untouched, as instructed. `VIEWER_SRC` is injected only by `run_tests.cjs` and
this whole block sits inside the `NODE_FS` tier, so the hard
`ok(src, "VIEWER_SRC must be injected…")` cannot fire in the browser tier —
same shape as the pre-existing spine pairing at `tests.js:7545`.

### Deliverable 4 — the prose-field replay

The derived `expects_replay` is strictly better than the `>=` the issue
offered, and the `==` is now sound in both directions: `replayed ⊆
expects_replay` holds because the per-member loop asserts every report ends
`:{field}`, and the converse holds iff `unlisted_inventory_fields` honours its
`fields` argument — which is precisely the defect the argument exists for.
Re-ran the author's three decisive experiments:

- Appended `The graph as modelled: 3 parts, 12 edges.` (correct, guarded) to
  `topology_rotor_fastener_length.json`'s `provenance.structure`:
  **`tests/test_topology.py` 120 passed**, and `expects_replay` grows to
  `{description, notes, provenance}` — i.e. the old literal
  `== {"description", "notes"}` would have gone red on this edit. Reverted.
- `key not in fields` → `key not in PROSE_FIELDS` inside
  `unlisted_inventory_fields`: red on the **vacuity** assertion
  (`assert set()`), with the message that names the right cause. Reverted.
- Dropping a `PROSE_FIELDS` key still reddens (via the completeness arm).

The corpus and `tests/test_topology.py` are byte-identical to the branch after
my experiments (`git status` clean).

## Findings

### Should-fix — raised, then overtaken by the integration merge

**S1. A third copy of the node-divergence count, in `apps/viewer/topology.js`
— resolved by the merge, not by a filing.** At the branch's own base,
`VA.nodeSideIds`' preamble still read *"the pane printed the node's authored
`parts` here and **10 of the 46** live nodes disagreed with their own card"* —
the same membership number under the same string-flavoured wording the other
two sites had just had corrected, and unpaired. The handoff named
`apps/viewer/topology.js` do-not-touch, so it was scope rather than an
omission. Before I could file it, `integration` moved:
`viewer_component_names_and_reference_copy` renamed that function to
`VA.nodeSideLabels` and **removed both digits**, replacing them with a pointer
at the issue this handoff resolves. So the finding no longer exists in the
merged tree and the issue I had drafted was deleted rather than committed.
See "the semantic conflict" below for the one line of it I did fix.

Second sighting of the overlay's *"The handoff enumerated the sites of a prose
claim — so grep for the one it missed"* entry (no overlay edit needed): the
grep was right, the sibling handoff just got there first.

### Nits

**N1. The per-row blind-collector replay is one assertion written 30 times.**
`replayBlindCollectors` substitutes `values: function () { return []; }` for the
row's own collector, and `known` is never called on an empty collector — so the
only thing varying across the 30 iterations is the `field` string in the
message. It does prove `unexplainedValues`' empty arm fires (deleting the `push`
reddens both bite tests), which is the hole the issue was filed over; it does
not prove anything *per row*, despite the comment saying "the claim is about the
rows this file actually ships". The shape was prescribed by the handoff and
inherited from `projection_field_guard_rows`, so this is not a finding against
the author. Added to the overlay's **Recurring bugs** list with the question to
ask next time and the harness that would make it a real per-row claim.

**N2. The lesson reports no JS tier numbers.** The definition of done named the
fixture tier and the browser-tier `--repo` run; §6 reports only pytest. Both are
green (302/302 and 19/19 / 288+288) — measured in this review and recorded in
the table above rather than by editing the author's lesson.

**N3. Two of the three issues the author filed are duplicates — of filings that
did not exist when they wrote them.** `test_every_byte_identity_claim_…` has now
been filed **six** times, once per session that ran while the red stood; and
`card-layout-out-of-flow` was filed twice the same day, the second time by
`viewer_component_names_and_reference_copy` against a larger tier (21/22 rather
than 17/18). Both of the author's filings carry something the other filings do
not — the figure-of-speech reading of the brief's sentence, and the *mechanism*
by which the mutation reddens the wrong sub-check — so I cross-referenced rather
than deleted, with a duplicate blockquote at the top of each naming every
sibling and which one to keep. Second sighting of the overlay's "two handoffs
from one triage sweep file the same issue" entry, now at six-fold scale; the fix
is a triage disposition, not an agent behaviour change.

### Not findings, recorded so the next reviewer doesn't re-derive them

- **A `--repo` run's `[real]` tier is not reproducible across minutes.** My
  first `--repo C:\workspace\tolstack` run was 369/373 with four pitch-link
  `[real]` tests red; a re-run minutes later on the same commit was 373/373.
  `data/projections/viewer/*.json` is shared and another live session
  (`review/viewer_respine_whole_walk`, per the provenance stamp) rebuilt it
  mid-review. Before attributing a `[real]` red to a diff, read the three
  stamps and re-run. Added to the overlay.
- The author's edit to `docs/prompts/REVIEW_AGENT.md` (out of the handoff's
  declared file scope) repairs a pointer deliverable 2 broke — the overlay
  named the bite test by its old title. Correct to make, correctly disclosed,
  and the new title matches the test's actual concatenated name.
- `WORKSHEET_SOURCES` in `tests.js` is a test-side vocabulary copy, but there
  is no named **Python** constant for `worksheet_source` to pair it to (both
  builders emit `"declared"`/`"by_name"` as inline literals in `worksheet_for`),
  so the overlay's *"an `inList([...])` row that copies a Python constant"*
  entry does not bite. One copy replaced two, and
  `ISSUE_20260915_worksheet_source_vocabulary_has_no_va_constant.md` carries a
  three-step fix shape for the real home.
- `gaps[].kind` still has no `TOPO_VALUE_GUARDS` row; that is
  `ISSUE_20260915_the_new_gap_kind_field_has_no_topo_value_guard_row.md` (open,
  low), not this handoff's four named fields.

## The integration merge, and what its resolution chose

`integration` moved twice while I reviewed (`916b448` → `d16db3b`, carrying
`viewer_component_names_and_reference_copy`), so the finishing merge went
through `git merge integration` into the review branch first. One textual
conflict and one semantic one, both in the node-sides copy:

- **`apps/viewer/README.md`, hover-card bullet — textual.** Integration
  rewrote the sentence to introduce `VA.nodeSideLabels` (one label style where
  there were two) and deliberately **kept `10`**, adding *"a count whose own
  wording is contested and owned elsewhere"* plus the issue link. This branch
  fixes that exact count to `17` and pairs it. Resolution: integration's new
  `VA.nodeSideLabels` sentence, this branch's `17 of the 46 live nodes
  answering differently hovered and clicked`, and the "contested / owned
  elsewhere" clause dropped — the contest is what this handoff settles, and
  the clause would have pointed at an issue about to be marked resolved. The
  paired regex still matches the merged wording (verified by re-running).
- **`apps/viewer/topology.js:2452-2464` — semantic, and the one line I fixed.**
  `VA.nodeSideLabels`' preamble arrived from integration saying *"How MANY is a
  contested number owned elsewhere -- ISSUE_20260915_the_viewer_readmes_10_of_
  46_node_divergence_count…"*. Correct on integration, wrong the moment this
  branch merges. Rewritten to say the number is settled, is stated in exactly
  two places, and is re-derived by the `[real]` test — keeping integration's
  discipline of *not* restating it there. This is the merge's own semantic
  conflict, not an unrelated edit under cover of one.
- `apps/viewer/tests.js` auto-merged cleanly and coherently: integration's
  version of the node test now derives `sideIds` from `card.sides[].part` (the
  card is the surface, and `VA.nodeSideIds` no longer exists) while this
  branch's two counts and five doc assertions sit on top of it. Same
  adjacency, same numbers — 17 / 10 / 7 / 46 still hold, and all four digit
  mutations were re-run on the merged tree.

## For the next reviewer

The four digits in `renderNodeDetail` and the one in the README are now
properties of a **shared, concurrently-rebuilt** projection. That is the right
design, and it means a rebuild that adds a node or a gap edge reddens
`apps/viewer/tests.js`'s node test in *someone else's* worktree. When it does,
the fix is to re-derive and restate — the test prints both numbers it compared.
