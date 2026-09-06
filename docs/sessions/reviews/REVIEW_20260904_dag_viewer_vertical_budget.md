---
type: review
handoff: dag_viewer_vertical_budget
reviewer: agent
date: 2026-09-04
verdict: APPROVE
blockers: 0
---

# Review — dag_viewer_vertical_budget

Handoff: `docs/sessions/active/HANDOFF_20260904_dag_viewer_vertical_budget.md`.
Not a tolerance stack — the stack-provenance mandatory checks (1–7) do not
apply. This is a viewer CSS/JS layout change, so the relevant checklist is the
overlay's "Recurring bugs"/"Architectural errors" entries plus the universal
checks.

## What I verified

- Read the handoff and the tactical lesson
  (`docs/sessions/lessons/LESSONS_20260904_dag_viewer_vertical_budget.md`)
  before merging, then fast-forward merged `handoff/dag_viewer_vertical_budget`
  (`d6788af`) into this review branch — no conflict, single commit.
- **Full diff read**, all six touched files (`topology.css`, `topology.js`,
  `topology_app.js`, `views/topology.js`, `tests.js`,
  `scripts/run_viewer_browser_tests.mjs`) plus the `README.md` addition.
  `git diff -w --stat` matches the plain diff exactly on every file (no
  disproportionate reformat), and `file` reports all six as text, not binary —
  ruling out the repo's known NUL-byte-in-a-diff footgun.
- **The "one number, three places" claim, traced by hand, not taken on
  faith.** `VA.RAIL_METRICS.rowHeight` is mutated in place by
  `VA.applyRowDensity`; `views/topology.js` binds `var M = VA.RAIL_METRICS`
  once at load and reads `M.rowHeight` on every render, so the mutation
  reaches both the inline row `style.height` and — via `VA.railGeometry(layout,
  M)`, called fresh inside `render()`, never cached — the SVG's `viewBox`,
  rail `y`s and mark positions. `topology_app.js`'s `applyDensity()` is the
  only DOM write (the `--tv-row` CSS custom property), called once at `boot()`
  and again on toggle. Confirmed `selectTopology()` does not touch
  `state.rowDensity` (matches the README's "switching topologies never resets
  it" claim).
- **`.tv .detail { position: static; max-height: none; }` actually overrides
  the shared rule**, not just wins a hypothetical specificity argument: the
  shared `.detail` (style.css:365) is `(0,1,0)`; `.tv .detail` is `(0,2,0)`;
  and `#detail` in `topology.html` is a direct child of `<main class="tv">`,
  so the selector matches the real DOM, independent of stylesheet load order
  (`style.css` loads before `topology.css` anyway).
- **The universal "observed failing" check, done myself, not trusted from the
  lesson.** Temporarily reverted only `apps/viewer/topology.css`'s
  `.tv__scroll { min-height: calc(var(--tv-row) * 10); }` back to `min-height:
  0` and re-ran `node scripts/run_viewer_browser_tests.mjs --repo
  C:/workspace/tolstack`: **3/5 sub-checks, failing exactly the two floor
  checks** the lesson names. Restored the line, re-ran: back to 7/7. This is
  an independent replay of the lesson's own red/green demonstration, not a
  re-read of it.
- **Tests, re-run myself, in this worktree against the main checkout's data:**
  - `venv-win/Scripts/python.exe -m pytest -q` → **576 passed, 1 skipped**
    (matches the lesson).
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **184/184**,
    `[real]` tier ran (not skipped) — confirmed by the presence of `[real]`
    lines in the output, per this repo's own recurring-bug entry about the
    tier silently skipping.
  - `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
    **7/7**, including the new `testHeightBudget` suite (`npm install` was
    needed in this worktree first — `node_modules/` does not carry over from
    the main checkout, per the lesson's own gotcha #4, which I hit and
    confirmed).
- **Quantitatively checked the DoD's "compact mode shows most of the 43 rows
  at once" against the lesson's own reported number (12 visible rows), which
  is only 28% of 43 and looked like it might not satisfy "most."** Wrote a
  throwaway measurement script (not committed — deleted after use) against the
  real `pitch_system` projection: at the reference 700px viewport with the
  provenance alarm showing (which is the *ordinary* state on this checkout's
  committed data, not just the browser test's forced worst case), compact
  gives 12/43 rows (28%) and comfortable gives 10/43 (the floor, exactly).
  With the alarm artificially suppressed at 700px: 21/43 (49%). At a more
  realistic browser height — 900px: 24/43 (56%); 1000px: 31/43 (72%). So "most
  of the 43 rows" is true at ordinary window heights and false at the
  artificially short 700px used to reproduce the reported bug and drive the
  new floor test — which is the right reading (the floor test's job is the
  10-row minimum under the worst case; "most of the DAG" is the density
  toggle's payoff at a normal window size), but it's a distinction the lesson
  doesn't spell out, and a reader could otherwise take "12 visible rows...
  5/5 passed" as evidence the DoD's "most" clause was satisfied at 700px,
  which it isn't. Not a defect — no code or doc change needed — but worth
  recording here since it took an actual measurement to resolve rather than
  being decidable by inspection.
- Confirmed no new file was added under `scripts/` or elsewhere that would need
  an `ARCHITECTURE.md` inventory row, and no new document-derived vocabulary
  was introduced (`VA.ROW_DENSITIES` is a UI-only display preference with no
  JSON-schema counterpart, so it is correctly outside the JS/Python vocabulary
  pairing tests — checked `tests/test_topology_projection.py` and
  `tests/test_js_python_vocabulary.py` for any expectation of it; there is
  none).
- Confirmed scope was held: `style.css`'s shared `.detail` rule was not
  edited (only overridden, as instructed), and
  `scripts/build_topology_projection.py` was not touched.
- `data/` in the main checkout: no changes (`git -C C:\workspace\tolstack
  status --short` clean before and after).

## Findings

None. No blockers, no should-fix, no nits worth recording beyond the
verification note above (which is not a defect).

## Overall verdict: APPROVE

Merged (fast-forward, already done above) and will push `integration`.
