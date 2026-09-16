---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_viewer_respine_whole_walk.md
reviewer: agent (review/viewer_respine_whole_walk)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# Review — viewer_respine_whole_walk

**Verdict: APPROVE.** The decided behaviour is built, and it is built as
emphasis over one layout rather than as a second layout, which is what the
handoff asked for. Three should-fix findings, two of them fixed inline (a test
whose length-mode loop the diff accidentally made vacuous, and two wrong
numbers); one left as a filed issue. Three fast-tier mutation-witness entries
added for the handoff's three headline contracts, which the tactical lesson
carried no mutation list for.

The seven mandatory stack checks **do not apply**: this is viewer/JS work on
the topology page, with no tolerance stack, element, `source_ref`, spec-library
event or projection-builder change in the diff. No value, band, `confidence` or
`zero_width` moved, so the "a STACK-DATA change is a viewer-test change" trap
is not in play either. `docs/tolerance_stacks/`, `docs/topologies/`,
`data/inbox/specs/` and `docs/reference/` are untouched; nothing was written
into drawing-checker.

## What was verified, and where

Merge of `handoff/viewer_respine_whole_walk` into `review/viewer_respine_whole_walk`
was **clean, no conflict** (merge-base `2dbd3d7`; `integration` had moved to
`916b448`). Containment checked before starting — `git merge-base --is-ancestor`
said NOT merged, so the merge-and-watch-it-go-green step was real.

**The projections were stale and I rebuilt them.** `results.json` and
`topologies.json` were stamped `handoff/viewer_study_verdicts_and_gaps` @
`13fbf3f` (dirty), which predates `pitch_link_known_bands`; against them the
`--repo` tier was **374/378**, with four failures all in the pitch-link band /
zero-width family and none belonging to this branch. `13fbf3f` is an ancestor
of the review HEAD and that worktree no longer exists, so the rebuild was mine
to make and the exit-3 gate accepted it:

```
build_viewer_projection.py   --data-root C:/workspace/tolstack/data
build_topology_projection.py --data-root C:/workspace/tolstack/data
```

