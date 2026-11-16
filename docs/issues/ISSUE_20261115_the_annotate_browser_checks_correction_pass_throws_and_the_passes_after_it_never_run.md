---
type: bug
priority: med
status: resolved
handoff: docs/sessions/HANDOFF_20261116_the_annotate_check_runs_every_pass.md
area: annotate/browser-check
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261115_a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates.md
resolution: handoff completed 2026-11-16 -- closed automatically by dispatch when handoff `the_annotate_check_runs_every_pass` moved to completed/; not independently verified.
---

# The annotate browser check's correction pass throws, so the passes after it never run

`node apps/annotate/run_browser_check.mjs` (mock pass, no flags) stops partway on
`integration` at `23e5f90f`. In `correctionPass` the check clicks `.an__bound-flip`,
then waits 5 s for `.an__bound-history`. The history never appears, and the wait
throws:

```
--- correcting a binding (mock)
PASS  a bound end is listed with its interface name and face, and offers both corrections
PASS  an element with no earlier binding shows no history
page.waitForFunction: Timeout 5000ms exceeded.
    at correctionPass (apps/annotate/run_browser_check.mjs:949:14)
```

The throw ends `checkEverything`, so these passes **never run**:
`proposalPass` (accept), `proposalPass` (reject), `reducedMotionTimingPass`,
and with `--real`, `realPass`. The run exits 1, which looks the same as the
five known reds:

- `ISSUE_20261113_the_annotate_browser_checks_display_panel_list_predates_the_bound_faces_setting`
- `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration` (two checks)
- `ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model` (two checks)

So a reader sees "red, the known five" and never notices that half the tier did
not execute.

Measured 2026-11-15 by the review of
`a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates`. It ran
once on a `git archive` export of `integration` (`23e5f90f`) and once on that
handoff's merge. Both runs gave 65 PASS, the same five FAILs and the same throw,
so the handoff did not cause it. Likely cause, not verified:
`a_feature_is_bound_once_to_a_set_of_faces` round 1 says "Flip acts only on a
standing binding" and every bind-mode write is now feature-keyed. If so, the
mock's Flip either no longer writes a superseding event, or no longer shows it as
history in that list.

Fix shape: bring the pass up to date with what Flip does now, and keep one pass
from aborting the rest. For example, wrap each pass so its throw becomes a FAIL
line with the pass's name.
