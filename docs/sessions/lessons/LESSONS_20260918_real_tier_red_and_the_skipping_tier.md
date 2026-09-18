# LESSONS 2026-09-18 — real_tier_red_and_the_skipping_tier

Two `[real]` viewer assertions red on trunk after the batch merge, and the
merge's own candidate test structurally unable to see them.

## 1. The verdict: the DATA moved, and the evidence that settles it

Three independent readings, cheapest first:

1. **`git diff 861f6e6 2dd457f -- apps/viewer/` is empty.** The batch merge
   touched `PROVENANCE.md`, `docs/issues/`, `docs/prompts/REVIEW_AGENT.md`,
   `docs/sessions/`, and three Python test files. No viewer code at all, so no
   merged code could have changed what the page renders.
2. **The discriminator the issue named, run.** `git archive 861f6e6 apps/viewer`
   into a scratch dir, then
   `node <scratch>/apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` —
   pre-merge source, current projections — reproduces **451/453 with the same
   two failures**. (The runner reads its own source from `__dirname` and only
   the data through `--repo`, which is what makes this a one-command experiment
   and not a checkout dance. Worth remembering: you can run any historical
   version of the viewer's suite against today's data without moving a single
   ref.)
3. **Each failure traces to a dated authored-data commit**, both of them
   ancestors of the merge:
   - `5ce16f3` (2026-09-16) gave the NAS1149V0332H washer a real band, so
     `rotor_fastener_length`'s `zero_width_count` is **1**, not 2.
   - `c08d705` (2026-09-16) added `joint.assembly_export_ref`, so the
     pitch-link joint block acquired a `sha256` key.

Both had been latently red since the shared projection caught up with those
commits. Nobody saw it because the only tier that reads the shared projection
skips everywhere except the main checkout, and the last two batch merges ran in
candidate worktrees.

**The generalisation, which is now two-for-two:** when a `[real]` assertion goes
red right after a projection rebuild, the prior is overwhelmingly that a test
pinned a number the authored data has since moved — not that code regressed.
Check `git diff <pre> <post> -- <the app>` first; it is one command and it ends
the question.

## 2. The `sha256` decision — the guard was right, and under-firing

`sha256` reached the page as a `<dt>` **label**: `views/stack.js`'s `kvList`
renders a free-form block key by key, and `VA.fieldLabel("sha256")` is
`"sha256"`.

What the handoff framed as "a column header, not a leaked value" turned out to
understate it. The same sub-block was *also* printing, as values:

- `C:/workspace/drawing-checker/data/inbox/drawings/...` — an absolute
  workstation path, a banned class,
- a 64-character checksum — which the `\b[0-9a-f]{24,}\b` shape guard exists
  for,
- two bare `20260803_145243`-shaped run ids — which the `\d{8}_\d{6}` shape
  guard exists for.

None of the three fired, because `dd.kv__value` is in
`VERBATIM_PROSE_CLASSES` and that exemption skips **every value** in a free-form
block. So the guard caught the one string it could reach and the three worse
ones rode through an exemption written for authored prose.

**Chosen:** `assembly_export_ref` is a shape the page knows — the same
`{status, pdf, sha256, runs[], note}` a citation's `source_ref.export` carries —
so `jointBlock` lifts it out and renders it through `VA.exportBlockNode`, the
one builder the element pane, the topology edge pane and the citation card all
use. It says *"Read from 217755.pdf"* and *"pinned to this exact file, by
checksum"*, and it deleted the workstation path on 2026-09-15 on Jeff's
instruction. All four leaks go at once, and the joint stops being the one export
on the page rendered by a different code path.

**Rejected, and written into the code comment:**
- *An exemption for the string `sha256`.* It would have cleared the merge and
  left the path, the checksum and the run ids on the page — the exact shape of
  "a text guard matching raw characters where structure is meant". The durable
  move was keying on structure (this key is an export block) rather than on a
  keyword.
- *Renaming the `<dt>`.* Fixes the one string the guard happened to see and none
  of the three it could not.

## 3. What a batch merge can now trust from a candidate-worktree green

