---
type: bug
priority: low
status: closed
resolution: subject retired by the_map_is_the_only_drawing_and_classic_retires (2026-11-17): `VA.dagFitScale` and `fitDagTo` are deleted, and the witness spec `d8652b23` is gone
area: tests/mutation-witness
class: decayed_witness
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_the_wheel_the_column_and_fit_behave.md
defer_until: 2026-11-29
---

# The compact-density Fit witness reddens a different check than the one it declares

`scripts/mutation_witnesses/browser__real-at-compact-density-fit-frames-the-whole-band-in-the__d8652b23.json`
(`var to = VA.dagFitScale(...)` → `var to = 1;`) is `NOT WITNESSED` on this
branch **and on the parent commit's viewer code** (measured 2026-10-29 by
re-running the spec against `apps/viewer` as of `7d5d0436`): the tier goes red,
but on `[real] the study's rows are one band, framed in the model's pane on
arrival, every leader on its moved dot`, which runs earlier in the suite and
aborts it before the declared check runs. Not caused by the wheel/column/Fit
change. Fix shape: re-aim the mutation so the arrival check stays green (or
declare the arrival check as the witnessed one).

## 2026-11-17 triage sweep

`git grep dagFitScale` finds nothing and `ls scripts/mutation_witnesses | grep d8652b23` is empty.

The previous `resolution:` value (replaced) read: triage 2026-10-30: low, deferred by default to a date (class has no program)

found_by: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md
