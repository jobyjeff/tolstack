---
type: bug
priority: med
status: open
area: tests/mutation-witness
reporter: agent
class: decayed_witness
found_by: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
---

# A full witness run on integration left 36 of 332 mutations unwitnessed

`node scripts/run_mutation_witness_tests.mjs --repo <scratch root> --full`
was run on the review merge `9735513`, which is `integration` @ `ca27a9b` plus
`pitch_system_folds_into_the_pitch_linkage_model`, now landed as `1bf13f8`.
Every projection was built from that tree. The run took 76 min and exited 1:
**296/332 declared mutations witnessed**. Nothing was ANCHOR ROTTED and
nothing was UNENROLLED.

None of the 36 is a spec that branch added or changed; its own five are all
witnessed. They fall into three groups.

| count | suite | why | already tracked |
| --- | --- | --- | --- |
| 21 | `annotate rail and scene` | the clean run is RED (its two gap-badge checks), so no mutation in the suite can be proved | `ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md` |
| 14 | `3D pane follows the selection` | the suite finds no gap row, skips its whole `[real]` block and reports PASS, so it cannot see any mutation | same issue, round-2 addendum |
| 1 | `tests/test_browser_runner.py` | see below | not tracked anywhere else |

The first two groups share one root cause, and that issue owns it. Once its
fix lands, re-run those 35 `--only`; until then they are this issue's to
re-verify. The third has a different cause:
`python__test-a-runner-that-ends-leaves-no-chrome__b36c164d#1` drops the
`process.on("exit", …)` handler in `scripts/browser_runner.mjs`, and
`test_a_runner_that_ends_leaves_no_chrome` stayed GREEN. Its spec's own note
says Chrome dies 50–365 ms later on its own and Playwright's exit hook
taskkills it. So whether the guard sees the missing handler depends on that
timing. A guard whose verdict depends on timing is unreliable; this needs a
look at whether the witness can tell "named on a BROWSER LEFT RUNNING line"
apart from "gone on its own". `#2` of the same spec was WITNESSED.

The run's own lines, quoted:

```
296/332 declared mutations witnessed
NOT WITNESSED — an enrolled guard that no longer reddens:
  browser__real-a-bound-feature-row-says-which-face-of-which-part-d__16da7bbc — the tier was red before the mutation, so nothing was proved
  browser__real-a-hover-leaves-the-selection-where-it-was__cc2c64b3 — the tier was red before the mutation, so nothing was proved
  browser__real-a-reload-reopens-the-pane-the-reader-left-open-at-t__09a1cf0a#1 — the witness cannot see the difference
  browser__real-a-reload-reopens-the-pane-the-reader-left-open-at-t__09a1cf0a#2 — the witness cannot see the difference
  browser__real-and-a-joint-with-a-bound-feature-lights-its-bound-f__78013da8 — the tier was red before the mutation, so nothing was proved
  browser__real-and-it-stays-hidden-as-the-sweep-moves__d2ca085c — the tier was red before the mutation, so nothing was proved
  browser__real-and-on-blade-it-is-blade-1-s-pitch-arm-one-of-the-f__79362eb5 — the tier was red before the mutation, so nothing was proved
  browser__real-and-the-head-line-follows-it-into-bind-mode-named-b__0260157c — the witness cannot see the difference
  browser__real-and-the-pane-s-rail-lists-the-kinematic-study-s-con__5aa0c4a8 — the witness cannot see the difference
  browser__real-each-type-chip-hides-its-row-kind-and-only-that-the__bf5fbb6d — the tier was red before the mutation, so nothing was proved
  browser__real-every-contributor-row-carries-the-pick-control-a-fe__17ebb547 — the tier was red before the mutation, so nothing was proved
  browser__real-hovering-a-bound-feature-lights-both-of-its-faces__79d1b954 — the tier was red before the mutation, so nothing was proved
  browser__real-hovering-each-contributor-lights-its-bound-faces-or__1786b133 — the tier was red before the mutation, so nothing was proved
  browser__real-hovering-each-joint-draws-its-bead-larger__95852b36 — the tier was red before the mutation, so nothing was proved
  browser__real-hovering-the-base-body-lights-every-one-of-its-draw__3f082ba1 — the tier was red before the mutation, so nothing was proved
  browser__real-hovering-the-blade-body-lights-every-one-of-its-dra__62417338 — the tier was red before the mutation, so nothing was proved
  browser__real-hovering-the-pitch-plate-body-lights-every-one-of-i__1675dcd5 — the tier was red before the mutation, so nothing was proved
  browser__real-leaving-sweep-mode-puts-back-every-occurrence-a-bod__3d012dc4 — the tier was red before the mutation, so nothing was proved
  browser__real-nothing-above-produced-an-uncaught-error__62500dca — the witness cannot see the difference
  browser__real-picking-blade-1-s-pitch-arm-in-the-scene-away-from__04202c1e — the tier was red before the mutation, so nothing was proved
  browser__real-resting-on-a-bound-contributor-row-tints-its-face-i__9ec4e551 — the witness cannot see the difference
  browser__real-resting-on-a-gap-row-tints-nothing-and-the-annotato__eb803e37 — the witness cannot see the difference
  browser__real-selecting-a-chain-study-in-the-nav-leaves-sweep-mod__9a4a093f#1 — the witness cannot see the difference
  browser__real-selecting-a-chain-study-in-the-nav-leaves-sweep-mod__9a4a093f#2 — the witness cannot see the difference
  browser__real-served-beside-the-annotator-the-head-shows-the-3d-c__ba5bd8e7 — the witness cannot see the difference
  browser__real-the-annotator-is-in-sweep-mode-on-the-study-s-run-a__e1c112f4 — the witness cannot see the difference
  browser__real-the-attach-radius-s-gap-badge-opens-a-popup-naming__161743eb — the tier was red before the mutation, so nothing was proved
  browser__real-the-head-control-opens-the-pane-booted-on-the-study__d0d7dacd — the witness cannot see the difference
  browser__real-the-nav-stays-beside-the-open-pane-it-is-what-drive__25decf2b — the witness cannot see the difference
  browser__real-the-pane-s-head-line-is-the-annotator-s-own-answer__6d75b728 — the witness cannot see the difference
  browser__real-the-pointer-leaving-a-row-takes-the-hover-down__8f9e71d5 — the tier was red before the mutation, so nothing was proved
  browser__real-the-pointer-resting-on-blade-1-s-pitch-arm-emphasis__f1a6c244 — the tier was red before the mutation, so nothing was proved
  browser__real-the-tangential-link-s-gap-badge-opens-a-popup-namin__a5a33df5 — the tier was red before the mutation, so nothing was proved
  browser__real-ticking-it-again-brings-both-back__b9002ad5 — the tier was red before the mutation, so nothing was proved
  browser__real-unticking-blade-hides-blade-1-and-its-pitch-arm-the__2d296708 — the tier was red before the mutation, so nothing was proved
  python__test-a-runner-that-ends-leaves-no-chrome__b36c164d#1 — the witness cannot see the difference
```

## Addendum 2026-10-26 (review of the_kinematic_page_keeps_the_dag_and_says_each_contributor_once)

`browser__real-a-reload-reopens-the-pane-the-reader-left-open-at-t__09a1cf0a`:
on that branch's merged tree (`--changed-since integration`, projections built
from the merge) **#1 is now witnessed** and **#2 is still NOT WITNESSED** ("the
witness cannot see the difference"). The suite ran for real again because that
branch stopped it skipping itself on a missing gap row. #2's mutation clamps
the stored width at boot against `roomBesideFlyout()`. Now that the kinematic
page has its preview pane back, its room at 1600 wide is the same as the boot
layout's, so clamping at boot and fitting per page give the same width. The
check needs a page whose room differs from the boot layout's (for example,
reload onto a page with no preview pane, or with a narrower window) before it
can tell the two apart again.