`crops.json` is `master` @ `ed394ec`, an ancestor — the ordinary harmless case,
left alone (PyMuPDF is not in this repo's venv anyway). After the rebuild the
four failures are gone.

| tier | result | where |
|---|---|---|
| `pytest -q` | **887 passed, 1 skipped, 1 failed** | review worktree |
| `pytest -q` | **879 passed, 2 failed** | main checkout (`master`) — see below |
| `run_tests.cjs` (mock only) | **305/305** | review worktree |
| `run_tests.cjs --repo C:/workspace/tolstack` | **378/378** (tier ran) | review worktree |
| `run_viewer_browser_tests.mjs --repo …` | **19/19 suites**; `topology` 165/165, `topology respine` 39/39 | review worktree |
| `run_mutation_witness_tests.mjs --repo …` | **20/21 witnessed** | review worktree |

The `--repo` total is **378**, not the lesson's 376: the lesson ran in the
tactical worktree before `integration` moved, and the merge brought two more
tests with it. The tier really ran (`[real]` present, forward-slash `--repo`),
and the mock-only run is 305 — the 73-test gap is the tell.

**The main checkout is on `master` and lags, and my rebuild widened that by
two tests — stated here because a pasted suite line is checkout-specific.**
`C:\workspace\tolstack` (`master`) reports `879 passed, 2 failed`: the byte-identity
one above, plus `test_viewer_js_suite_is_green`, which is the JS `[real]` tier
at **356/360** there. Two of those four are fixture drift
(`fixtures.js` missing `stacks[].checks[].margin`, `topology_fixtures.js`
missing `topologies[].gaps`) and **predate my rebuild** — the old projection
already carried both keys, verified against the backup copy. The other two
(`the two zero-width bands are flagged`, `the folded numbers reach the page
verbatim`) **are mine**: the rebuild carried `pitch_link_known_bands` forward
(`pitch_link_to_pitch_plate` went from 2 `zero_width` elements to 0), and
`master`'s own tests still pin the pre-change state. That is the standing
shared-`data/` condition
(`ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`),
not a finding against this work, and it clears when the operator batch-merges
`integration` → `master`. The review worktree — the tree that actually carries
the merged code — is green on all four.

**The one pytest failure on the merged tree is pre-existing and not this
branch's.**
`test_every_byte_identity_claim_in_a_live_file_names_its_verification` on
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`,
which arrived from `integration`. Note for triage: that red now has **five**
separate issues filed against it —
`byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration`,
`byte_identity_guard_reds_the_suite_on_a_triage_authored_brief`,
`strategy_brief_byte_identity_claim_fails_the_provenance_guard`,
`byte_identity_claim_in_origin_posture_brief_names_no_verification` and
`byte_identity_guard_red_on_the_origin_posture_brief`, from five different
handoffs between 13:21 and 21:38. **This handoff filed none of them** — it
cited an existing one, which is the behaviour the overlay asks for. Triage
should keep one (the `med` filed at 13:21 has priority) and close four.

**The mutation tier's one miss is pre-existing, verified independently.**
`card-layout-out-of-flow` is NOT WITNESSED. I reproduced it at the branch base
by `git archive`-ing `2dbd3d7` into a scratch tree with `node_modules`
junctioned: `0/1 witnessed`, identical `locator.hover: Timeout 30000ms` trace
with the `croppop__img` intercepting pointer events. The author's explanation
holds and the issue they filed
(`ISSUE_20260915_card_layout_mutation_aborts_its_suite_before_the_check_it_declares.md`)
describes the mechanism correctly.

### The decided behaviour, measured rather than read

Handoff DoD, on the live pitch-link topology, probed through a throwaway
`[real]` test against the rebuilt projection (dots / bars / rails / links /
dimmed bars / leaders / grid rows):

```
walk, no study                       7/8/3/4/0/5/8
pitch_link_cotter_hole_clearance     7/8/3/4/3/4/5
pitch_link_shank_out                 7/8/3/4/4/5/4
pitch_link_thread_region_t           7/8/3/4/6/2/2
```

All 7 nodes and 8 edges survive every selection; non-members dim (the
pre-existing `.rail__bar--off, .rail__dot--off { opacity: .28 }` rule, no new
tween code — handoff item 5); leaders drop to chain nodes; each grid is exactly
its chain's length (5 / 4 / 2). `#` ordinals on `cotter_hole_clearance` read
`3,2,1,5,4` top to bottom, i.e. walk order with the sum's order in the column —
the load-bearing call of the session, and the lesson's argument for it
(leader-seam correspondence, `VA.leaderBands`' monotone `boundary`) is sound.

Across all five topologies × 21 summing studies: **99 leaders, 0 violations**
of "the seam a leader points at is bounded by one of its own edges" — the
invariant the new test claims. Columns and `dagHeight` identical on both sides
of every selection (item 4, no re-columning); `pitch_system` /
`gas_spring_branch` pane width **316 → 250px** and `gridOffset` **299 → 143px**,
matching README and the assertions that read it.

### Mutations — the deliverable, and the wiring

Six one-line reverts in a `git archive` scratch copy. Every one reddens:

| mutation | fast | `--repo` |
|---|---|---|
| `spineRight(topoProj.layout)` → swap in `study.layout` | 302/305 | 373/378 |
| `gridPlan(…, focus)` → `gridPlan(…, null)` | 303/305 | 374/378 |
| `if (focusEdges && !focusEdges[row.id]) return;` → `if (false)` | 302/305 | 372/378 |
| drop the `focusNodes` clause on the leader condition | 302/305 | 372/378 |
| delete `if (marking) classes.push("rail__leader--on")` | 304/305 | — |
| `marking` → `!!study` | 304/305 | 377/378 |

So the three emphasis contracts are all observable, and the `marking` predicate
is observable in the fast tier as well as in its declared browser entry. What
they were **not** was *declared* — the lesson carries no mutation list, and the
one entry the handoff re-pointed covers the refusal branch only. Per the
overlay's own instruction ("five strings, cheaper than filing an issue"), I
added three fast-tier entries and confirmed each alone:
`dag-is-always-the-whole-walk`, `grid-drops-to-the-chains-rows`,
`leaders-run-only-to-chain-nodes` — each `1/1 witnessed`,
`tests/test_mutation_witnesses.py` 10 passed.

### Other checks run

- **Retired vocabulary really is gone.** `layoutMode`, `chainable`,
  `#layout-toggle`, `tvrow--on/--off`, `rail__leader--off`, `onLayoutMode`,
  `Showing: study chain` — no live occurrence in `apps/`, `scripts/`,
  `ARCHITECTURE.md`, `README.md` or `docs/DAG_TOPOLOGY.md`; the survivors are
  historical mentions in comments and in this overlay, deliberately. 38
  `layoutMode` sites in `tests.js` at `integration`, 0 after (the lesson's
  "~35" is fine).
- **New browser-tier waits are render products, not static markup.** The diff
  swapped the retired `tr.tvrow--on` for `.chip--total`, which one synchronous
  renderer creates — unlike `#banner`, the shape the
  `viewer_browser_tier_wait_predicates` entry warns about. Each is followed by
  a `!tweening` wait.
- **`git diff -w --stat` collapses nothing suspicious** (1118 vs 1120 lines);
  no NUL byte, no whole-file re-emit.
- **No data pollution.** `data/` carries only the two projections I rebuilt
  deliberately (diffed old vs new; the changes are the `pitch_link_known_bands`
  values the stale build predated). Both checkouts `git status` clean. No stray
  `workspace<repo>data` directory.
- **`--only` spot-check**: the mutation tier runs `topology file://` alone on
  every browser entry and its clean run came back green each time, so the
  "green in a full run is not green" trap is covered for the suite this work
  touched.

## Findings

### should-fix (fixed inline)

1. **`apps/viewer/tests.js` ~7189 — a narrowed helper's call sites kept the old
   arity, and the length-mode loop went vacuous.** The diff correctly narrowed
   `ctxFor` from `(topoProj, study, layoutMode, mode)` to
   `(topoProj, study, mode)` and left both calls as
   `ctxFor(topoProj, null, "topology", mode)` / `ctxFor(topoProj, study,
   "chain", mode)`. JS drops the fourth argument, so `edgeLengthMode` became
   the literal `"topology"` / `"chain"` — both of which fall back to uniform —
   and `["uniform","tolerance","absolute"].forEach` ran the **same mode three
   times**, inside `[real] a respine of every summing study of every topology
   settles on the fresh render's own geometry, bar for bar, in every length
   mode`. Green, exit 0, and `cycles >= 12` still passed because it counts
   iterations. **Fixed inline** (two arguments); re-ran and the contract holds
   in all three real modes — 378/378 — so this was pure coverage loss, not a
   masked failure.

2. **`apps/viewer/tests.js:7784` — the comment quotes the README as saying the
   pane goes `316 -> 226px`; it says `250px`.** 226 is
   `gas_spring_mechanical_stroke`'s width, a different study from the one the
   sentence and the assertion are about (measured: mechanical_stroke =
   226/273, gas_spring_branch = 250/143). The assertion itself is right and
   reads the README. **Fixed inline** to 250.

3. **`LESSONS_20260915_viewer_respine_whole_walk.md` — "7 dots, 8 bars, 3
   rails, 0 links" for the three pitch-link studies; it is 4 links.**
   `pitch_link_to_pitch_plate.layout.links` has four entries and the page draws
   all four, under the walk and under each study. Every other figure in that
   sentence reproduced exactly (3/4/6 dimmed, 4/5/2 leaders, 5/4/2 rows), which
   is what let a wrong sixth one through. The session's own `[real]` sweep
   asserts the rendered link count against `layout.links.length`, so the code
   was never wrong — only the sentence. **Fixed inline** with a dated
   correction blockquote.

### should-fix (filed, not fixed)

4. **`apps/viewer/README.md` — the inconsistency premise for the change does
   not reproduce.** The new paragraph explains the retirement with *"two of
   `pitch_link_to_pitch_plate`'s studies dropped rows while the third's chain
   covered nearly everything"* (restating handoff item 3). Replayed on the
   branch base: in **chain mode** (what a nav click gave) all three studies
   dropped rows — 8 → 5 / 4 / 2 — and nothing was dimmed in any of them; in
   **topology mode** (the deep-link path, which never set `layoutMode`) no rows
   dropped and 3 / 4 / 6 were dimmed. `thread_region_t` is the *most* reduced
   in both, and there is no state in which two studies dropped rows and a third
   did not. Not fixed inline because rewriting a strategy-authored premise is
   not a reviewer's call, and Jeff's verbatim quote — which carries the
   decision on its own — is unaffected. Filed as
   `ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_change_does_not_reproduce.md`
   (`chore` / `low`), with the honest version of the argument in the suggested
   fix.

### nits

- `scripts/run_viewer_browser_tests.mjs`, the study-selection block: `push("the
  grid is exactly the chain, and shorter than the walk's table", chained.rows
  === 3 && chained.rows < walkRows)` restates `demo_strut_branch`'s chain length
  by hand where the fixture can supply it. The mock fixture is stable so nothing
  is at risk today, but the sibling assertions in the same block all derive
  their counts.
- `edgeRow`'s `var hit = chain[planRow.id]` now reads a map that, with a focus
  in play, cannot miss — every row in the table is a chain member. The `hit ?`
  guards on the ordinal and contribution cells are still needed for the
  deselected walk, so this is not dead, just narrower than it reads.
- The `[real]` sweep's refusal arm (`if (study.status !== "ok")`) is
  unreachable on the live corpus — all 21 committed studies are `ok`. The mock
  fixture covers it; worth knowing before crediting the `[real]` test with that
  half.

## Overlay updated

- Two new **Recurring bugs** entries: the narrowed-helper/old-arity shape from
  finding 1, and "a retired behaviour's justification prose is a claim about a
  tree you still have — replay it" from finding 4.
- Historicized the two `chainable()` / `layoutMode` citations (the
  guard-that-no-longer-witnesses entry and the
  mutation-list-vs-own-conditionals entry): both examples stand, but the names
  are gone from the tree as of this handoff and a reader chasing them should be
  told so. Both halves of each sentence checked, per the overlay's own
  "historicized the noun clause but left the imperative" entry.

## For the next reviewer

- `brief item 2` (grid row motion / FLIP) is now decidable against a
  walk-order **subset** rather than a second table; the lesson's note on
  `gridOffset + boundary × rowHeight` is the constraint to carry in.
- `ISSUE_20260915_the_per_element_respine_fade_is_no_longer_reachable_from_the_page.md`
  (`audience: strategy`) is the author's own flag that `VA.tweenAlpha` and
  `fade()` are now unreachable no-ops. I pushed on it as the lesson asked and
  agree with keeping them for now: the four re-based tests are honestly
  labelled synthetic in place, the functions are pure, and the decision it
  waits on (column repacking) is live. It is correctly routed rather than
  quietly kept.
