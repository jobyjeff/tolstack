---
type: chore
priority: low
status: deferred
area: tests/mutation-witnesses
reporter: agent
class: decayed_witness
found_by: docs/sessions/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
defer_until: 2026-12-06
resolution: deferred 2026-11-06 (triage) -- low defers by default; decayed_witness has no program; 30 days
---

# The "mount without a launcher" witness stays green under its mutation

`scripts/mutation_witnesses/fast__the-mount-without-a-launcher-or-a-launcher-without-the-m__df8f9095.json`
mutates `apps/viewer/views/topology.js`
`if (state.annotateMount && handlers.onStudy3d) {` to `||`, and the fast tier
stays green: `NOT WITNESSED (the witness cannot see the difference)`.

It is not this branch's: with `apps/viewer` checked out from `integration`
(`git checkout integration -- apps/viewer`) the same
`node scripts/run_mutation_witness_tests.mjs --only "the mount without a launcher, ..."`
gives the same verdict. The `--changed-since integration` run of
`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste` reached it
only because that branch added the View popover a few dozen lines above the
anchor.

Likely cause, not verified: the guard's fixture study has no installed mesh,
so `VA.studyHasMesh` hides the button before the mount/launcher condition is
ever read, and neither arm of the mutation can show. The fix is a fixture
study with a mesh in the guard, or a re-pointed mutation.

## Sighting 2026-11-17, triage batch merge (found_by: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md)

Still `NOT WITNESSED (the witness cannot see the difference)` on master `1f8c6381`, reached by `node scripts/run_mutation_witness_tests.mjs --changed-since 445106241867444ee5d50f34aa67c42573d56101 --budget-min 30` because the batch's viewer changes (Classic retires; the map is the only drawing) touched `apps/viewer/views/topology.js` within 30 lines of the anchor. Same mutation, same verdict as 2026-11-05; the only non-witnessed entry of 90 reached. Pre-existing, not introduced by this batch; the merge landed. Re-triage when the deferral expires (2026-12-06), or sooner if a viewer handoff is already in that file.
