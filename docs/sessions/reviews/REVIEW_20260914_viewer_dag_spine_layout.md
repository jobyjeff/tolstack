---
type: review
handoff: viewer_dag_spine_layout
reviewer: review agent (dispatch)
date: 2026-09-14
verdict: APPROVE (round 2; round 1 was REQUEST CHANGES)
blockers: 0
---

# Review — viewer_dag_spine_layout

> **Round 1 (below) returned REQUEST CHANGES on two blockers. Round 2
> (`0fb76ef`) answered all five findings; I re-verified by mutation and
> merged. The round-2 section is at the end — the round-1 findings are kept
> verbatim as the record of what was wrong, not as open items.**

Display-only work in `apps/viewer/` (plus the browser-tier runner). Not a
tolerance stack: no `source_ref`, no `lmc`/`mmc`, no `fold()` term list, no
traced ratio. The seven mandatory stack checks are **not applicable** and are
recorded as such below rather than skipped silently. `scripts/build_*` and
every projection schema are untouched, as the handoff required; the diff adds
no module, so `ARCHITECTURE.md`'s inventory needs no row.

## The mandatory checks — applicability

1–7 (tolerance traces, path signs, LMC/MMC direction, RSS computed, nominal
inside min/max, quantised cotter constraints, traced ratio): **N/A**. The diff
touches no stack JSON, no `hardware_entries.json`, no `materials.json`, no
worksheet. `git diff integration...handoff --stat` is six `apps/viewer/` files,
one `scripts/` file, one lesson and two issues. The one arithmetic-on-dimension
exemption this app holds (`VA.edgeLengthValue`, bar-length pixels only, never a
printed number or a verdict) is unchanged — the new `VA.fitEdgeLength` /
`VA.centreOffsets` / `VA.dagHeightBudget` consume its output as pixels and add
no new field read.

## What I verified

**Merged, then ran everything myself** (`git merge --no-ff
handoff/viewer_dag_spine_layout`, no conflicts; `integration` was not held by
any worktree and containment showed NOT_MERGED, so my merge was a real one and
the green below is post-merge):

