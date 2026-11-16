---
type: review
handoff: docs/sessions/active/HANDOFF_20261115_the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page.md
reviewer: agent
date: 2026-11-16
verdict: APPROVE
blockers: 0
---

# Review — the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page

Work: one commit, `c83884ff`, on `handoff/…` cut from `integration`
`61f78e19`. Not previously merged (containment checked). Landed as a
fast-forward. The diff is docs-only and every path is `A`: the review page,
the lesson, two issues and 31 shots. No code, no edits to existing records.
The mandatory stack checks (1–7) do not apply: no stack, topology or parse
event is touched.

## What I verified

- **Counts.** Re-derived from the tables: J 9 rows (6/3/0), the 11-12 open
  rows 16 (2/11/3; "1/28" is one row, which is how the handoff's 17 row
  numbers fit), map M1–M12 (11/1/0), region sizes R1–R6 (3/2/1). **43 rows:
  22 / 17 / 4**, as the page and the commit subject state.
- **Coverage against the handoff.** Every asking sentence of Jeff's note has
  a row; the two non-asking ones are listed and not counted, as stated. All
  sixteen 11-12 open rows are present. The map rows cover both reference
  tables of `the_map_draws_the_end_stop_model` (districts, outlines, pins,
  jumpers, the six joint symbols, bundles, routing) and all three window
  sizes in both views. The page opens with the three lines the handoff asks
  for, and both required questions are among "only you can decide".
- **Every cited shot exists** (25 distinct names, all in the shots folder).
  Main shots are 3840×2160 or 5120×2160; the 1920×1080 ones are the region
  rows that need that window, and the rest are crops. I read four against
  their rows: `13` (J4/S3 — "suggested · high … Take", no face number shown),
  `06` (W — region gone, grid cut at "Expand"), `01b` (S1 — jumpers through
  "gas-spring piston body" and both head names), and the 1920 reload. Each
  matches its claim.
- **The real log.** 83 events now, as the lesson says before and after. J1's
  claim re-reads from the files: seq 80 retracts the hub's
  `hub_blade1_root_bearing_bore`, 81 binds the blade's 4033/4034, 82 binds
  the hub's 2356/2358; seq 83 is the hub fastener clocking on 744/743, the
  "one hole" the page cites.
- **Lesson arithmetic.** `master` is `a921f92b` and `master..61f78e19` is 67
  commits, as stated. Cited 11-14 and 11-16 issues all exist on
  `integration`.
- **Issues.** Both carry valid frontmatter (`bug`, `med`/`low`, `open`,
  `found_by:` the handoff, no `handoff:`). Not duplicates: S-rows already
  filed in the 11-14 issue are cited, not re-filed.

## Tests

The lesson's test record was a placeholder — no run recorded — so the
benefit of the doubt was void and I ran the tiers myself (docs-only diff:
default tier plus the two fast tiers, per `CLAUDE.md`'s table). The merged
code is byte-identical to `integration` `61f78e19`, so one post-merge run
covers both sides.

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`, review
  worktree: **1 failed, 2027 passed, 1 skipped, 4 deselected in 446 s** —
  the one red is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
  the documented worktree red (no `data/projections/`). Recorded on the
  ledger: inside budget. This repo's conftest prints no contention header
  lines.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 592/593,
  tier skipped — the main checkout's projection is built from `master`.
  Re-run against the walk's own scratch root (`data/scratch/walk1116`, built
  from `61f78e19`): 710/715, the five `worksheet must be readable` reds of a
  root without `docs/` (the overlay's documented trap); with a copy of
  `docs/` added and removed afterwards: **715/715**.
- `node apps/annotate/run_tests.cjs`: **323/323**, no SKIP lines.
- Doc scans after my overlay edit (`test_tolerance_stack`, `test_provenance`,
  `test_thermal_exception_list`, `test_claims_registry`): 222 passed.
- Not run: the browser tier and the witness gate — the diff touches nothing
  outside `docs/`.
- `data/`: the suite wrote nothing to the main checkout's inbox; the real
  log is still 83 events.

## Findings

**Should-fix (fixed inline; withdrawn in the re-run below):** the lesson's `## Test record` ended at
"(filled in below after the run)" with nothing below — the DoD's lesson is
otherwise complete. Fixed with a dated correction blockquote carrying this
review's runs; the author's placeholder is left in place. Second sighting
of this shape (the previous handoff's `RECORD_PENDING`), so it is now an
overlay entry.

**Nits (no action):**
- R3 measures Side by side at 5120 after a resize from 3840 (2481 px), not
  on a fresh load (the reference is 1841 px). The row says so, and the
  lesson tells the next walk to reload per size.

No design findings beyond what the walk itself filed.

## Inline changes made by this review

- `docs/sessions/lessons/LESSONS_20261115_…md`: correction blockquote under
  the test record.
- `docs/prompts/REVIEW_AGENT.md`: one Recurring-bugs entry, "A lesson's test
  record handed back as a placeholder".

Verdict: **APPROVE**.

## Re-run 2026-11-16 — the author's test record landed after the merge

The close-out guard reported the handoff not merged: the tactical session
committed `889cfc3c` ("walk lesson: test record", 09:37 -0800) on
`handoff/…` after this review had fast-forwarded `integration` to
`c92cbaeb`. It fills in the placeholder this review had called empty. Its
numbers agree with this review's own runs: 1 failed (the worktree-only
`test_viewer_js_suite_is_green`) / 2027 passed / 1 skipped in 454 s against
this review's 448 s, viewer 715/715 on the walk's scratch root, and annotate
323/323.

- **The round-1 "should-fix" is withdrawn.** It was a race, not a defect.
  The merge conflicted on the lesson's `## Test record`. I took the
  handoff's side whole and dropped my correction blockquote, which now says
  something false ("nothing was filled in"). The lesson is byte-identical to
  `889cfc3c`.
- **The overlay entry is reworded** to name what actually happened: re-read
  `HEAD..handoff/<slug>` before landing. It no longer counts this as a second
  sighting of an empty record.
- The commit is docs-only (one file), so the tiers above still cover the
  merged tree.

Verdict unchanged: **APPROVE**, 0 blockers.
