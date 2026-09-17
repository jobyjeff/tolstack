---
type: review
handoff: docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md
reviewer: agent
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-16 — topology_grid_scroll_and_grips

Four commits on `handoff/topology_grid_scroll_and_grips` (`ae8cbe0`, `08130fc`,
`c8f505d`, `c426fa0`), merged into `review/topology_grid_scroll_and_grips` with
no conflict — `integration` had moved `1b3848b` → `dc12c68`
(`js_guards_and_suite_isolation`) underneath the branch, and the two diffs do
not overlap.

Three defects of one box stack, landed together as the handoff asked: the grips
clamped into the pane's visible window, the reader's `scrollLeft` carried across
a rebuild (and onto the ghost), and `.tv__body`/`.tv__head` given
`width: max-content` so the sticky rails' containing block is the content's
width.

## What I verified

**Tiers, on the merged tree.**

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs` | 335/335 |
| `…/run_tests.cjs --repo C:/workspace/tolstack` | 417/417 |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 20/20 suites (topology 188/188 ×2, respine 40/40, test.html 321/321 ×2) |
| `venv-win/Scripts/python.exe -m pytest -q` | 1 failed, **1186 passed**, 1 skipped |

The one Python failure is `test_no_live_document_states_an_unguarded_hardware_
entry_count`, and it is pre-existing: `git diff integration HEAD` touches
neither the guard nor `docs/strategy/BRIEF_20260915_origin_posture_and_absent_
feature_rule.md`, and both sides of the comparison are byte-identical to
`integration`, which is already red on it. The lesson's own counts (334 fast,
320 browser, 1175 Python) reproduce exactly once you account for `integration`
having added one fast-tier test and two Python modules since the branch point.

**Six planted mutations, each guard bit and named the right check.** (The
deliverable here *is* partly a set of checks, so green was not accepted on its
own.)

| mutation | what went red |
|---|---|
| `carriedScroll` → always 0 | fast 333/335 (both new scroll tests); browser respine 38/40 (carry-onto-first-frame, settled-clamp) |
| ghost `scrollLeft` restore removed | fast 334/335; browser respine 39/40 (`…the ghost under it shows the SAME horizontal window…`) |
| `.tv__body { width: max-content }` reverted | browser respine 38/40 — and the console printed `dagLeft -103.5` at the far end, reproducing the lesson's pre-fix number exactly |
| `VA.jogGripInset` clamp disabled | topology 186/188 — both jog sub-checks, at 560px and at 1000px |
| `VA.columnGripLeft` clamp disabled | topology 186/188 — both ELEMENT sub-checks |
| `.tvgrip { width: 7px }` → `8px` in CSS | fast 334/335: *"VA.TOPO_GRIP.width must be .tvgrip's own CSS width: 8 !== 7"* |

**Geometry, measured independently.** The committed probe
(`tests/debug_topology_grid_geometry.mjs --repo C:/workspace/tolstack`)
reproduces every number in the lesson on the real `pitch_system` at 1600×1000:
`scrollWidth` 1534 in an 868px pane, max `scrollLeft` 666, `svgLeft` 0.0px at
scroll 0 / 333 / 666, `.tv__body` 1534, `.tv__rows` 1218 with 0 overflow,
header `padding-left` 316, `.tv__ghost` 868×1196, settled respine 612, and all
three toggles carrying 666 → 666.

I also ran a throwaway probe of my own for the one thing no tier measures — the
grips' *placement*, now that the ELEMENT grip's `left` is hand-accumulated from
`COLUMNS` instead of `right: 0` on its own `<th>`. At shipped defaults the
grip's right edge is exactly the `<th>`'s right edge (offset **0.0px**) at
`scrollLeft` 0 / 100 / 300 / 666, and the jog grip's hairline sits exactly on
`svg.tv__rails`'s right edge at all four. The arithmetic agrees with the real
layout; that is now a checklist entry, because nothing in the suite would have
said so.

**Lesson audit** (numbers and causal claims, per the canonical check): the
handoff-vs-lesson baseline discrepancy is correctly diagnosed and re-derived —
`939edca` did widen `chips` 200 → 260, `Σ COLUMNS` is 1218, `316 + 1218 = 1534`,
and both slide figures close (`605 − 553 − 10.5 = 41.5`, `666 − 552 − 10.5 =
103.5`). The `position: sticky; right: 0` negative result, the ghost decision
and the "`#detail` paints over it — it does not, `.tv__hscroll` clips"
correction all hold up. One over-claim corrected inline (below).

