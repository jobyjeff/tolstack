---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-18 — real_tier_red_and_the_skipping_tier: clear trunk's two `[real]` failures, and stop a skipped tier from passing a merge

Source: the 2026-09-18 triage batch merge. tolstack merged green and was found
red in the main checkout minutes later —
`docs/issues/ISSUE_20260918_real_tier_red_on_trunk_after_the_batch_merge_and_projection_rebuild.md`
has the full measurement. Baseline: trunk at `2dd457f`, `integration` level with
it, projections rebuilt at `2dd457fc904e` (`behind_trunk=0`, exit 0). Scope:
`apps/viewer/` (the two failing `[real]` assertions and the runner's skip
reporting) and `tests/test_viewer_js_suite.py`; do NOT re-run or modify
`scripts/rebuild_projections.ps1`, and do NOT edit the shared projections in
`data/projections/` to make an assertion pass.

## The two failures

In the **main checkout** (`C:\workspace\tolstack`), `node
apps/viewer/run_tests.cjs` reports **451/453**:

```
FAIL  [real] the zero-width flag reaches the page
      not equal: 1 !== 2

FAIL  [real] no rendered stack surface of any live stack prints an internal id,
      a field name, a checksum or a workstation path
      pitch_link_to_pitch_plate stack page renders "sha256"
```

Verified not caused by the working-tree docs edit that found them: stashing it
reproduces `451/453` exactly.

## Deliverables

1. **Decide first whether the code moved or the data moved — do not start
   fixing.** Both assertions read the live projections, which the batch merge
   rebuilt in the same window, so the failure has two very different causes and
   the fixes are opposites. The discriminator named in the issue: check out the
   pre-merge trunk (`861f6e6`) against the **current** projections and re-run the
   JS suite. Same two failures ⇒ the *data* moved and the assertions need
   updating; different ⇒ the *merged code* regressed the rendered page. State
   which, with the evidence, before deliverable 2.

2. **Fix accordingly, and do not soften an assertion to clear a merge.** For the
   `sha256` case specifically: the string appears as a **column header** in the
   `pitch_link_to_pitch_plate` page's export block, not as a leaked value — so
   if the guard is right that a reader should never meet it, the page's heading
   is what changes; if the guard is over-broad because a column header is not an
   internal id, then the guard gains a precise exemption and says why in a
   comment. Decide which, write the rejected alternative into the code comment,
   and note that "a text guard matching raw characters where structure is meant"
   is a named recurring class in this workspace — an exemption keyed on position
   or structure is the durable shape, a keyword allowlist is not.

3. **Close the blind spot that let this merge pass.** This is the deliverable
   that outlives the two failures. The `[real]`/JS tier **silently skipped** in
   the batch-merge candidate worktree because `node_modules` is gitignored and a
   fresh worktree has none, so the merge was green on a suite that could not
   contain this failure. `tests/test_viewer_js_suite.py` should **fail, or at
   minimum report loudly and non-skippably**, when the JS tier cannot run — a
   tier that cannot run is not a tier that passed. Make the distinction visible
   in the pytest summary line itself, not one line above the total: this repo's
   overlay already records that a `| tail -4` read misses a lone `SKIP` line.

4. **Say what the candidate test can and cannot see.** Write into the repo's
   `CLAUDE.md` (or the overlay, whichever the repo's convention puts it in) the
   one-line fact a future batch merge needs: which tiers do not run in a fresh
   worktree, and what a merger must therefore run in the main checkout before
   trusting a green. Keep it to the fact; do not re-specify the batch-merge
   procedure, which lives in dispatch.

## Scope fences

- Do **not** edit `data/projections/` to make an assertion pass. If the data is
  wrong, that is a separate finding and gets its own issue.
- Do **not** re-run `scripts/rebuild_projections.ps1`; triage ran it and its
  provenance stamps are recorded.
- Do **not** perform a batch merge or move `master`/`integration`.

## Definition of done

- `node apps/viewer/run_tests.cjs` reports **453/453**, and
  `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` is green in
  the **main checkout**, with both summary lines quoted.
- Deliverable 1's code-vs-data verdict is stated with the evidence that decided
  it.
- A fresh worktree with no `node_modules` now produces a **visible, non-green**
  signal from `tests/test_viewer_js_suite.py` rather than a skip — demonstrate
  it, since that is the condition that let this reach trunk.
- Lesson (`docs/sessions/lessons/LESSONS_20260918_real_tier_red_and_the_skipping_tier.md`):
  the code-vs-data verdict and how it was reached; what the `sha256` exemption
  decision was and what was rejected; and what a batch merge can now trust from a
  candidate-worktree green.
