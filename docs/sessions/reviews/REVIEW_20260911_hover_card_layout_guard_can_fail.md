---
type: review
handoff: hover_card_layout_guard_can_fail
reviewer: agent (review/hover_card_layout_guard_can_fail)
date: 2026-09-11
verdict: APPROVE
blockers: 0
---

# Review — hover_card_layout_guard_can_fail

One commit (`6c909c9`) on `handoff/hover_card_layout_guard_can_fail`, merged
into this review branch with `--no-ff` from `integration` (`fbd9993`). No
conflict. Containment checked before merging (`git merge-base --is-ancestor`):
**not** already merged, so the merge-and-watch-it-go-green step was real. The
tactical worktree had nothing uncommitted — nothing committed on the author's
behalf.

Diff: `scripts/run_viewer_browser_tests.mjs` (+59/-9), one lesson, two issues.
**No `apps/viewer/` change**, which the handoff explicitly required — verified
by `git diff --stat`, not by eye.

## The seven mandatory checks

This handoff authors no stack, no element value, no `source_ref`, no topology
document and no spec-parse event — it changes a browser-tier measurement and
writes docs. Checks 1-7 have no subject in this diff, stated per-check so
"not mentioned" is never "skipped": **1. Provenance — N/A** (no citation
created or edited). **2. Signs — N/A** (no term list, no arithmetic).
**3. LMC/MMC — N/A. 4. RSS — N/A. 5. Nominal inside min/max — N/A.
6. Quantised constraints — N/A. 7. Traced ratio — N/A** (no stack set
changed; nothing in the diff quotes a ratio).

## What I verified — the guard observed failing, three ways

The deliverable **is** a check, so green proves nothing on its own. I replayed
the reverted popover myself from the lesson's own recipe (`.croppop` to
`position: absolute` with the `max-height`/`overflow-y` line deleted;
`position()`'s `left` and `top` back on `window.scrollX/Y` offsets) and ran
the tier each time. Every number the lesson reports reproduced exactly:

| state | result |
|---|---|
| shipped, merged tree | **16/16**, topology **118/118** both modes |
| reverted popover, `CARD_LAYOUT_VIEWPORT = 1600x700` | **14/16**, topology **117/118** both modes — `FAIL sub-check: an open card leaves the document's own height untouched` |
| reverted popover **and** `CARD_LAYOUT_VIEWPORT` put back to `1600x1000` | **14/16**, 117/118 both modes — `FAIL sub-check: the open card hangs past the document's own bottom — the one configuration where an in-flow popover would lengthen it` |

The third row is the one that settles the handoff. The old guard's failure was
*silent vacuity*, and a strengthened assertion at a hard-coded viewport can
drift straight back into it; the non-vacuity witness, asserted **before** the
contract it certifies, means the guard cannot be put back on a stage where the
defect is invisible and still pass. That is a stronger result than the handoff
asked for — the DoD wanted "demonstrably red under the replay," and this also
demonstrates red under a replay of the *stage*.

Tree restored with `git checkout --` after each replay; `git status` clean
before I committed anything.

Also checked, beyond the replay:

- **The measurement is scroll-invariant, and it had to be.** `cardLayout()`
  returns document height, the pane's box in **document** coordinates and the
  card's bottom in document coordinates. This is load-bearing, not
  decoration: Playwright's `hover()` scrolls the trigger into view on its own,
  so the old viewport-coordinate `boundingBox()` comparison was comparing two
  scroll positions. Correct call.
- **Comparing `withCard.cardDocBottom` against `beforeCard.docHeight`, not
  `withCard.docHeight`.** Deliberate and necessary — under the in-flow defect
  the document grows to meet the card, so the witness measured against the
  *after* height would be self-cancelling (889 > 889+8 is false) and would fire
  in exactly the case it exists to permit. The `+ 8` slack is the popover's own
  8px gap. Verified by reading, and confirmed by the replay's row 2 (witness
  green, contract red) — which is only possible if this comparison is the way
  round it is.