**Nothing about the `[real]` or browser tiers — but it can no longer mistake
that for a pass.**

- The runner's total line carries the skip: `369/369 passed, 1 TIER SKIPPED --
  NOT RUN, NOT PASSED`. It said `368/368 passed` before, counting the skip
  marker as a pass.
- `tests/test_viewer_js_suite.py` **fails** on any `SKIP` line, so pytest's own
  summary reads `1 failed, 1203 passed` instead of `1203 passed, 1 skipped`.
  Measured both ways in this session.
- `CLAUDE.md` now states which two tiers cannot run in a fresh worktree and what
  to run in the main checkout before trusting a green.

**The issue's stated cause was wrong, and the correction is in the issue file
now.** It said a fresh worktree has no `node_modules`. `apps/viewer/run_tests.cjs`
uses node built-ins only and needs no install — what is missing is
`data/projections/`, gitignored and main-checkout-only, which is what the
node-fs tier reads. `node_modules/playwright-core` is a genuine worktree-only
dependency, but of the browser TRUTH tier, which pytest never runs. Anyone
reproducing this by running `npm install` in a worktree would have got nowhere.

**What this deliberately does not do** is make the tier *run* in a worktree.
The runner's `--repo` seam would, and the wrapper already computes the main
checkout's path (`git rev-parse --path-format=absolute --git-common-dir`) to put
it in the failure message. Wiring it up means checking a branch's JS against a
projection built from another tree — the standing condition behind both this red
and the 2026-09-16 one — so it is filed as a strategy question
(`ISSUE_20260918_a_worktree_could_run_the_real_tier_against_the_main_checkout_...`)
rather than decided here. The cost of the decision taken is real and should be
named: **every worktree's `pytest -q` is now red on this one test**, by design.

## 4. Two things that cost time, for the next session

- **The fixture that could not be added.** The natural home for the joint-export
  shape is `apps/viewer/fixtures.js`'s demo joint, which would have given the
  surface-scan walk coverage in every worktree. It is not there, because
  `scripts/run_viewer_browser_tests.mjs` locates `.el-export--established`
  page-wide and Playwright's `textContent()` throws on a multi-match — a second
  established export on the fixture page breaks a tier a worktree cannot run.
  Filed (`ISSUE_20260918_the_browser_tiers_export_locators_are_unscoped_...`)
  with the two-line fix. Check that locator before adding anything
  export-shaped to the demo fixture.
- **You cannot clone this repo into the scratchpad.** The session's scratchpad
  path is ~120 characters deep, and `docs/issues/` filenames are long enough
  that `git clone` fails MAX_PATH on dozens of files even with
  `core.longpaths=true` for some operations. Worse, the main-checkout edit guard
  classifies any clone as "a main checkout" and blocks writes *and deletes*
  inside it — so a clone made at a short path (`C:\tmp\ts`) could not be removed
  afterwards. **One such directory is left behind at `C:\tmp\ts` and needs an
  operator to delete it.** Don't clone; the two techniques that actually worked
  are `git archive <sha> <subtree> | tar -x` for old source, and copying
  `data/projections/viewer/` (35 MB) into the worktree's own gitignored `data/`
  to reproduce main-checkout conditions. The second is how
  `1204 passed` / `455/455` were measured without moving the main checkout's
  HEAD off `master`. Delete the copy afterwards — and check
  `Get-Item -Force | Attributes -band ReparsePoint` first if you ever use a
  junction instead, because a recursive delete that follows one would take the
  shared `data/` with it.

## Numbers, for the record

| where | JS runner | pytest |
| --- | --- | --- |
| main checkout, trunk `2dd457f` (before) | `451/453 passed` | `1 failed, 1203 passed` |
| this branch, projections present | `455/455 passed` | `1204 passed` |
| this branch, fresh worktree | `369/369 passed, 1 TIER SKIPPED -- NOT RUN, NOT PASSED` | `1 failed, 1203 passed` |

The last row is the deliverable, not a defect: 86 checks did not run, and the
suite says so in the line a reader actually reads.
