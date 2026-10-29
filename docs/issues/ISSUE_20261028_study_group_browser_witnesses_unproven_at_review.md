---
type: chore
priority: low
status: open
area: viewer
reporter: agent
---

# The two new study-group browser witnesses were never proven NOT-red-before-mutation

`a_study_is_a_translucent_group_on_the_dag` enrolled 10 witnesses: 8 fast
(all WITNESSED at review) and 2 browser
(`browser__real-a-study-opens-with-its-bodies-and-every-study-s-gro__bee64d31`,
`browser__real-the-groups-button-draws-exactly-what-it-names-in-ea__707bedf8`).
Neither could be proven in a worktree-armed scratch root: the browser tier is
red there before any mutation (the crop-lightbox check, red identically on
`integration`), so the runner reports "the tier was red before the mutation".
Run them in the main checkout after the projection rebuild:
`node scripts/run_mutation_witness_tests.mjs --only "<guard>"` for each.
If either is NOT WITNESSED, repair the guard.
