---
type: review
handoff: docs/sessions/active/HANDOFF_20261104_the_browser_tier_reds_left_after_the_slide_re_author.md
reviewer: agent
date: 2026-11-04
verdict: APPROVE
blockers: 0
---

# Review: the_browser_tier_reds_left_after_the_slide_re_author

**Verdict: APPROVE.** There are no blockers. I made two comment-only fixes
inline and filed one should-fix as an issue.

## What the work is

This branch changes no app code. It diagnoses four browser-tier reds as
check defects and fixes them in `scripts/run_viewer_browser_tests.mjs`:

1. The topology leader and band literals (61/62) were stale. They now compare
   what is drawn against `VA.gridPlan`'s own count.
2. A row `click()` scrolled the row sideways under the sticky rails. Those
   calls now go through `clearPoint` on a cell, and `clearPoint` puts the
   sideways scroll back.
3. and 4. The checks read `openedBySweep`, which `4c0b7c62`'s `isolate parts`
   scope leaves empty. They now read `sweep.anchored`.

It also fixes a hoisting bug in the node-tier no-loader test, re-pins the
guard name digest for one renamed guard, untracks a stray `venv-win` symlink,
and files and annotates issues.

I checked which run I was reviewing. The branch worked the `active/` handoff,
the lesson is new (status `A`), and there was no prior review attempt on this
branch. The handoff branch was cut from the current `integration`
(`f32c94fe`), so the merge was a fast-forward.

## Verified

- **Root causes, re-derived:**
  - The hoisting claim holds. The test sat at line ~3010, and
    `BANNED_IN_RENDERED_TEXT` / `VERBATIM_PROSE_CLASSES` are assigned at
    4743/4784. On the base, `node apps/viewer/run_tests.cjs` shows
    `FAIL an archetype with no loader…`. That is red before the merge and
    green after it.
  - `sweep.anchored` is set before the sweep's open loop, and the open loop
    skips any part already open (`apps/annotate/app.js` ~1649–1667). So the
    claim that `openedBySweep` comes out empty depending on which side wins
    the race matches the code.
  - The fast tier pins 63 leaders and 64 bands on the real projection
    (`apps/viewer/tests.js` 15151/15197, `d3a7afae`). The browser tier
    deriving the count from the plan is therefore not a weakening: the number
    still has one pin, and the DOM is still checked against the plan.
  - The jog-zone check now also asserts `topologyId === "vpa_pitch_linkage"`.
    That is the property the old literal stood in for.
- **Commit attributions in the lesson:** `fd4e733d` introduced the
  clear-point scan, `0fdcfa77` added the `surfaceIsClean` call, and
  `6d23015d`, `682a89b6` and `b4b641db` are the commits named. All match.
  "About 1750 lines" is 1733 lines.
- **The renamed guard had no spec under its old name.** It is still listed
  by `--unenrolled`, so a digest-only re-pin with the count unchanged is
  legitimate. A precedent for this is already in the pin's comment history.
- **Issue dispositions:**
  - Resolved, with verified resolutions: the two issues this branch fixed
    (`…no_loader_test_throws…`, `…three_browser_suites_are_red…`).
  - Still open, with honest addenda: the two flake issues. That is correct:
    two green runs do not clear a flake, and I saw one of them again (below).
  - The two `20261103` issues were already resolved by the dependency, and
    their browser halves were annotated.
  - The new issues have valid frontmatter, carry `found_by:` and not
    `handoff:`, and are not duplicates on `integration` or `master`.

### Tests, all on the merged tree (`b75c063f`, then `b08016ee` with my comment fixes)

To arm the tiers I bridged the inputs into this worktree with
`dispatch bridge-test-inputs`, junctioned `node_modules`, and ran
`scripts/rebuild_projections.ps1 -RepoRoot <review worktree>`. Every
projection stamped `sha12=b75c063fbe92 dirty=False behind_trunk=0`. All tiers
ran with `--repo <review worktree>`.