- `venv-win/Scripts/python.exe -m pytest -q` — **768 passed, 1 skipped**.
- `node apps/viewer/run_tests.cjs` — **241/241** (node-fs tier SKIPPED, as it
  always is from a worktree).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` — **290/292**,
  tier ran. The two reds are `[real] every fixture shape still matches the
  builder's` (`stacks[]` / `stacks[].stack` missing `description`) and `[real]
  the topology fixture's shapes still match the builder's` (`parts[]` missing
  `mesh`). **Confirmed pre-existing and not this branch's**: I extracted
  `integration` to a scratch tree (`git archive integration | tar -x`) and ran
  the same command there — the identical two reds, 281/283. The live projection
  was rebuilt *again* at 23:47 UTC, mid-review, by
  `review/annotate_affordances_flyout_and_mesh_gating` (read out of
  `provenance.repo_root`); a re-run after it was still 290/292.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` —
  **16/16 suites**, topology 118/118 on both `file://` and http, height budget
  18/18. (The worktree needs `node_modules`; I junctioned the main checkout's.)
- **Re-derived every headline number in the README and the lesson** from the
  live projection with a standalone script over `VA.spineRight` /
  `VA.rowPositions` / `VA.leaderGeometry`, at the same 782px budget the lesson
  states. Every one reproduces exactly: total leader-vs-rail crossings
  **92 → 43**, four of five topologies to zero; `pitch_system` max jog
  **507 → 208** (uniform/feature size) and **2246 → 208** (tolerance width);
  `pitch_system` tolerance-width DAG height **3325px → 1170px**;
  `rotor_fastener_length` tolerance width **1586 → 782**, landing exactly on
  the budget. The measurements in this handoff are honest and re-derivable.
- **`VA.fitEdgeLength` is correct, not just tested.** Walked the solver: total
  height is non-decreasing in `length` and bottoms out at
  `fixedHeight + n × floor` (every ratio ≤ 1), so the early return is the exact
  infeasibility test; and at any `k` below the true break point the computed
  length is ≥ the true solution, which makes `sorted[k+1] × length ≤ floor`
  fail — so the loop cannot return a wrong `k`. Zero ratios sort last and break
  the loop onto the floor. No searching, no drift.
- **The prior review's fence held.** `REVIEW_20260910_viewer_edge_length_scaling`
  left a note: a future change invalidating the leader-monotonicity argument or
  `CORRESPONDENCE_IN_PAGE`'s bbox reading must be caught. This handoff
  invalidated the bbox reading (a centred grid lets a leader descend) and fixed
  it the right way — `getPointAtLength(0)` / `getPointAtLength(total)`, still
  measuring the path the browser rendered, now direction-blind. The floor
  guarantee (no edge ever below one row) survives, so monotonicity and the
  no-crossing proof are untouched.
- **Universal check — test data pollution:** none. The three suites write
  nothing into `C:\workspace\tolstack\data\`; the only recent writes there are
  two other worktrees' projection rebuilds, attributable by
  `provenance.repo_root`.
- **Universal check — `.tv__scroll` gained no `overflow-y`.** `topology.css` is
  not in the diff at all.
- **Issue hygiene:** both filed issues carry correct frontmatter
  (`type: feature`, `priority: med`, `status: open`, `area:`, `reporter: agent`,
  `audience: strategy`) — every value in-vocabulary.

## Findings

### Blockers (2) — both "the guard cannot fail", neither a defect in behaviour

The shipped behaviour is right. I verified all three deliverables by
measurement. What is missing is that **two of the three can be undone by a
one-line edit with every tier still 100% green**, which the universal check
("do not accept a check on the strength of green") and this repo's own overlay
both forbid. I did not fix these inline: each needs a new test, which fails
prong 2 of the inline-fix boundary.

**B1. Deliverable 1's render wiring is unpinned — `renderTopoPane` can stop
mirroring and nothing notices.** `apps/viewer/views/topology.js:168`. The nine
new tests all call `VA.spineRight(...)` themselves, including the `[real]` one
over every committed topology. In a scratch copy I changed that line back to
`var layout = layoutFor(topoProj, study, ctx.layoutMode);` and measured:

```
node apps/viewer/run_tests.cjs                      241/241 pass
node apps/viewer/run_tests.cjs --repo .../tolstack  290/292 (the two pre-existing)
node scripts/run_viewer_browser_tests.mjs --repo .. 16/16 suites, topology 118/118
```

The reason it is invisible is structural: a column mirror moves only **x**, and
every check in the tree measures y, or measures the store against itself
(`BARS_MATCH_STORE_IN_PAGE` re-mirrors the layout itself before comparing;
`CORRESPONDENCE_IN_PAGE` compares leader ends to dot centres, which move
together). This is a second sighting of the overlay's "**A `[real]` test that
asks the view-model instead of the page**" entry, one seam further out, and it
matters concretely: the staged study-respine animation handoff is queued to
edit this exact function.

*Smallest fix:* one render-level assertion — render the pane, read the mainline
dots' `cx` (or the rails' `x`) out of `svg.tv__rails`, and assert they sit at
`VA.railX(layout.columns - 1, M)`, i.e. to the **right** of every branch rail.
One test, fast tier, no new machinery.

**B2. Deliverable 3's actual rule — centring across the leaders' span — is
unpinned, and the handoff's literal reading passes in its place.**
`apps/viewer/topology.js`, `VA.centreOffsets`. Forcing the height-centring
fallback (`if (plan.leaders.length)` → `if (false)`) is green on all three
tiers, including the browser tier's `[mock]`/`[real]` `gridOffset` checks —
they compare the DOM against the store, so they hold under any centring rule.

This is not a coverage nit, because leader-span centring is a **deliberate,
measured deviation from the handoff**, and the handoff's literal reading
("centre the shorter against the taller") is exactly what a future reader will
reach for as a simplification. The README calls the distinction "not a
subtlety" and the lesson records the number that justifies it
(`pitch_link_to_pitch_plate` under tolerance width: 132px → 228px *worse* under
height-centring). Nothing in the tree preserves that number.

*Smallest fix:* one test that computes max jog under both rules on a fixture
where they differ and asserts leader-span wins — the fixture already exists
(the current centring test computes `maxJog` and could compare against the
height-centred store instead of only against the flat one).

### Should-fix (3) — the handoff keeps ownership; no issues filed, per the verdict

**S1. `scripts/run_viewer_browser_tests.mjs` hard-codes `26 * 45`** as
`pitch_system`'s floor minimum (rowHeight × row count), in the tolerance-width
bar check. That is this repo's most-repeated defect shape — a structural count
restated by hand with nothing pairing it to the source — and the *same file*
already computes it properly in `FIT_IN_PAGE` (`floorMin`). If `pitch_system`
gains a row or `rowHeight` moves, the bound silently becomes wrong and nothing
fails. Return `floorMin` from `BARS_MATCH_STORE_IN_PAGE` the way `FIT_IN_PAGE`
does, and use it.

**S2. Three live-document numbers in `apps/viewer/README.md` have nothing
pairing them to the tree**: "crossings went **92 → 43**, four of the five to
zero", "`pitch_system`'s max jog **507px → 208px**", and "45 rows × 26px =
1170px". I re-derived all three and they are correct today. But the `[real]`
crossings test deliberately pins only the spine half (43 → 0) plus
`after.total < before.total`, for a good reason stated in the issue — which
means the README asserts precisely the numbers the test declines to hold. A
layout-policy change moves them and nothing goes red. (`docs/sessions/` is
dated history and exempt; `apps/viewer/README.md` is live.)

**S3. The browser tier's centring check has no non-vacuity witness.**
`Math.abs(f.measuredGridOffset - f.gridOffset) < 0.75` passes trivially at
0 ≈ 0. The fit checks beside it *do* carry witnesses ("the demo DAG is short
enough that the fit is real room, not the floor"; "its own floor is past the
budget") — which is the right shape, established by
`hover_card_layout_guard_can_fail`. Push a `gridOffset > 0` witness before the
contract, in both the `[mock]` and `[real]` blocks.

### Nits

- **Fixed inline (disclosed):** `apps/viewer/views/topology.js`, the
  `paneBudget` comment named `EDGE_LENGTH_SCALE.fallbackRows`, which does not
  exist — the fallback is `maxRows` alone. Corrected to say so. Comment only;
  clears all three prongs. (The same commit that introduced it, `e541b79`,
  fixed two other stale references from the fit's earlier shape and missed
  this one.)
- `VA.lastTopoRender` is new module-global render state written on every paint.
  Justified (the browser tier needs the budget the render measured, and the
  animation handoff needs a store outliving one paint) and documented — but it
  is now a thing a test can read *instead of* the DOM, which is part of how B1
  stayed invisible. Worth a fence in the next handoff that touches it.

## The one thing to tell Jeff, whatever happens to the blockers

**`pitch_system` at comfortable density still does not fit one viewport, in any
mode** — 45 rows × 26px = 1170px against a 782px budget — and under the fit its
tolerance-width view is now *identical* to uniform, every bar on the floor and
marked not-to-scale. That is a large improvement on 3325px and it is honest
(the legend says so), but the DoD sentence "whole topology visible within one
viewport height in all three edge-length modes" is **not** met on the one
document the handoff was written for. Compact density is the escape hatch that
already works: 720px, whole DAG in one window, tolerance width landing exactly
on the budget with 13 of 24 edges in true proportion. The agent measured this,
reported it plainly rather than quietly, and filed
`ISSUE_20260914_scaled_length_modes_collapse_on_a_tall_dag.md`
(`audience: strategy`) with four options. That issue is the decision, and it is
Jeff's.

The other filed issue,
`ISSUE_20260914_branch_leaders_still_cross_the_rails_right_of_them.md`, is the
same kind of honest accounting: a mirror is a bijection, so on a five-fork
mechanism it trades the spine's 43 crossings for the branches' 43 rather than
removing them (47 → 43 total). Both issues are correctly classified and both
route to strategy. Filing them was the right call.

## Note for the next reviewer

Three things this review leaned on that are worth repeating:

1. **Mutate the wiring.** `git archive HEAD | tar -x -C <scratch>`, junction
   `node_modules` from the main checkout, delete the one line that implements
   the deliverable, re-run all three tiers. It took five minutes and found both
   blockers. Two new overlay entries record the shape.
2. **The `[real]` tier's reds may belong to a different worktree.** `data/` is
   shared; check `provenance.repo_root` / `built_at` in the projection before
   believing a fixture-drift red is the branch's. It changed under me once
   mid-review.
3. The browser tier needs `node_modules` and a worktree has none — junction
   `C:\workspace\tolstack\node_modules` rather than `npm install`ing a second
   copy. It is gitignored, so it leaves `git status` clean.

---

# Round 2 — `0fb76ef`, all five findings answered: APPROVE

The tactical agent returned one commit answering both blockers and all three
should-fixes. I merged it, merged today's `integration` on top of it, re-ran
every tier, and **re-ran the exact mutations that produced the blockers** — the
point of a guard being that it fails, not that it exists.

## Each new guard, observed failing

| finding | mutation | result |
|---|---|---|
| B1 | `renderTopoPane` stops calling `VA.spineRight` (one line) | **FAIL** — `the RENDER draws the spine on the rightmost rail — the page mirrors, not just the layout helper`, 254/255 |
| B2 | `VA.centreOffsets`: `if (plan.leaders.length)` → `if (false)` | **FAIL** — `centring across the leaders beats centring the two blocks' heights`, 254/255 |
| S2 | `apps/viewer/README.md`: `92 → 43` edited to `93 → 43` | **FAIL** — `[real] every number apps/viewer/README.md states … is re-derivable from the live projection`, 306/309 |

Each names the right test and nothing else. That is what round 1 was missing.

The two blocker fixes are better than what I suggested, and worth recording:

- **B1** does not just assert the mainline x — it also requires a rail to the
  **left** of the spine, so the check cannot pass forever on a one-column
  diagram. That is the non-vacuity witness discipline applied to a check I only
  asked to exist.
- **B2** pins the *property* rather than the offset: leader-span centring is
  the min-max optimum, so nudging the grid one row either way must make the
  worst jog worse — plus a purpose-built `lopsidedTopo()` fixture (all the
  drawn length below all the leaders, the real documents' shape) where the two
  rules differ by more than 2×. Pinning the property means a future re-derivation
  of the same rule stays green while a reversion to the handoff's literal
  reading goes red, which a pinned number would not have managed.

**S1** now computes `floorMin` from the layout inside
`BARS_MATCH_STORE_IN_PAGE`, beside where `FIT_IN_PAGE` already did — the
`26 * 45` is gone. **S3** pushes `gridOffset > 1` witnesses before both
centring contracts, `[mock]` and `[real]`. The disclosed inline fix was taken
onto the branch verbatim.

## Suites, on the merged tree (round 2 + today's `integration`)

- `pytest -q` — **815 passed, 1 skipped**.
- `node apps/viewer/run_tests.cjs` — **255/255**.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` — **307/309**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` —
  **16/16 suites**; fast suite 245/245 in-browser, topology 118/118 both
  transports, height budget **20/20** (up from 18 — the two new witnesses).

**The two real-tier reds are `integration`'s own, not this branch's**, and the
set changed twice during the review because `data/` is shared. Baselined by
extracting today's `integration` to a scratch tree and running the same
command there: **295/297, the identical two tests** — `[real] the fixture's
crop shapes still match the builder's` (`crops.json` gained `region_label` /
`region_match`) and `[real] no live value is one the viewer has no branch for`
(`located_by = "declared_region"`). Both come from the in-flight
`handoff/spec_crop_region_registry`, which rebuilt the shared `crops.json` at
00:09 UTC and has not landed. The `description` / `mesh` drift I reported in
round 1 is **gone** — `stack_title_style_pass` and
`annotate_affordances_flyout_and_mesh_gating` merged their regenerated fixtures
into `integration` in the meantime.

## The merge, and its one conflict

`git merge integration` into the review branch conflicted in exactly one file,
`docs/prompts/REVIEW_AGENT.md` — a **pure append-collision at the same
anchor**: the two entries I appended in round 1 against four appended by the
`stack_title_style_pass` and `annotate_affordances_flyout_and_mesh_gating`
reviewers, all at the end of `## Recurring bugs to check`. Neither side edits
the other's text. **Resolution: keep all six**, `integration`'s four first
(they already landed there) then this review's two, so the section reads as
accumulating. Nothing was dropped and nothing was reworded. 116 `- [ ]` entries
after, against 110 + 2 + 4 before.

## Findings, round 2

**Blockers: none. Should-fix: none. Nits: none worth carrying.**

The one round-1 nit with no fix — `VA.lastTopoRender` is render state a test
can read *instead of* the DOM — is correctly handled as a fence rather than a
change: the lesson now states it explicitly and the overlay carries the general
rule. It exists for two real reasons and removing it would cost more than it
saves.

## Note for the next reviewer

- **The README-pairing test parses prose with regexes** (`crossings went
  \*\*(\d+) → (\d+)\*\*, (\w+) of the\s+five to zero`, and three more). That is
  the right shape — it asserts the match before asserting the number, so a
  re-wrap goes red rather than silently vacuous — but it means **re-wrapping
  those README paragraphs is now a test-touching edit**. Expect it, don't
  "fix" it by loosening the regex.
- **`pitch_system` still does not fit one viewport at comfortable density.**
  Unchanged by round 2, correct by design, and the decision sits in
  `ISSUE_20260914_scaled_length_modes_collapse_on_a_tall_dag.md`. See the
  round-1 section above — that is the one thing to raise with Jeff.
- Mutating the wiring in a scratch tree found both blockers in five minutes and
  confirmed both fixes in two. Two overlay entries now record the habit.