**Contract and fences.** `.tv__main` and `.tv__scroll` still declare no
`overflow` of any kind — the full-page-scroll contract survived, as the lesson
states. `sticky-rails-hold-a-scrolled-dag`'s `find` still matches
`apps/viewer/topology.css` byte-for-byte, and I checked all 37 witnesses'
`expect_red` strings: none names a check this diff renamed. The diff is three
hunks in `run_viewer_browser_tests.mjs` and touches none of the forbidden
regions (`SUITES` loop, `testNavNeverWedges`, `testAnnotateHostedPosture`,
`mutation_witnesses.json`, the crop/value-guard modules, `docs/strategy/`,
`apps/annotate/`). Removing `.tvheadtable th { position: relative }` is safe:
the grip was the only absolutely-positioned child of a `<th>`, and
`.tvcell--resizable { padding-right: 10px }` still keeps the label clear.

**Evidence.** Six PNGs, named exactly as the handoff asked, each with viewport /
projection / pane width / `scrollLeft` in the lesson. Spot-checked pair 3: the
"before" shot shows the DAG's leftmost rails clipped off the pane's left edge,
the "after" shows the whole DAG pinned with the grid scrolled under it.

## Findings

**should-fix (filed, not fixed)**

1. *The four grip-reachability sub-checks inherit their stage.* They bite today
   (measured above), but the jog arm only reaches the clamp because a block
   ~130 lines above it drags the jog zone open and never restores it; with the
   zone at its natural width the unclamped grip is inside the window and the
   check would pass on the unfixed build. This repo's overlay already records
   the fix shape (*a guard that asserts its own stage* — a non-vacuity witness
   pushed before the contract).
   `docs/issues/ISSUE_20260916_the_grip_reachability_checks_inherit_their_stage_from_an_earlier_block.md`,
   which also carries item 2.

2. *One rewritten claim does not name the handoff*, against the definition of
   done's "each rewritten check names this handoff": `[real] and it settles
   where the reader was, clamped by the browser…` (and the fourth claim the
   session rewrote unprompted). Two of the three do. Folded into the issue
   above rather than filed twice — same block, same edit.

3. *A fourth filing of one red.* `ISSUE_20260916_a_strategy_briefs_prose_trips_
   the_hardware_entry_count_guard.md` is the fourth issue describing the same
   `other (N) do not` false positive; **two of its siblings were already in this
   branch's own merge-base tree.** The diagnosis in the new one is the best of
   the four, so I left it and added a cross-reference naming the other three:
   **triage should close them as one.** (Overlay entry "Seven issues, one red"
   updated with this second noun.)

**nits**

4. The lesson said the jog block "restores the pane width and the column width
   afterwards and asserts that it did" — the assertion covers the pane width
   only. Correction blockquote added to the lesson (inline fix).

5. The new browser block landed at ~line 2347, outside both line ranges the
   handoff fenced (`~2040–2075` and `~3960–4090`) — though the handoff's own
   line numbers were already stale, and `~2040–2075` points at the real-
   projection section the block was added to, not at the jog-zone drag block
   (which is at ~1942). No collision, nothing to change; noted because the
   lesson's scope section reports the README and the probe as out-of-fence and
   not this.

## What I changed on the review branch

* the lesson: one correction blockquote (finding 4, plus pointers to the issue);
* `docs/issues/ISSUE_20260916_a_strategy_briefs_prose_trips_the_hardware_entry_
  count_guard.md`: a cross-reference block naming its three siblings;
* the three 2026-09-15 issues this branch fixes: `status: triaged` →
  `status: resolved` (the merge-gate disposition the overlay asks for);
* `docs/prompts/REVIEW_AGENT.md`: three entries — hand-accumulated control
  positions, fast-tier `scrollLeft` tests being vacuous in the browser half of
  the same file, and the duplicate-filing count.

Nothing in `apps/viewer/**` or `scripts/**` was touched by me.

## For the next reviewer

`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` was
re-run in full on the merged tree from this review worktree: **37/37 declared
mutations witnessed**, so the author's claim reproduces after the merge as well.
(A review worktree has no `node_modules` — junction it to the main checkout
first, and remove the junction with `(Get-Item …).Delete()`, never
`Remove-Item -Recurse`, which would take the real one with it. The runner's
shadow tree is `tmp/mutation-witness` inside the worktree; delete it afterwards.)