**Pre-merge risky subset** (diff shape: `apps/viewer/`, browser runner, guard
enumeration):

| Run | Result |
|---|---|
| `pytest -q tests/test_mutation_witnesses.py tests/test_projection_freshness.py tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py` | 76 passed |
| `node apps/viewer/run_tests.cjs --repo <wt>` | 635/635 |
| `node apps/annotate/run_tests.cjs` | 280/280 |

**Browser suites alone (`--only`):**

| Suite | Result |
|---|---|
| real render path | 11/11 |
| crop lightbox | pass |
| 3D pane follows the selection | 32/32 |
| the scene pane reads over HTTP | 9/9 |

**Full browser tier:** `node scripts/run_viewer_browser_tests.mjs --repo <wt>`
was **41/41 in 1409 s**. Within it, topology file:// and http were 205/205
each, respine 44/44, and every suite the handoff names passed. This closes
the one gap in the tactical record: its full run was 39/41, taken before the
no-loader fix was committed.

**Mutation witness:** `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
reached 4/4 entries, 0 left to the sweep.

- In the first pass, 2/4 were witnessed. The other two were "red before the
  mutation": the clean run of `3D pane follows the selection` was 31/32, and
  the red sub-check was `[real] clicking a contributor row in the nav selects
  it in the scene…`.
- That run overlapped my full browser-tier run. Re-run with `--only`, both
  entries were WITNESSED.
- So this was the open nav-gesture flake, not a decay. I added the sighting
  to `ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`.

**Post-merge full suite**, in this review worktree:
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` gave
**1724 passed, 1 skipped, 2 deselected in 529 s**, recorded as inside the
budget. The browser run was also recorded, at 1409 s, inside the merge-tier
budget. tolstack's conftest prints no `concurrent pytest processes` or
`full-suite lock` header lines, so there are none to quote. The main
checkout's `git status --porcelain` was empty afterwards, so the suite left
no pollution there.

**Not exercised:** none of the tolerance-stack mandatory checks (1–7) apply,
because no stack, topology or spec data changed. Data-gated tests ran against
the bridged inputs and a projection built from this tree, so none were
vacuous.

## Findings

### Fixed inline (comments only, all three prongs)

1. **nit:** `scripts/guard_enumeration.mjs`. Every other re-pin of
   `DECLARED_GUARDS.browser` carries a dated comment saying what moved. This
   one changed only the digest, so I added the comment.
2. **nit:** `scripts/run_viewer_browser_tests.mjs`, `clearPoint`'s two
   comments. They still said "61 leaders" and "61 of them cross a 4394px
   page", which is the count this diff stopped pinning (the overlay entry "A
   retired visual channel lives on in the comments around it"). I removed the
   numbers.

### Should-fix, left unfixed, filed

3. **should-fix:** `clearPoint`'s fallback. When no clear point exists, it
   sends a synthetic `dispatchEvent` silently. This diff moved two former
   `locator.click()` sites (real render path, crop lightbox) onto it. The
   change is correct for today's layout. But a future unreachable grid now
   passes those suites without a word, while before the click timed out
   loudly, and that timeout is what surfaced the 59px slit. Filed as
   `docs/issues/ISSUE_20261104_clear_point_falls_back_to_a_synthetic_event_without_saying_so.md`.

### Nit, noted only

4. The new layout issue's title says "no grid row can be clicked". Its own
   body, and `clearPoint`, show that a reader can scroll a cell into the 59px
   window and click it there. The title overstates the problem. The body is
   accurate, and the issue is `audience: strategy`.

## Overlay

I added one entry under **Recurring bugs**: a grid-row `locator.click()` slides
the row under the sticky rails, and a browser-tier layout count duplicates the
fast tier's pin.

## Found on arrival

Nothing. The review worktree was clean. The bridged `venv-win` link shows as
untracked here, as the new
`ISSUE_20261104_the_bridged_venv_win_link_is_not_ignored_and_gets_committed.md`
says it will. I did not stage it.