- **No async re-render races the viewport switch.** `setViewportSize` lands
  between the two `cardLayout()` calls, so a debounced resize handler would
  make the before/after pair incoherent. There is none —
  `grep -rn resize apps/viewer/*.js apps/viewer/views/*.js` finds only a
  prose mention. Relayout is pure CSS and synchronous.
- **The viewport is restored.** `TOPO_VIEWPORT` is put back after `Escape`,
  before the citation-card block, so nothing downstream inherits the short
  stage. Both constants are module-level named values, not inline literals —
  the shape this repo's checklist asks for.
- **Suites, on the merged tree.** Browser tier 16/16 (topology 118/118 both
  modes, run in the review worktree with `--repo C:/workspace/tolstack`);
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` 283/283;
  `venv-win/Scripts/python.exe -m pytest -q` 759 passed, 1 skipped (run from
  the review worktree). No `data/` pollution: `C:\workspace\tolstack`'s
  `git status` after every run shows only the pre-existing untracked
  `tests/debug_topology_real_render.mjs` (2026-09-09, a deliberate
  inspection tool), nothing this session wrote.

## Findings

**Blockers: none.**

### Should-fix: none against this work

The two browser-tier failures I saw on my **first** run — `[served mode] [real]
the connect-folder banner never appears` and `[annotate flyout] the embedded
annotator boots to an honest pre-connect state` — are **not** caused by this
diff (different suite functions, different page objects, no shared state with
`testTheTopologyPage`) and did not reproduce in the two following runs of the
identical tree. The author had already filed the first
(`ISSUE_20260911_served_mode_connect_folder_banner_check_is_flaky.md`,
correctly root-caused off the code). I filed the second as
`ISSUE_20260911_annotate_flyout_banner_check_samples_a_transient.md`:
`apps/annotate/index.html` ships `#banner` empty and `.banner` gives it
`padding: 6px 16px`, so `waitFor({state: "visible"})` is satisfied at first
paint, before any `setBanner()`, and `textContent` can sample `""`. Same
class, different mechanism; both are false negatives, neither is a missed
defect.

### Nit (one, not fixed, not worth an issue)

`scripts/run_viewer_browser_tests.mjs:747` — the explanatory comment restates
`TOPO_VIEWPORT`'s value in prose ("at this suite's 1000px-tall viewport") three
lines from the constant. It is a historical account of the *old* guard's stage
rather than a live claim a test reads, and the load-bearing number
(`CARD_LAYOUT_VIEWPORT`) is guarded by the witness assertion itself, so this
does not meet the repo's hand-restated-constant bar. Recorded so the next
reader knows it was considered.

## Checklist maintenance

Two edits to `docs/prompts/REVIEW_AGENT.md`, committed on this branch:

- **Closed out** the "browser-tier layout measurement taken at a configuration
  where the defect cannot occur" entry (added by the previous review, the one
  that generated this handoff) with the *fix* shape — a named short viewport
  plus a non-vacuity witness asserted before the contract — and the demand that
  a future reviewer of a strengthened geometric guard take the **third**
  measurement, not just the second. Also recorded the tier's own limit, which
  this session established: headless Chrome's scrollbar is an overlay, so the
  pane-box assertion cannot see this defect class at all and document height is
  the only witness that bites. The previous handoff's lesson credited the pane
  box with catching it, which was wrong.
- **New entry:** a browser-tier wait whose predicate is weaker than the
  assertion that follows it, with both 2026-09-11 instances and the
  re-run-before-believing-it rule.

## Note for the next reviewer

The replay in this session's lesson is accurate and re-runnable as written —
I ran it verbatim and got its numbers. If you touch this block, the check that
matters is the third measurement, not the second: a guard that goes red under
the reverted popover but green under a restored 1000px viewport has lost the
property this handoff was written to buy.
