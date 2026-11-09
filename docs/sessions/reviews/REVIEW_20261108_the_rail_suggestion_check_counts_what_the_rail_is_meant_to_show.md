---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-11-08: the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show

Branch `handoff/the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show`
(`4ef3de18`, `1750c7dc`). It was not contained in `integration` before this
review, so the merge below is the real gate.

## What the work does

- **Diagnosis: the check was wrong, not the rail.** Section 5 of
  `scripts/run_viewer_browser_tests.mjs` waited for "a studyless head" to mean
  the deep link's whole-topology rail had landed. Since `d0863681` the boot's
  first model is v2 (`vpa_end_stop_v2`), which is studyless too, so the wait
  matched the boot's rail and the check counted v2's suggestions. The
  `.catch(() => {})` meant the wrong view never timed out. I checked the
  mechanism against `apps/annotate/app.js` `renderElementList()`: a studyless
  topology's head is `AA.studylessHead(currentTopology.edges.length)`. So
  keying the wait on `studylessHead(<this topology's edge count>)` identifies
  the requested topology's rail, and the head equality is now part of the
  check's condition. That makes the check **stricter**, not looser, as the
  handoff required.
- **The class (deliverable 2):** the runner now ends with a `SKIPPED -- N
  sub-check(s) passed without running` block that names each `(skipped …)`
  sub-check. It is a print only, with no exit-code change. The lesson ranks
  the three gaps by cost and says why the other two were not closed here.
- **The issue** is `status: resolved`, with the verifying command and its
  output.

## Verification (mine)

| step | where | result |
| --- | --- | --- |
| Pre-merge reproduction: `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "annotate rail suggestion"` on `integration` code, with the main checkout's data (`node_modules` junctioned into the review worktree) | review worktree | **RED 18/19**: `topology-level rail: 11 rows read suggested; the projection has 30 edges with 54 open ends` |
| Same command, post-merge | review worktree | **PASS 19/19**: `topology-level rail ("all 99 interfaces — no study scopes them"): 30 rows read suggested; vpa_pitch_linkage has 30 edges with 54 open ends` |
| Same check without `--repo` (no data) | review worktree | 18/18 PASS plus the new `SKIPPED -- 1 sub-check(s)` block naming `[real] the suggestions on the real projection (skipped: …)`. The block works. |
| `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack` | review worktree | **2/2 WITNESSED** (`…f2976b67`, `…f97d359c`), 2m54s, 0 left to the sweep |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | review worktree | 672/672 |
| Full suite, post-merge: `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider` | review worktree | **2 failed, 1866 passed, 1 skipped, 2 deselected**, 548 s (recorded as inside budget). Single process: `venv-win` has no xdist. This suite prints no contention header lines. |

The data has moved since the tactical run. `bindings.json` was rebuilt at
18:43 today, so the counts are now 30 edges and 54 ends where the tactical
run saw 34 and 62. The fix holds on both, because it compares against the
projection, not a constant.

The two pytest failures are the same as in the tactical record, and neither
comes from this diff:
- `test_viewer_js_suite_is_green` fails in a worktree by design. Its tier is
  green against main data (672/672 above).
- `test_mutation_witnesses.py::test_every_anchor_resolves_to_exactly_one_place`
  fails on `…f697d046`. That failure is already on `integration`, filed as
  `ISSUE_20261108_the_pane_seek_witness_anchor_rotted_on_integration_and_reddens_pytest.md`,
  and owned by the active handoff `the_pane_seek_witness_points_at_the_comparison_the_page_now_makes`.

Not run: the full browser tier and `apps/annotate/run_tests.cjs`. The diff
touches only section 5 of one browser suite and the runner's tail. The
`--only` run covers section 5, and the witness run exercised the runner end
to end.

**Test cadence.** The tactical record names a full-suite run with counts
consistent with the diff, so the benefit of the doubt held. The pre-merge
risky subset was the `--only` reproduction above.

## Mandatory checks 1–7 (stack checks)

None apply. The diff adds no stack, element, tolerance, sign, or fold. It
changes test-runner code, an issue and a lesson.

## Findings

No blockers and no should-fix findings.

- **Note (not filed):** on the current data,
  `[real] on the kinematic study every joint end with an open proposal reads suggested, and no other does`
  sees `9, 0 read suggested, 0 distinct ends of 0 edges`: the study has no
  open proposals left. Its "every open end reads suggested" half is vacuous
  until one appears. Its "no other does" half still has teeth. This is a
  property of the data, not of this diff.

## Overlay

I updated `docs/prompts/REVIEW_AGENT.md`:
- New entry: *a browser wait that recognises "the view I asked for" by a
  property the boot's default view can also have.* This is this handoff's
  failure class.
- A fourth sighting on *a skipped `[real]` line is not a pass*: a review
  record should now quote the runner's new `SKIPPED` block, or its absence.
  This is the review-side half of deliverable 2, which the lesson left as
  out of scope for the tactical agent.

## Verdict

APPROVE.
