---
type: chore
priority: low
status: open
area: tests/mutation-witnesses
reporter: agent
class: decayed_witness
found_by: docs/sessions/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
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
