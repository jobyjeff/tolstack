---
type: review
handoff: viewer_hygiene_pass
reviewer: agent (review/viewer_hygiene_pass)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# Review — viewer_hygiene_pass

Work reviewed: `handoff/viewer_hygiene_pass` at `f217c8a` (1 commit,
+341/−57 over 5 files), fast-forward merged into `review/viewer_hygiene_pass`
(base `integration` at `19f51cd`, no conflict — the branch was cut after
`guard_mutation_witness_tier` landed, matching its stated `depends_on`).

The mandatory stack checks (provenance, signs, LMC/MMC, RSS, nominal-in-band,
quantised constraints, traced ratio) **do not apply**: this is browser-test
and viewer-doc hygiene, touching no stack, topology, study, `hardware_entries.json`,
`materials.json`, projection schema, or anything under `data/inbox/specs/`.

Four unrelated deliverables, each traced to its own pre-filed issue (all four
carry `handoff: docs/sessions/HANDOFF_20260915_viewer_hygiene_pass.md` and will
auto-resolve at Complete):

## 1. `dismissCard` deduped

`ISSUE_20260914_three_dead_copies_of_dismisscard_in_the_browser_runner.md`
claimed 4 definitions (the handoff text itself said "confirm the current count
before deleting" against a stale count of 3). Verified: `git show
handoff/viewer_hygiene_pass:scripts/run_viewer_browser_tests.mjs` had 4 before
the diff (`testTheApp`, `testTheTopologyPage`, `testHeightBudget`,
`testRenderCrash`), 1 after — hoisted to module scope next to `hoverRailBar`,
taking `page` as a parameter, comment intact. Grepped the merged tree:
`dismissCard(page)` appears 9 call sites plus 1 definition (the handoff table
said 7; the lesson explains the count moved under `guard_mutation_witness_tier`
— confirmed independently rather than trusted). Ran the full browser tier
after `npm install` in this worktree (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`):
**19/19 suites, `[topology file://]` and `[topology http]` both 167/167** —
the one caller still works, and the three deletions changed no behavior.

## 2. `REBUILD_DONE` paired

New `tests/test_rebuild_terminal_state_pairing.py` (4 tests), grep-based
(no cross-repo import, matching this repo's own convention in
`tests/test_provenance.py`), skips rather than fails when drawing-checker is
absent. Verified independently: `C:\workspace\drawing-checker\webui\
tolstack_rebuild.py:51` is `DONE = "done"`, `apps/viewer/topology_app.js`'s
`var REBUILD_DONE = "done";` matches. Two of the four tests are anti-vacuity
(extractors raise rather than silently comparing `"" == ""` on a missing or
doubled definition) and one is the mutation replay proving the pairing can go
red. All 4 pass. No code change to `topology_app.js` was needed — the value
was already correct — which is a legitimate outcome of the deliverable as
worded ("pair … or stop hand-copying it"), not a scope miss.

## 3. README rail-allocation bullet — re-measured and guarded

Re-derived the live projection myself:
`data/projections/viewer/topologies.json` (main checkout, absolute path) gives
`pitch_link_to_pitch_plate` 3/3, `pitch_system` 10/10, `rotor_fastener_length`
10/10, `tan_link_to_pitch_plate_take2` 2/2, `vpa_output_to_pitch_plate` 2/2 —
matches the rewritten bullet exactly, and matches the pre-filed issue's table.
The new regex in `apps/viewer/tests.js`'s existing doc-pairing test
(`` /(\d+)\s+over\s+(\d+)\s+for\s+`([A-Za-z0-9_]+)`/g ``) checks both
directions (every live topology named in the prose, no prose topology absent
from the live set) in addition to the counts.

**Observed the guard failing myself** (universal check): mutated
`rotor_fastener_length`'s claimed count from 10 to 9 in the working tree,
re-ran `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` →
`359/360`, with the exact failure `` [real] every number apps/viewer/README.md
states about the spine, the fit and the centring is re-derivable from the live
projection`` / `rotor_fastener_length's README rail-allocation count: 9 !== 10`.
Reverted, reran clean (360/360). The guard bites and names the right file.

## 4. Study-loop timeout named

The one `.click()` in the real-study loop is now wrapped in try/catch with an
explicit `{ timeout: 30000 }` (same bound Playwright already defaults to — not
widened or narrowed, as the handoff asked) and rethrows naming the study id.
Not reproduced this session (consistent with the lesson); this is instrumentation
for the next occurrence, not a fix, and the lesson says so plainly.

## Other checks

- **Tests don't pollute production data**: `git status` clean in the worktree
  after every run, including after my own README mutation (reverted with
  `git checkout --`) and the `npm install` (added only `node_modules/`,
  gitignored).
- **Suite counts re-run myself, not trusted from the lesson**: `pytest -q` →
  879 passed / 1 skipped; `node apps/viewer/run_tests.cjs` → 298/298;
  `--repo C:/workspace/tolstack` → 360/360; browser tier → 19/19 suites,
  both topology modes 167/167. All match the lesson's claimed counts exactly.
- **Scope discipline**: confirmed `apps/viewer/tests.js`'s `TOPO_VALUE_GUARDS`
  block is untouched (`git diff` on that region is empty) — that array belongs
  to `HANDOFF_20260914_projection_field_guard_rows`, and the handoff explicitly
  fenced it.
- **No stray count restated by hand without a guard**: the one count this
  handoff's own prose introduces (the five topologies' allocation numbers) is
  the thing it guards, not a new instance of the pattern.
- **CRLF gotcha** (this repo's recurring footgun for Python-mediated edits to
  `apps/viewer/*` files): the lesson reports hitting and self-correcting it
  before commit; the merged diff shows normal, minimal hunks with no mass
  line-ending churn, confirming the correction held.

## Findings

None. No should-fix or nit survives — the four deliverables each match their
issue exactly, both new/extended guards were observed failing on the right
input and naming the right file, and all four tiers are green in this worktree
after the merge.

## Overlay maintenance

Added a new **Recurring bugs** entry (below) generalizing this review's own
verification method — re-deriving a "confirm the current count" instruction
against `git show <branch>:<file>` rather than trusting the handoff's own
count, which is exactly what caught nothing wrong here but is cheap enough to
do every time a handoff hands you a table of numbers to confirm.

## Merge

Fast-forward, `integration` → `f217c8a`. No conflict to resolve. Pushed to
`origin/integration`.
