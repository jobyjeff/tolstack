---
priority: med
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-02 — the_browser_tier_is_green_on_trunk_again: diagnose and fix two browser-tier reds that integration (now trunk) carries

Source: two `med` issues in class `browser_tier_red_on_integration`. Both were found by review sessions
on 2026-10-30, and both reproduced on integration's own tip, not on the branch under review:

- `docs/issues/ISSUE_20261030_the_hosted_annotator_bind_press_no_longer_shows_the_read_only_notice.md`.
  Sub-check `[real] pressing a bind control says, in one line, that binding is not available here`
  fails; `annotate hosted posture` is 14/15. The suspected cause is `c21a06bb` ("a failed write says
  its class in fixed words"), but nobody has confirmed that.
- `docs/issues/ISSUE_20261030_the_real_respine_suite_never_catches_a_frame_in_flight_on_integration.md`.
  `topology file:// respine` is 30/35. The first failure is `no in-flight frame was ever observed`,
  and the other four depend on it. The cause is either a real regression (the study click no longer
  animates the respine, possibly from the 10-29/30 Preview pane or DAG zoom landings) or `catchFrame`
  losing a race against a 260 ms transition.

Routed by the 2026-11-02 triage sweep, which merged integration into master (`03880aca`). So these
reds are now trunk's. They also feed the witness decay below: 30 of the 2026-10-28 sweep's 34
NOT-WITNESSED entries were "the tier was red before the mutation".
`HANDOFF_20261102_decayed_witnesses_are_repaired_or_retired` depends on this one for exactly that
reason.

Baseline: tolstack master `03880aca`. Scope: `apps/annotate/`, `apps/viewer/` (only the code the
diagnosis implicates), `scripts/run_viewer_browser_tests.mjs`, `docs/issues/`. Do NOT touch the
mutation-witness registry (`scripts/mutation_witnesses/`), which the dependent handoff owns.

## Deliverables

1. **Root-cause each red before changing anything, and say which side was wrong.**
   - **Annotator notice.** Either the wording changed deliberately and the check must read the new
     constant (`AnnotateApp.READ_ONLY_WRITE` or its successor), or the read-only path lost its
     notice. Bisect against `c21a06bb` and its parent to tell them apart. If the notice was lost, the
     fix is in the app and the check stays as it is.
   - **Respine.** Decide between a regression and a race. One way to tell: does the respine still
     animate when you run it by hand in the viewer? If it does, the problem is the check. The class
     lever (`timing_assertion_under_load`, `dispatch/class_programs.toml`) is to wait on an event or
     settled state, never on a tight window. Do not widen 260 ms into another tight window. If it is a
     real regression, fix the shell's render path, and leave the check alone.
2. **Never weaken a check to make it pass.** If a check asserted something that is no longer true by
   design, change what it asserts and cite the commit that changed the design.

## Definition of done

- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "annotate hosted posture"`
  passes 15/15, and `--only "topology file:// respine"` passes 35/35. Run each twice: once alone, and
  once inside a full browser-tier run.
- The default tier is green (`venv-win/Scripts/python.exe -m pytest -q`, `node apps/viewer/run_tests.cjs`,
  `node apps/annotate/run_tests.cjs`).
- Run `node scripts/run_mutation_witness_tests.mjs --changed-since master` for the specs you changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261102_the_browser_tier_is_green_on_trunk_again.md`): for each
  red, whether it was a regression or a stale check, the evidence, and the commit that caused it.
