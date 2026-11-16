# Lessons — the_annotate_check_runs_every_pass (2026-11-16)

- **`runPass`** (`apps/annotate/run_browser_check.mjs`) wraps every pass; a throw is
  one `FAIL <pass>: <first message line>` and counts in `failed`. The whole
  run now executes: mock 94/99 (was 91/97, aborting in `correctionPass`).
- **What Flip does now.** `AA.planFeatureWrite` binds the *other end's feature*
  with the same faces and writes a `retracted` event on the first binding's own
  feature (`bind.target` on another feature => retract, not `supersedes`). The
  fold puts that binding in `retracted`, not `superseded`, and the bar's
  "Earlier bindings" disclosure lists only `superseded`. So the standing row is
  correct and the history disclosure never appears. The check waited 5 s for a
  disclosure that cannot come; I changed it to wait for the row, and to assert
  the first end is taken back and no history shows. Page unchanged.
- **Doc drift left alone:** `docs/ANNOTATION_SURFACE.md` (~l.933-938) still says Flip
  "writes one event carrying `supersedes`" and that history lists the flipped end.
  A flip's old end is now visible nowhere on the bar; if that is unwanted it is a
  page decision (strategy), not a check fix.
- **Reds the unrun passes revealed:** `proposalPass` accept/reject and
  `reducedMotionTimingPass` are green. With `--real vpa-pitch-p2-20261105-204957`:
  the two placement reds already in ISSUE_20261108, plus a new `realPass`
  TypeError, filed as `ISSUE_20261116_the_annotate_real_pass_throws_a_typeerror_once_the_placement_checks_fail.md`.
  Remaining mock reds are the known five (Display panel, two anchor checks, two `[real]` rail checks).
- Default tier in the worktree: 1 failed (`test_viewer_js_suite_is_green`, the
  by-design no-projection red), 2027 passed, 1 skipped, 8m11s.
